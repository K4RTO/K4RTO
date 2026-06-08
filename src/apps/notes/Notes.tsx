"use client";

import { Fragment, useState, useEffect, useCallback, useMemo, useRef, useImperativeHandle, forwardRef } from "react";
import type { RefObject } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useFileSystemOptional } from "@/contexts/FileSystemContext";
import { useT, useSystem } from "@/contexts/SystemContext";
import { useAppMenuListener } from "@/lib/menubar/appMenu";

// ── Types ──────────────────────────────────────────────────────────────────
// title/content can be either a plain string (user-created notes) or a
// bilingual record (preset portfolio notes). `readLang()` resolves to the
// active language at render time.

type LangText = string | { en: string; zh: string };

interface Note {
  id: string;
  title: LangText;
  content: LangText;
  modifiedAt: number;
  /** True for preset portfolio notes — locked editable fields update the current lang only. */
  pinned?: boolean;
  /** Free-form labels for filtering. Tags are language-neutral strings (the
   *  user types whatever they want); they're not translated. Empty/undefined
   *  means no tags. */
  tags?: string[];
}

function readLang(text: LangText, lang: "en" | "zh"): string {
  if (typeof text === "string") return text;
  return text[lang] ?? text.en ?? "";
}

function writeLang(prev: LangText, lang: "en" | "zh", value: string): LangText {
  if (typeof prev === "string") return value;            // single-lang note: replace
  return { ...prev, [lang]: value };                     // bilingual: update only this lang
}

// ── Portfolio sample notes — sourced from K4RTO's Resume ──────────────────

// Empty by default — no preset portfolio notes. Users start with a blank
// Notes app and can create their own. (Previously seeded About Me / Tech
// Stack / Working Style / Why Hire Me — removed per K4RTO's request as
// those duplicated content already on the live portfolio + resume.)
const SAMPLES: Note[] = [];

// ── Rich-text editor ─────────────────────────────────────────────────────
//
// We use contentEditable + document.execCommand. execCommand is deprecated but
// it's still the only cross-browser path to bold/italic/list formatting that
// fits in <100 lines — the modern alternative is a 50KB editor library
// (Lexical, Tiptap, ProseMirror) which isn't worth shipping for a portfolio.
//
// Storage shape: HTML string. Pre-existing plain-text content renders fine
// inside contentEditable (newlines are preserved via `white-space: pre-wrap`).
// Pinned (sample) notes pass `readOnly` and the editor disables contentEditable.

/**
 * Allowlist-based HTML sanitizer for contentEditable round-trip.
 *
 * Threat model: a user pastes hostile HTML into a note (containing e.g.
 * `<img src=x onerror=alert(1)>` or `<script>...`). That payload survives
 * to localStorage. On a later mount we innerHTML it back — at which point
 * the payload fires. Even though the attacker would have to first
 * persuade the user to paste their content, this is a known XSS surface
 * for any contentEditable-backed note app, so we filter aggressively.
 *
 * What we strip:
 *   - <script>, <iframe>, <object>, <embed>, <link>, <style>, <meta>, <svg>
 *     (svg can host onload, foreignObject can host arbitrary HTML)
 *   - All on* event-handler attributes (onerror, onclick, …)
 *   - javascript: and data: URLs in href / src
 *
 * What survives:
 *   - The execCommand output we care about: b, strong, i, em, u, br, div, p,
 *     ul, ol, li, h1, h2, h3, span, a — plus any inline style attribute
 *     (which Chrome/Safari emit for execCommand's bold/italic on some platforms)
 *
 * This is a denylist; a real sanitizer (DOMPurify) would be allowlist-based.
 * Good-enough for a portfolio's note app — we never load notes from other
 * users, only the current visitor's own input.
 */
function sanitizeHtml(s: string): string {
  if (!s) return "";
  let out = s;
  // Block-element tags (with content) — fully strip including children.
  out = out.replace(/<(script|iframe|object|embed|style|svg|math|foreignObject)\b[\s\S]*?<\/\1>/gi, "");
  // Self-closing / void hostile tags.
  out = out.replace(/<(script|iframe|object|embed|link|meta|style|svg|math|foreignObject)\b[^>]*\/?>/gi, "");
  // Strip every on* event-handler attribute regardless of quoting style.
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "");
  // Neutralize javascript: / data: in href/src.
  out = out.replace(/\s(href|src)\s*=\s*"(?:\s*)(?:javascript|data|vbscript):[^"]*"/gi, " $1=\"#\"");
  out = out.replace(/\s(href|src)\s*=\s*'(?:\s*)(?:javascript|data|vbscript):[^']*'/gi, " $1='#'");
  out = out.replace(/\s(href|src)\s*=\s*(?:javascript|data|vbscript):[^\s>]*/gi, " $1=\"#\"");
  return out;
}

interface RichEditorProps {
  /** Initial HTML or plain text. Treated as innerHTML on mount (after sanitize). */
  initialHtml: string;
  readOnly: boolean;
  onChange: (html: string) => void;
  placeholder: string;
}

const RichEditor = forwardRef<HTMLDivElement, RichEditorProps>(
  function RichEditor({ initialHtml, readOnly, onChange, placeholder }, ref) {
    const localRef = useRef<HTMLDivElement>(null);
    // Stash the latest onChange in a ref so we don't have to put it in the
    // useEffect deps below (which would re-run setHtml on every parent
    // re-render and clobber the user's caret position).
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    // Set innerHTML exactly once per mount, after sanitizing. Switching notes
    // remounts via `key={note.id + lang}` on the parent, which is intentional.
    useEffect(() => {
      const el = localRef.current;
      if (!el) return;
      el.innerHTML = sanitizeHtml(initialHtml);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => localRef.current as HTMLDivElement, []);

    // Intercept paste — drop HTML and insert as plain text. This is the
    // primary mitigation against the "user pastes hostile HTML" vector;
    // the sanitizer above is belt-and-suspenders for content that somehow
    // gets in another way (e.g. drag-and-drop).
    const onPaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      // execCommand insertText respects current caret + selection.
      document.execCommand("insertText", false, text);
    }, []);

    return (
      <div
        ref={localRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={(e) => onChangeRef.current((e.currentTarget as HTMLDivElement).innerHTML)}
        onPaste={onPaste}
        data-placeholder={placeholder}
        className="flex-1 px-6 pb-6 outline-none rich-editor"
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: "rgba(255,255,255,0.92)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          cursor: readOnly ? "default" : "text",
          whiteSpace: "pre-wrap",
          overflowY: "auto",
        }}
        spellCheck={false}
      />
    );
  },
);

/** Run a document.execCommand on the current selection. Wrapped so callers
 *  don't have to remember to refocus the editor first — without focus, the
 *  command runs against the wrong target and silently no-ops. */
function execFormat(editor: HTMLDivElement | null, command: string, value?: string) {
  if (!editor) return;
  editor.focus();
  document.execCommand(command, false, value);
}

interface FormatToolbarProps {
  editorRef: RefObject<HTMLDivElement | null>;
  disabled: boolean;
  pinnedLabel: string | null;
  t: (key: string, vars?: Record<string, string>) => string;
}

function FormatToolbar({ editorRef, disabled, pinnedLabel, t }: FormatToolbarProps) {
  const btnStyle: React.CSSProperties = {
    color: disabled ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)",
    fontSize: 13,
    minWidth: 28,
    height: 26,
    cursor: disabled ? "default" : "pointer",
  };
  // onMouseDown (not onClick) so the editor doesn't lose focus when the
  // button is pressed — execCommand on a blurred editor is a no-op.
  function run(cmd: string, value?: string) {
    return (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      execFormat(editorRef.current, cmd, value);
    };
  }
  type ToolButton = { label: string; cmd: string; value?: string; title: string };
  const buttons: ToolButton[] = [
    { label: "B",   cmd: "bold",          title: t("notes.fmt.bold") },
    { label: "I",   cmd: "italic",        title: t("notes.fmt.italic") },
    { label: "U",   cmd: "underline",     title: t("notes.fmt.underline") },
    { label: "H1",  cmd: "formatBlock", value: "<h1>", title: t("notes.fmt.h1") },
    { label: "H2",  cmd: "formatBlock", value: "<h2>", title: t("notes.fmt.h2") },
    { label: "•",   cmd: "insertUnorderedList", title: t("notes.fmt.bulletList") },
    { label: "1.",  cmd: "insertOrderedList",   title: t("notes.fmt.numberedList") },
  ];
  return (
    <div className="flex items-center gap-1 px-5 py-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      {buttons.map((b, idx) => (
        <Fragment key={b.cmd + b.label}>
          {(idx === 3 || idx === 5) && (
            <div className="w-px h-4 mx-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          )}
          <button
            type="button"
            onMouseDown={run(b.cmd, b.value)}
            title={b.title}
            disabled={disabled}
            className="flex items-center justify-center px-2 py-1 rounded hover:bg-white/5"
            style={{ ...btnStyle, fontStyle: b.cmd === "italic" ? "italic" : undefined, fontWeight: b.cmd === "bold" ? 800 : 500, textDecoration: b.cmd === "underline" ? "underline" : undefined }}
          >
            {b.label}
          </button>
        </Fragment>
      ))}
      {pinnedLabel && (
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginLeft: 8 }}>{pinnedLabel}</span>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

function fmtDate(ts: number, lang: "en" | "zh"): string {
  const diff = Date.now() - ts;
  if (diff < DAY_MS) return lang === "zh" ? "今天" : "Today";
  if (diff < 2 * DAY_MS) return lang === "zh" ? "昨天" : "Yesterday";
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  return new Date(ts).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

const VFS_BASE = "/Users/guest/Documents/Notes";

// ── Component ──────────────────────────────────────────────────────────────

export default function Notes(_props: AppComponentProps) {
  const fs = useFileSystemOptional();
  const t = useT();
  const { lang } = useSystem();
  const [notes, setNotes] = useState<Note[]>(SAMPLES);
  // No default selection — preset notes were removed; the user is expected
  // to either start typing a new note or pick one from the (initially empty) list.
  const [selId, setSelId] = useState<string | null>(null);
  // Ref passed to RichEditor so the FormatToolbar can run execCommand against
  // the right element. Reset implicitly when the editor remounts (note switch).
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fs) return;
    if (!fs.exists(VFS_BASE)) {
      fs.mkdir(VFS_BASE);
      SAMPLES.forEach(n => fs.writeFile(`${VFS_BASE}/${n.id}.json`, JSON.stringify(n)));
      return;
    }
    // Remove legacy v1 samples (welcome / shopping / meeting) for returning visitors.
    const LEGACY_SAMPLE_IDS = new Set(["welcome", "shopping", "meeting"]);
    for (const lid of LEGACY_SAMPLE_IDS) {
      const path = `${VFS_BASE}/${lid}.json`;
      if (fs.exists(path)) fs.remove(path);
    }
    // Filter legacy ids in-memory too — React state updates are async, so readDir()
    // may still see the just-removed entries within this same effect tick.
    const entries = fs.readDir(VFS_BASE).filter(e =>
      e.name.endsWith(".json") && !LEGACY_SAMPLE_IDS.has(e.name.replace(/\.json$/, ""))
    );
    // Always reseed the bilingual pinned samples in case the user's vfs predates them.
    // We only re-write the sample ids; user-created notes are preserved.
    const sampleIds = new Set(SAMPLES.map(n => n.id));
    const existingIds = new Set(entries.map(e => e.name.replace(/\.json$/, "")));
    for (const sample of SAMPLES) {
      if (!existingIds.has(sample.id)) {
        fs.writeFile(`${VFS_BASE}/${sample.id}.json`, JSON.stringify(sample));
      }
    }
    const loaded: Note[] = [];
    entries.forEach(e => { try { const r = fs.readFile(e.path); if (r) loaded.push(JSON.parse(r) as Note); } catch {} });
    // Merge: replace stale sample notes with the latest hard-coded version
    const merged = loaded.map(n => sampleIds.has(n.id) ? (SAMPLES.find(s => s.id === n.id) ?? n) : n);
    // Add samples that weren't on disk
    for (const sample of SAMPLES) if (!merged.find(n => n.id === sample.id)) merged.push(sample);
    if (merged.length > 0) { merged.sort((a, b) => b.modifiedAt - a.modifiedAt); setNotes(merged); setSelId(merged[0].id); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((n: Note) => {
    if (!fs) return;
    if (!fs.exists(VFS_BASE)) fs.mkdir(VFS_BASE);
    fs.writeFile(`${VFS_BASE}/${n.id}.json`, JSON.stringify(n));
  }, [fs]);

  const updateNote = useCallback((field: "title" | "content", val: string) => {
    if (!selId) return;
    setNotes(prev => prev.map(n => {
      if (n.id !== selId) return n;
      const upd: Note = { ...n, [field]: writeLang(n[field], lang, val), modifiedAt: Date.now() };
      persist(upd);
      return upd;
    }).sort((a, b) => b.modifiedAt - a.modifiedAt));
  }, [selId, persist, lang]);

  const createNote = useCallback(() => {
    const n: Note = { id: `note-${Date.now()}`, title: t("notes.newNote"), content: "", modifiedAt: Date.now() };
    setNotes(prev => [n, ...prev]);
    setSelId(n.id);
    persist(n);
  }, [persist, t]);

  const deleteCurrentNote = useCallback(() => {
    // Snapshot selId at call time so the fs.remove path and the setNotes
    // callback both operate on the same id, even if selId changes mid-update.
    const id = selId;
    if (!id) return;
    // Pinned portfolio samples can't be deleted — surface a brief alert so the
    // user understands why the menu action looked like it did nothing.
    const note = notes.find(n => n.id === id);
    if (note?.pinned) {
      if (typeof window !== "undefined") {
        window.alert(t("notes.portfolio.cannotDelete"));
      }
      return;
    }
    if (fs) fs.remove(`${VFS_BASE}/${id}.json`);
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id);
      setSelId(next[0]?.id ?? null);
      return next;
    });
  }, [selId, fs, notes, lang]);

  useAppMenuListener("notes", (detail) => {
    switch (detail.type) {
      case "new-note":    createNote(); break;
      case "delete-note": deleteCurrentNote(); break;
      case "find":        /* TODO: open search */ break;
    }
  });

  // Search query + tag filter — both AND-combined; clearing both restores
  // the full list. Search is case-insensitive substring across title, content,
  // and tag names so users don't need to remember which field a term was in.
  const [noteQuery, setNoteQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  /** All distinct tags across all notes, sorted alphabetically. Used to drive
   *  the tag-filter chip row in the sidebar. */
  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const n of notes) for (const tg of n.tags ?? []) s.add(tg);
    return Array.from(s).sort();
  }, [notes]);

  const visibleNotes = useMemo(() => {
    const q = noteQuery.trim().toLowerCase();
    const filtered = notes.filter(n => {
      if (tagFilter && !(n.tags ?? []).includes(tagFilter)) return false;
      if (!q) return true;
      const title = readLang(n.title, lang).toLowerCase();
      const content = readLang(n.content, lang).toLowerCase();
      // Strip HTML tags from rich-text content before matching so users
      // searching for "important" don't get false hits on `<strong>` etc.
      const contentPlain = content.replace(/<[^>]*>/g, " ");
      if (title.includes(q)) return true;
      if (contentPlain.includes(q)) return true;
      if ((n.tags ?? []).some(t => t.toLowerCase().includes(q))) return true;
      return false;
    });
    return filtered.sort((a, b) => b.modifiedAt - a.modifiedAt);
  }, [notes, noteQuery, tagFilter, lang]);

  // Keep the legacy `sorted` name pointing at the new filtered+sorted list so
  // existing render code doesn't need a rename pass.
  const sorted = visibleNotes;

  // Tag editing for the currently-selected note ──────────────────────────────
  const [newTag, setNewTag] = useState("");
  function addTag() {
    if (!selId) return;
    const t = newTag.trim().toLowerCase();
    if (!t) return;
    setNotes(prev => prev.map(n => {
      if (n.id !== selId) return n;
      const existing = n.tags ?? [];
      if (existing.includes(t)) return n;
      const upd: Note = { ...n, tags: [...existing, t].slice(0, 8), modifiedAt: Date.now() };
      // Match updateNote/createNote — tag mutations must hit VFS too, or the
      // chips silently revert on reload.
      persist(upd);
      return upd;
    }));
    setNewTag("");
  }
  function removeTag(tg: string) {
    if (!selId) return;
    setNotes(prev => prev.map(n => {
      if (n.id !== selId) return n;
      const upd: Note = { ...n, tags: (n.tags ?? []).filter(x => x !== tg), modifiedAt: Date.now() };
      persist(upd);
      return upd;
    }));
  }
  const sel = notes.find(n => n.id === selId) ?? null;

  const dim = { color: "rgba(255,255,255,0.4)" } as React.CSSProperties;
  const normal = { color: "rgba(255,255,255,0.85)" } as React.CSSProperties;

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", animation: "fadeIn 0.2s ease" }}>
      {/* Sidebar */}
      <div className="flex-shrink-0 flex flex-col overflow-y-auto" style={{ width: 175, backgroundColor: "#1c1c1e" }}>
        <div className="pt-3 pb-2">
          <div className="px-4 pt-2 pb-1" style={{ ...dim, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("notes.iCloud")}</div>
          {[{ key: "notes-item", label: t("notes.notes"), id: "notes" }, { key: "deleted-item", label: t("notes.recentlyDeleted"), id: "deleted" }].map(item => (
            <button key={item.key} className="w-full flex items-center gap-2 py-1.5 text-left rounded"
              style={{ ...normal, fontSize: 13, paddingLeft: 16, paddingRight: 8, backgroundColor: item.id === "notes" ? "rgba(255,255,255,0.1)" : "transparent", width: "calc(100% - 8px)", margin: "1px 4px" }}>
              {item.label}
            </button>
          ))}
          <div className="h-px my-2 mx-4" style={{ backgroundColor: "rgba(255,255,255,0.07)" }} />
          <div className="px-4 pt-1 pb-1" style={{ ...dim, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("notes.onMyMac")}</div>
          <button className="w-full flex items-center gap-2 py-1.5 text-left rounded"
            style={{ ...dim, fontSize: 13, paddingLeft: 16, paddingRight: 8, backgroundColor: "transparent", width: "calc(100% - 8px)", margin: "1px 4px" }}>
            {t("notes.allMyMac")}
          </button>
        </div>
      </div>

      {/* Note list */}
      <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: 245, backgroundColor: "#242424", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex flex-col px-5 py-2 flex-shrink-0 gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <span style={{ ...normal, fontSize: 14, fontWeight: 600 }}>{t("notes.title")}</span>
            <button onClick={createNote} className="flex items-center justify-center w-7 h-7 rounded" style={dim} title={t("notes.newNote")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
          {/* Search input — case-insensitive substring across title + content
              + tags. AND-combined with the tag-chip filter below. */}
          <input
            type="text"
            value={noteQuery}
            onChange={e => setNoteQuery(e.target.value)}
            placeholder={t("notes.searchPlaceholder")}
            className="w-full"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 5,
              padding: "4px 8px",
              fontSize: 12,
              color: "rgba(255,255,255,0.85)",
              outline: "none",
            }}
            aria-label={t("notes.searchPlaceholder")}
          />
          {/* Tag chips — click to filter; click active chip to clear. Hidden
              when there are no tags anywhere yet (avoid empty chip row). */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allTags.map(tg => {
                const active = tagFilter === tg;
                return (
                  <button
                    key={tg}
                    onClick={() => setTagFilter(active ? null : tg)}
                    className="rounded-full"
                    style={{
                      backgroundColor: active ? "var(--accent)" : "rgba(255,255,255,0.07)",
                      color: active ? "white" : "rgba(255,255,255,0.65)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      fontSize: 10,
                      padding: "1px 7px",
                      lineHeight: 1.4,
                    }}
                    aria-pressed={active}
                  >
                    {tg}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {sorted.map(note => {
            const title = readLang(note.title, lang);
            const content = readLang(note.content, lang);
            return (
              <button key={note.id} onClick={() => setSelId(note.id)} className="w-full text-left px-4 py-2"
                style={{ backgroundColor: note.id === selId ? "rgba(255,255,255,0.08)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="truncate" style={{ ...normal, fontSize: 13, fontWeight: 600 }}>
                    {note.pinned && <span style={{ color: "var(--accent)", marginRight: 4 }}>●</span>}
                    {title || t("notes.newNote")}
                  </span>
                  <span className="flex-shrink-0" style={{ ...dim, fontSize: 11 }}>{fmtDate(note.modifiedAt, lang)}</span>
                </div>
                <div style={{ ...dim, fontSize: 11, lineHeight: "1.4", marginTop: 2, overflow: "hidden", maxHeight: "2.8em" }}>
                  {content.replace(/\n/g, " ").replace(/<[^>]*>/g, "").trim() || t("notes.noAdditionalText")}
                </div>
                {(note.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1" style={{ marginTop: 4 }}>
                    {(note.tags ?? []).slice(0, 3).map(tg => (
                      <span
                        key={tg}
                        style={{
                          backgroundColor: note.id === selId ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.6)",
                          fontSize: 9,
                          padding: "0px 6px",
                          borderRadius: 999,
                          lineHeight: 1.4,
                        }}
                      >{tg}</span>
                    ))}
                    {(note.tags ?? []).length > 3 && (
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 9 }}>+{(note.tags ?? []).length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
          {sorted.length === 0 && (noteQuery || tagFilter) && (
            <div style={{ ...dim, fontSize: 12, padding: "16px 16px", textAlign: "center" }}>
              {t("notes.noMatches")}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
        {sel ? (
          <>
            {/* Toolbar — format buttons run document.execCommand on the
                editor's selection. Disabled for pinned notes. */}
            <FormatToolbar
              editorRef={editorRef}
              disabled={!!sel.pinned}
              pinnedLabel={sel.pinned ? t("notes.portfolio.protected") : null}
              t={t}
            />
            {/* Title */}
            <div className="px-6 pt-5 pb-1 flex-shrink-0">
              <input type="text" value={readLang(sel.title, lang)} onChange={e => updateNote("title", e.target.value)}
                readOnly={!!sel.pinned}
                className="w-full bg-transparent outline-none border-none" style={{ ...normal, fontSize: 22, fontWeight: 700, lineHeight: "1.2", cursor: sel.pinned ? "default" : "text" }} placeholder={t("notes.editor.title")} />
            </div>
            <div className="px-6 pb-3 flex-shrink-0">
              <span style={{ ...dim, fontSize: 12 }}>
                {new Date(sel.modifiedAt).toLocaleDateString(
                  lang === "zh" ? "zh-CN" : "en-US",
                  { weekday: "long", year: "numeric", month: "long", day: "numeric" }
                )}
              </span>
            </div>
            {/* Tag editor — chips with × to remove, inline input for adding.
                Pinned notes hide the add input (their tags are part of the
                preset content), but still display chips so they can be
                filtered like any other note. */}
            <div className="px-6 pb-3 flex-shrink-0 flex flex-wrap items-center gap-1.5">
              {(sel.tags ?? []).map(tg => (
                <span
                  key={tg}
                  className="inline-flex items-center gap-1 rounded-full"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.78)",
                    fontSize: 10.5,
                    padding: "1px 3px 1px 8px",
                    lineHeight: 1.4,
                  }}
                >
                  {tg}
                  {!sel.pinned && (
                    <button
                      onClick={() => removeTag(tg)}
                      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: "0 4px" }}
                      title={t("notes.removeTag")}
                      aria-label={t("notes.removeTag")}
                    >×</button>
                  )}
                </span>
              ))}
              {!sel.pinned && (
                <input
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder={t("notes.addTag")}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px dashed rgba(255,255,255,0.12)",
                    borderRadius: 999,
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 10.5,
                    padding: "1px 8px",
                    width: 90,
                    outline: "none",
                  }}
                  aria-label={t("notes.addTag")}
                />
              )}
            </div>
            {/* Rich-text body. key forces remount when switching notes / lang
                so the editor picks up the new initial content. */}
            <RichEditor
              key={`${sel.id}:${lang}`}
              ref={editorRef}
              initialHtml={readLang(sel.content, lang)}
              readOnly={!!sel.pinned}
              onChange={(html) => updateNote("content", html)}
              placeholder={t("notes.editor.content")}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center"><span style={{ ...dim, fontSize: 14 }}>{t("notes.selectNote")}</span></div>
        )}
      </div>
    </div>
  );
}

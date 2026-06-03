"use client";

import { useState, useEffect, useCallback } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useFileSystemOptional } from "@/contexts/FileSystemContext";
import { useT } from "@/contexts/SystemContext";
import { useAppMenuListener } from "@/lib/menubar/appMenu";

interface Note { id: string; title: string; content: string; modifiedAt: number; }

const NOW = Date.now();
const DAY = 86400000;
const SAMPLES: Note[] = [
  { id: "welcome", title: "Welcome", content: "Welcome to Notes!\n\nThis is your personal note-taking app. You can:\n\n- Create new notes with the pencil icon\n- Organize notes into folders\n- Search through all your notes\n\nNotes are saved automatically as you type.", modifiedAt: NOW - 1000 },
  { id: "shopping", title: "Shopping List", content: "Grocery run:\n\n- Apples\n- Almond milk\n- Greek yogurt\n- Sourdough bread\n- Cherry tomatoes\n- Olive oil\n- Pasta & Parmesan\n- Dark chocolate", modifiedAt: NOW - DAY - 3600000 },
  { id: "meeting", title: "Meeting Notes", content: "2026-02-20 — Team Sync\n\nReviewed Q1 roadmap\nDesign review scheduled for Friday\nAPI endpoints finalized\n\nAction items:\n  Alice: wireframes\n  Bob: database schema\n  Carol: user testing plan", modifiedAt: NOW - 4 * DAY },
];

function fmtDate(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < DAY) return "Today";
  if (diff < 2 * DAY) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const VFS_BASE = "/Users/guest/Documents/Notes";

export default function Notes(_props: AppComponentProps) {
  const fs = useFileSystemOptional();
  const t = useT();
  const [notes, setNotes] = useState<Note[]>(SAMPLES);
  const [selId, setSelId] = useState<string | null>("welcome");

  useEffect(() => {
    if (!fs) return;
    if (!fs.exists(VFS_BASE)) {
      fs.mkdir(VFS_BASE);
      SAMPLES.forEach(n => fs.writeFile(`${VFS_BASE}/${n.id}.json`, JSON.stringify(n)));
      return;
    }
    const entries = fs.readDir(VFS_BASE).filter(e => e.name.endsWith(".json"));
    if (entries.length === 0) {
      SAMPLES.forEach(n => fs.writeFile(`${VFS_BASE}/${n.id}.json`, JSON.stringify(n)));
      return;
    }
    const loaded: Note[] = [];
    entries.forEach(e => { try { const r = fs.readFile(e.path); if (r) loaded.push(JSON.parse(r) as Note); } catch {} });
    if (loaded.length > 0) { loaded.sort((a, b) => b.modifiedAt - a.modifiedAt); setNotes(loaded); setSelId(loaded[0].id); }
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
      const upd = { ...n, [field]: val, modifiedAt: Date.now() };
      persist(upd);
      return upd;
    }).sort((a, b) => b.modifiedAt - a.modifiedAt));
  }, [selId, persist]);

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
    if (fs) fs.remove(`${VFS_BASE}/${id}.json`);
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id);
      setSelId(next[0]?.id ?? null);
      return next;
    });
  }, [selId, fs]);

  useAppMenuListener("notes", (detail) => {
    switch (detail.type) {
      case "new-note":    createNote(); break;
      case "delete-note": deleteCurrentNote(); break;
      case "find":        /* TODO: open search */ break;
    }
  });

  const sorted = [...notes].sort((a, b) => b.modifiedAt - a.modifiedAt);
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
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ ...normal, fontSize: 14, fontWeight: 600 }}>{t("notes.title")}</span>
          <button onClick={createNote} className="flex items-center justify-center w-7 h-7 rounded" style={dim} title={t("notes.newNote")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sorted.map(note => (
            <button key={note.id} onClick={() => setSelId(note.id)} className="w-full text-left px-4 py-2"
              style={{ backgroundColor: note.id === selId ? "rgba(255,255,255,0.08)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate" style={{ ...normal, fontSize: 13, fontWeight: 600 }}>{note.title || t("notes.newNote")}</span>
                <span className="flex-shrink-0" style={{ ...dim, fontSize: 11 }}>{fmtDate(note.modifiedAt)}</span>
              </div>
              <div style={{ ...dim, fontSize: 11, lineHeight: "1.4", marginTop: 2, overflow: "hidden", maxHeight: "2.8em" }}>
                {note.content.replace(/\n/g, " ").trim() || t("notes.noAdditionalText")}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
        {sel ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {[["B", "bold"], ["I", "italic"], ["U", "underline"]].map(([l]) => (
                <button key={l} className="flex items-center justify-center px-2 py-1 rounded hover:bg-white/5" style={{ ...dim, fontSize: 13 }}>{l}</button>
              ))}
              <div className="w-px h-4 mx-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
              <button className="flex items-center justify-center px-2 py-1 rounded hover:bg-white/5" style={dim}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              </button>
            </div>
            {/* Title */}
            <div className="px-6 pt-5 pb-1 flex-shrink-0">
              <input type="text" value={sel.title} onChange={e => updateNote("title", e.target.value)}
                className="w-full bg-transparent outline-none border-none" style={{ ...normal, fontSize: 22, fontWeight: 700, lineHeight: "1.2" }} placeholder="Title" />
            </div>
            <div className="px-6 pb-3 flex-shrink-0">
              <span style={{ ...dim, fontSize: 12 }}>{new Date(sel.modifiedAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
            <textarea value={sel.content} onChange={e => updateNote("content", e.target.value)}
              className="flex-1 px-6 pb-6 bg-transparent outline-none border-none resize-none"
              style={{ ...normal, fontSize: 14, lineHeight: "1.6", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}
              placeholder="Note content..." spellCheck={false} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center"><span style={{ ...dim, fontSize: 14 }}>{t("notes.selectNote")}</span></div>
        )}
      </div>
    </div>
  );
}

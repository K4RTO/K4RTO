"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getAllApps } from "@/apps/registry";
import { useT, useSystem } from "@/contexts/SystemContext";
import { useFileSystemOptional } from "@/contexts/FileSystemContext";
import type { Lang } from "@/contexts/SystemContext";

// ── App display metadata ─────────────────────────────────────────────────────
// Emoji glyph + i18n key per dock app. Keep this in sync with src/apps/registry.ts.

const APP_ICONS: Record<string, string> = {
  finder: "🗂",  terminal: "⌨", safari: "🧭", notes: "📝",
  textedit: "📄", settings: "⚙", calculator: "🔢", calendar: "📅",
  clock: "🕐",  preview: "🖼️", vscode: "</>", word: "📘", music: "🎵",
  game2048: "🎮", minesweeper: "💣", snake: "🐍",
};

const APP_NAME_KEYS: Record<string, string> = {
  finder: "dock.finder", safari: "dock.safari", notes: "dock.notes",
  textedit: "dock.textedit", terminal: "dock.terminal",
  calculator: "dock.calculator", calendar: "dock.calendar",
  settings: "dock.settings", clock: "dock.clock", preview: "dock.preview",
  vscode: "dock.vscode", word: "dock.word", music: "dock.music",
  game2048: "dock.game2048", minesweeper: "dock.minesweeper", snake: "dock.snake",
};

// ── Portfolio commands ───────────────────────────────────────────────────────
// Curated shortcuts that aren't "launch an app" — these answer questions a
// recruiter / visitor might think to type ("resume", "github", "email").

type PortfolioAction =
  | { type: "launch"; appId: string; meta?: Record<string, string> }
  | { type: "openExternal"; url: string };

interface PortfolioCommand {
  id: string;
  icon: string;
  label: { en: string; zh: string };
  subtitle: { en: string; zh: string };
  /** lowercase trigger words; matches when the user's query is a prefix of a keyword
   *  (e.g. query "res" matches keyword "resume"). Substring matching would over-fire
   *  on single-letter inputs and dump every command into the result list. */
  keywords: string[];
  action: PortfolioAction;
}

const PORTFOLIO_COMMANDS: PortfolioCommand[] = [
  {
    id: "resume",
    icon: "📄",
    label:    { en: "Resume",                                 zh: "简历" },
    subtitle: { en: "Open K4RTO's resume in Preview",         zh: "在预览中打开 K4RTO 简历（PDF）" },
    keywords: ["resume", "cv", "简历", "k4rto"],
    // filePath = the VFS entry (Preview detects "this is a resume" via the regex
    // /\/K4RTO\/Resume(\.|-)/i, then overrides publicPath internally based on the
    // current system language). Keep filePath/publicPath/fileName CONSISTENT here
    // even though Preview ignores publicPath for resumes — mismatched values
    // would mislead anyone reading meta in DevTools.
    action: {
      type: "launch",
      appId: "preview",
      meta: {
        filePath: "/Users/guest/K4RTO/Resume.pdf",
        publicPath: "/K4RTO/Resume.pdf",
        fileName: "Resume.pdf",
      },
    },
  },
  {
    id: "github",
    icon: "🐙",
    label:    { en: "GitHub Profile",     zh: "GitHub 主页" },
    subtitle: { en: "github.com/K4RTO",   zh: "github.com/K4RTO" },
    keywords: ["github", "git", "source", "repo", "项目"],
    action: { type: "openExternal", url: "https://github.com/K4RTO" },
  },
  {
    id: "linkedin",
    icon: "💼",
    label:    { en: "LinkedIn",                  zh: "LinkedIn" },
    subtitle: { en: "linkedin.com/in/K4RTO",     zh: "linkedin.com/in/K4RTO" },
    keywords: ["linkedin", "linked", "in"],
    action: { type: "openExternal", url: "https://www.linkedin.com/in/K4RTO/" },
  },
  {
    id: "email",
    icon: "📧",
    label:    { en: "Email K4RTO",        zh: "联系邮箱" },
    subtitle: { en: "k4rtol@163.com",     zh: "k4rtol@163.com" },
    keywords: ["email", "mail", "contact", "邮箱", "邮件", "联系"],
    action: { type: "openExternal", url: "mailto:k4rtol@163.com" },
  },
  {
    id: "source",
    icon: "</>",
    label:    { en: "Portfolio Source",                              zh: "项目源码" },
    subtitle: { en: "Showcase source files in VSCode",               zh: "在 VSCode 中查看作品源码" },
    keywords: ["source", "code", "vscode", "k4rto", "源码", "代码"],
    action: { type: "launch", appId: "vscode" },
  },
  {
    id: "music",
    icon: "🎵",
    label:    { en: "Music",                            zh: "音乐" },
    subtitle: { en: "K4RTO's playlist on Spotify",      zh: "K4RTO 的 Spotify 歌单" },
    keywords: ["music", "spotify", "playlist", "音乐", "歌单"],
    action: { type: "launch", appId: "music" },
  },
];

// ── Result types & matching ──────────────────────────────────────────────────

type SpotlightResult =
  | { kind: "command";    id: string; label: string; subtitle: string; icon: string; action: PortfolioAction }
  | { kind: "app";        id: string; label: string; subtitle: string; icon: string; appId: string }
  | { kind: "file";       id: string; label: string; subtitle: string; icon: string; filePath: string; fileName: string }
  | { kind: "suggestion"; id: string; label: string; subtitle: string };

const APP_ICON_FALLBACK = "📦";
const FILE_ICONS: Record<string, string> = {
  md: "📄", txt: "📄", pdf: "📕",
  png: "🖼️", jpg: "🖼️", jpeg: "🖼️", webp: "🖼️", gif: "🖼️",
  ts: "🟦", tsx: "🟦", js: "🟨", jsx: "🟨",
  json: "🟧", css: "🎨", html: "🌐",
  doc: "📘", docx: "📘",
};

/** Pick which app should open a given file based on its extension. */
function appForFile(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf", "png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "preview";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["ts", "tsx", "js", "jsx", "json", "css", "html", "md"].includes(ext)) return "vscode";
  return "textedit";
}

/** Render-side meta for a file launch (different apps want slightly different keys). */
function metaForFile(appId: string, filePath: string, fileName: string): Record<string, string> {
  // Preview can additionally read publicPath for asset-backed files (images / Resume).
  // For VFS-only files (Notes, source samples), publicPath is unused and harmless.
  if (appId === "preview") {
    const publicPath = filePath.replace("/Users/guest/", "/");
    return { filePath, publicPath, fileName };
  }
  return { filePath, fileName };
}

// ── Component ────────────────────────────────────────────────────────────────

interface SpotlightProps {
  onClose: () => void;
  /** Widened from `(appId)` so commands can pass meta (Resume → Preview, etc.). */
  onLaunchApp: (appId: string, meta?: Record<string, string>) => void;
}

export function Spotlight({ onClose, onLaunchApp }: SpotlightProps) {
  const t = useT();
  const { lang } = useSystem();
  const fs = useFileSystemOptional();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo<SpotlightResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: SpotlightResult[] = [];
    const langKey: Lang = lang === "zh" ? "zh" : "en";

    // 1. Portfolio commands — curated, highest signal.
    for (const cmd of PORTFOLIO_COMMANDS) {
      // Prefix-match keywords (so "res" → "resume" but "e" doesn't match every command).
      // Labels still allow substring match — labels are user-visible names so it's
      // intuitive that mid-word matches work there.
      const hit = cmd.keywords.some(k => k.startsWith(q)) ||
                  cmd.label[langKey].toLowerCase().includes(q) ||
                  cmd.label.en.toLowerCase().includes(q);
      if (hit) {
        out.push({
          kind: "command",
          id: `cmd:${cmd.id}`,
          label: cmd.label[langKey],
          subtitle: cmd.subtitle[langKey],
          icon: cmd.icon,
          action: cmd.action,
        });
      }
    }

    // 2. Apps by localized + English name.
    for (const app of getAllApps()) {
      const localized = APP_NAME_KEYS[app.id] ? t(APP_NAME_KEYS[app.id]) : app.name;
      if (localized.toLowerCase().includes(q) || app.name.toLowerCase().includes(q)) {
        out.push({
          kind: "app",
          id: `app:${app.id}`,
          label: localized,
          subtitle: t("spotlight.application"),
          icon: APP_ICONS[app.id] ?? APP_ICON_FALLBACK,
          appId: app.id,
        });
      }
    }

    // 3. VFS files — search by filename (cap at 8 to keep the list manageable).
    if (fs) {
      const FILE_CAP = 8;
      const seen = new Set<string>();
      let fileCount = 0;
      /** Returns true if the cap was hit — caller must propagate so the recursion
       *  unwinds instead of continuing into sibling directories and overshooting. */
      const collect = (dir: string): boolean => {
        if (seen.has(dir)) return false;
        seen.add(dir);
        for (const e of fs.readDir(dir)) {
          if (e.type === "dir") {
            if (e.name.startsWith(".") || e.name === "Applications") continue;
            if (collect(e.path)) return true;
          } else if (e.name.toLowerCase().includes(q)) {
            const ext = e.name.split(".").pop()?.toLowerCase() ?? "";
            out.push({
              kind: "file",
              id: `file:${e.path}`,
              label: e.name,
              subtitle: e.path,
              icon: FILE_ICONS[ext] ?? "📄",
              filePath: e.path,
              fileName: e.name,
            });
            if (++fileCount >= FILE_CAP) return true;
          }
        }
        return false;
      };
      collect("/Users/guest");
    }

    // 4. Web search fallback — always last so curated stuff wins.
    out.push({
      kind: "suggestion",
      id: "web",
      label: t("spotlight.searchWebFor", { q: query }),
      subtitle: t("spotlight.web"),
    });

    return out;
  }, [query, lang, t, fs]);

  // Clamp selection when results change.
  useEffect(() => {
    setSelected(s => Math.min(s, Math.max(0, results.length - 1)));
  }, [results.length]);

  const launch = useCallback((r: SpotlightResult) => {
    switch (r.kind) {
      case "command":
        if (r.action.type === "launch") {
          onLaunchApp(r.action.appId, r.action.meta);
        } else {
          // Open external URL (mailto / linkedin / github) in a real browser tab —
          // these sites either refuse iframing entirely (GitHub) or aren't worth
          // proxying for navigation (LinkedIn, mailto:).
          window.open(r.action.url, "_blank", "noopener,noreferrer");
        }
        onClose();
        return;
      case "app":
        onLaunchApp(r.appId);
        onClose();
        return;
      case "file": {
        const appId = appForFile(r.fileName);
        onLaunchApp(appId, metaForFile(appId, r.filePath, r.fileName));
        onClose();
        return;
      }
      case "suggestion":
        // Use Bing instead of Google — Google refuses iframe embedding so opening
        // it in the in-OS Safari would just show a blank page; Bing renders fine.
        window.open(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
        onClose();
        return;
    }
  }, [query, onLaunchApp, onClose]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) launch(results[selected]);
  }

  return (
    <div
      className="fixed inset-0 flex items-start justify-center"
      style={{ zIndex: 99990, backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", paddingTop: "18vh" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-surface glass-thick glass-shadow-lg glass-radius-popover"
        style={{ width: 640, overflow: "hidden" }}
      >
        {/* Search input — px-6 (24px) for the macOS Spotlight breathing room.
            px-5 (20px) was visibly cramped against the rounded corners. */}
        <div className="flex items-center gap-3 px-6" style={{ height: 58 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={onKeyDown}
            placeholder={t("spotlight.placeholder")}
            className="flex-1 bg-transparent outline-none border-none text-[18px]"
            style={{ color: "rgba(255,255,255,0.9)", caretColor: "#0058d0" }}
            spellCheck={false}
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ color: "rgba(255,255,255,0.3)", fontSize: 18, lineHeight: 1 }}
              aria-label={t("spotlight.clearQuery")}
            >×</button>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", maxHeight: 420, overflowY: "auto" }}>
            {results.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-6 cursor-default"
                style={{
                  height: 48,
                  backgroundColor: i === selected ? "rgba(0,88,208,0.9)" : "transparent",
                }}
                onMouseEnter={() => setSelected(i)}
                onMouseDown={() => launch(r)}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 28, height: 28, fontSize: 18 }}
                >
                  {r.kind === "suggestion"
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    : r.icon}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className="truncate"
                    style={{ color: i === selected ? "white" : "rgba(255,255,255,0.85)", fontSize: 14 }}
                  >
                    {r.label}
                  </span>
                  {r.subtitle && (
                    <span
                      className="truncate"
                      style={{ color: i === selected ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)", fontSize: 11 }}
                    >
                      {r.subtitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

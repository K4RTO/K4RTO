"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useFileSystemOptional } from "@/contexts/FileSystemContext";
import CodeView from "./CodeView";
import { langFromExt as shikiLang } from "./shiki";
import { PORTFOLIO_SOURCE_ROOT, PORTFOLIO_SOURCES } from "./portfolioSources";

// ── Safe markdown renderer (React elements, no dangerouslySetInnerHTML) ──────
function MdLine({ line }: { line: string }) {
  // Heading
  const h3 = line.match(/^### (.+)$/);
  if (h3) return <h3 style={{ fontSize: 15, fontWeight: 700, margin: "12px 0 4px", color: "#e2e8f0" }}>{h3[1]}</h3>;
  const h2 = line.match(/^## (.+)$/);
  if (h2) return <h2 style={{ fontSize: 18, fontWeight: 700, margin: "14px 0 6px", color: "#e2e8f0" }}>{h2[1]}</h2>;
  const h1 = line.match(/^# (.+)$/);
  if (h1) return <h1 style={{ fontSize: 22, fontWeight: 700, margin: "16px 0 8px", color: "#e2e8f0" }}>{h1[1]}</h1>;

  if (line.trim() === "") return <div style={{ height: 8 }} />;

  // Inline formatting: **bold**, *italic*, `code`
  const parts: React.ReactNode[] = [];
  let rest = line;
  let key = 0;

  while (rest.length > 0) {
    const boldIdx   = rest.indexOf("**");
    const italicIdx = rest.indexOf("*");
    const codeIdx   = rest.indexOf("`");

    const candidates = [
      boldIdx   >= 0 ? { idx: boldIdx,   type: "bold"   as const } : null,
      codeIdx   >= 0 ? { idx: codeIdx,   type: "code"   as const } : null,
      italicIdx >= 0 && italicIdx !== boldIdx ? { idx: italicIdx, type: "italic" as const } : null,
    ].filter((c): c is NonNullable<typeof c> => c !== null)
     .sort((a, b) => a.idx - b.idx);

    const first = candidates[0];
    if (!first) { parts.push(<span key={key++}>{rest}</span>); break; }

    if (first.idx > 0) { parts.push(<span key={key++}>{rest.slice(0, first.idx)}</span>); }

    if (first.type === "bold") {
      const end = rest.indexOf("**", first.idx + 2);
      if (end < 0) { parts.push(<span key={key++}>{rest}</span>); break; }
      parts.push(<strong key={key++} style={{ fontWeight: 700, color: "#ffffff" }}>{rest.slice(first.idx + 2, end)}</strong>);
      rest = rest.slice(end + 2);
    } else if (first.type === "italic") {
      const end = rest.indexOf("*", first.idx + 1);
      if (end < 0) { parts.push(<span key={key++}>{rest}</span>); break; }
      parts.push(<em key={key++}>{rest.slice(first.idx + 1, end)}</em>);
      rest = rest.slice(end + 1);
    } else {
      const end = rest.indexOf("`", first.idx + 1);
      if (end < 0) { parts.push(<span key={key++}>{rest}</span>); break; }
      parts.push(
        <code key={key++} style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, padding: "1px 4px", fontSize: 11, fontFamily: "monospace" }}>
          {rest.slice(first.idx + 1, end)}
        </code>
      );
      rest = rest.slice(end + 1);
    }
  }

  return <p style={{ margin: "4px 0", lineHeight: 1.65 }}>{parts}</p>;
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div
      className="absolute inset-0 overflow-auto text-[14px]"
      style={{ backgroundColor: "#1e1e1e", color: "#d4d4d4", padding: "24px 32px" }}
    >
      {lines.map((line, i) => <MdLine key={i} line={line} />)}
    </div>
  );
}

function langFromExt(ext: string): string {
  const map: Record<string, string> = {
    ts: "TypeScript", tsx: "TypeScript React",
    js: "JavaScript", jsx: "JavaScript React",
    json: "JSON", md: "Markdown",
    txt: "Plain Text",
  };
  return map[ext] ?? ext.toUpperCase();
}

// ── Icons ────────────────────────────────────────────────────────────────────
function ExplorerIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>;
}
function SearchIconVS() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function GitIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>;
}
function ChevronDown() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>;
}
function ChevronRight2() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>;
}
function FileIconSmall() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VSCode({ windowId }: AppComponentProps) {
  const { state, dispatch } = useWindowManager();
  const fs = useFileSystemOptional();
  const meta = state.windows.get(windowId)?.meta ?? {};
  const { filePath = "", fileName = "Untitled" } = meta;

  const [content, setContent] = useState("");
  const [modified, setModified] = useState(false);
  const [preview, setPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<"explorer" | "search" | "git">("explorer");
  const [sidebarFiles, setSidebarFiles] = useState<{ name: string; path: string }[]>([]);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentFileName, setCurrentFileName] = useState(fileName);
  const [currentFilePath, setCurrentFilePath] = useState(filePath);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const ext = currentFileName.split(".").pop()?.toLowerCase() ?? "";
  const isMd = ext === "md";
  const lang = langFromExt(ext);
  const shikiCodeLang = useMemo(() => shikiLang(ext), [ext]);
  // Read-only sample files under /K4RTO/Source/ default to preview mode and disable edits
  const isPortfolioSource = currentFilePath.startsWith("/Users/guest/K4RTO/Source/");
  const previewAvailable = isMd || shikiCodeLang !== null;

  // Load file on mount
  useEffect(() => {
    // Default behavior when VSCode is launched without a file (Dock click,
    // Spotlight, etc.): open the first K4RTO portfolio sample so the user
    // lands directly on showcase code instead of an empty editor.
    const fallbackPath = `${PORTFOLIO_SOURCE_ROOT}/${PORTFOLIO_SOURCES[0]?.name ?? ""}`;
    const fallbackName = PORTFOLIO_SOURCES[0]?.name ?? "Untitled";
    const effectivePath = filePath || fallbackPath;
    const effectiveName = filePath ? fileName : fallbackName;

    dispatch({ type: "SET_TITLE", id: windowId, title: effectiveName });
    setCurrentFileName(effectiveName);
    setCurrentFilePath(effectivePath);
    // Portfolio sources default to preview mode (Shiki render)
    setPreview(effectivePath.startsWith(`${PORTFOLIO_SOURCE_ROOT}/`));

    if (!fs) return;
    if (effectivePath) {
      const raw = fs.readFile(effectivePath);
      if (raw !== null && !raw.startsWith("__public:")) {
        setContent(raw);
      }
    }

    // Load sibling files for sidebar — for the fallback case, this puts
    // the rest of the portfolio samples in the explorer next to the open one.
    const dir = effectivePath.split("/").slice(0, -1).join("/") || "/";
    if (fs.exists(dir)) {
      const entries = fs.readDir(dir)
        .filter(e => e.type === "file")
        .map(e => ({ name: e.name, path: e.path }));
      setSidebarFiles(entries);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs]);

  const handleChange = useCallback((val: string) => {
    setContent(val);
    setModified(true);
  }, []);

  const handleSave = useCallback(() => {
    // Use currentFilePath, not the mount-time filePath — they diverge after
    // the user switches files via the sidebar. Saving to the original meta
    // path would either overwrite the wrong file or no-op when VSCode was
    // launched without a file (filePath = "").
    if (!fs || !currentFilePath) return;
    if (isPortfolioSource) return;  // portfolio samples are read-only
    fs.writeFile(currentFilePath, content);
    setModified(false);
  }, [fs, currentFilePath, isPortfolioSource, content]);

  const handleCursorMove = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const text = ta.value.slice(0, ta.selectionStart);
    const lines = text.split("\n");
    setCursor({ line: lines.length, col: lines[lines.length - 1].length + 1 });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    // Tab key → insert 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = ta.value.slice(0, start) + "  " + ta.value.slice(end);
      setContent(newVal);
      setModified(true);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }, [handleSave]);

  const openSidebarFile = useCallback((path: string, name: string) => {
    if (!fs) return;
    const raw = fs.readFile(path);
    if (raw !== null && !raw.startsWith("__public:")) {
      setContent(raw);
      setModified(false);
      setCurrentFileName(name);
      setCurrentFilePath(path);
      dispatch({ type: "SET_TITLE", id: windowId, title: name });
      // Portfolio sources default to preview mode (read-only showcase);
      // other files start in edit mode.
      setPreview(path.startsWith("/Users/guest/K4RTO/Source/"));
    }
  }, [fs, dispatch, windowId]);

  // Line numbers
  const lines = content.split("\n");

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ backgroundColor: "#1e1e1e", color: "#d4d4d4", fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace" }}
    >
      {/* Activity Bar */}
      <div
        className="flex flex-col items-center pt-2 gap-5 flex-shrink-0"
        style={{ width: 48, backgroundColor: "#333333", borderRight: "1px solid rgba(255,255,255,0.08)" }}
      >
        {(
          [
            ["explorer", <ExplorerIcon key="e" />],
            ["search",   <SearchIconVS key="s" />],
            ["git",      <GitIcon key="g" />],
          ] as [typeof activeTab, React.ReactNode][]
        ).map(([id, icon]) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setSidebarOpen(a => id === activeTab ? !a : true); }}
            className="w-10 h-10 flex items-center justify-center rounded"
            style={{ color: activeTab === id && sidebarOpen ? "#ffffff" : "rgba(255,255,255,0.45)" }}
            title={id.charAt(0).toUpperCase() + id.slice(1)}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div
          className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{ width: 200, backgroundColor: "#252526", borderRight: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Sidebar header */}
          <div
            className="flex items-center px-4 py-2 flex-shrink-0 select-none text-[11px] uppercase tracking-wider"
            style={{ color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            Explorer
          </div>

          {/* Files section */}
          <div className="flex-1 overflow-y-auto">
            <div
              className="flex items-center gap-1 px-4 py-1 cursor-pointer select-none text-[12px]"
              title={currentFilePath.split("/").slice(0, -1).join("/") || "/"}
            >
              <ChevronDown />
              <span className="uppercase text-[11px] tracking-wider truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                {currentFilePath.startsWith(`${PORTFOLIO_SOURCE_ROOT}/`)
                  ? "K4RTO · Source"
                  : (currentFilePath.split("/").slice(0, -1).pop() || "Files")}
              </span>
            </div>
            {sidebarFiles.map(f => (
              <button
                key={f.path}
                onClick={() => openSidebarFile(f.path, f.name)}
                className="w-full flex items-center gap-2 px-4 py-1 text-left text-[12px]"
                style={{
                  color: f.name === currentFileName ? "#ffffff" : "rgba(255,255,255,0.65)",
                  backgroundColor: f.name === currentFileName ? "rgba(255,255,255,0.1)" : "transparent",
                }}
              >
                <FileIconSmall />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
            {sidebarFiles.length === 0 && (
              <div className="px-4 py-2 text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                No files
              </div>
            )}

            {/* Outline section placeholder */}
            <div className="flex items-center gap-1 px-4 py-1 mt-2 cursor-pointer select-none">
              <ChevronRight2 />
              <span className="uppercase text-[11px] tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                Outline
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Editor + Status Bar */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Tab bar — w-full guarantees the bar fills the editor area's width so
            the Edit/Preview button's `ml-auto` actually has room to push against
            (without w-full, the bar collapses to content width and the button
            ends up flush against the file tab). */}
        <div
          className="flex items-center flex-shrink-0 w-full select-none"
          style={{ height: 35, backgroundColor: "#2d2d2d", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="flex items-center px-4 h-full text-[12px] gap-2 max-w-[240px] flex-shrink-0"
            style={{ backgroundColor: "#1e1e1e", borderRight: "1px solid rgba(255,255,255,0.1)", color: "#d4d4d4" }}
            title={currentFileName}
          >
            <FileIconSmall />
            {/* truncate keeps the Preview/Edit button visible when a user opens
                a long-named file from Finder. Full name is in the title tooltip. */}
            <span className="truncate">{currentFileName}</span>
            {modified && <span style={{ color: "#e2c08d" }}>●</span>}
          </div>
          {/* Preview/Edit toggle — works for MD (markdown render) and code (Shiki highlight) */}
          {previewAvailable && (
            <button
              onClick={() => setPreview(v => !v)}
              className="ml-auto mr-2 px-2 py-1 rounded text-[11px]"
              style={{
                color: preview ? "#ffffff" : "rgba(255,255,255,0.5)",
                backgroundColor: preview ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
              }}
              title={isPortfolioSource ? "Portfolio sources are read-only — Edit shows plaintext" : undefined}
            >
              {preview ? "Edit" : "Preview"}
            </button>
          )}
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-hidden relative">
          {preview && isMd ? (
            <MarkdownPreview content={content} />
          ) : preview && shikiCodeLang ? (
            <CodeView code={content} lang={shikiCodeLang} />
          ) : (
            <div className="flex h-full overflow-auto">
              {/* Line numbers */}
              <div
                className="flex-shrink-0 py-2 text-right text-[12px] select-none"
                style={{ width: 48, paddingRight: 12, color: "rgba(255,255,255,0.2)", lineHeight: "18px", paddingTop: 8, backgroundColor: "#1e1e1e", userSelect: "none" }}
              >
                {lines.map((_, i) => (
                  <div key={i} style={{ height: 18 }}>{i + 1}</div>
                ))}
              </div>
              {/* Textarea */}
              <textarea
                ref={taRef}
                value={content}
                readOnly={isPortfolioSource}
                onChange={e => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyUp={handleCursorMove}
                onClick={handleCursorMove}
                spellCheck={false}
                className="flex-1 resize-none outline-none border-none"
                style={{
                  backgroundColor: "#1e1e1e",
                  color: "#d4d4d4",
                  fontSize: 12,
                  lineHeight: "18px",
                  fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
                  caretColor: "#aeafad",
                  paddingTop: 8,
                  paddingBottom: 8,
                  paddingLeft: 10,
                  paddingRight: 24,
                }}
                placeholder="// Start typing..."
              />
            </div>
          )}
        </div>

        {/* Status bar */}
        <div
          className="flex items-center justify-between px-3 flex-shrink-0 select-none"
          style={{ height: 22, backgroundColor: "#007acc", color: "rgba(255,255,255,0.9)", fontSize: 11 }}
        >
          <div className="flex items-center gap-3">
            <span>⎇ main</span>
            {modified && <span>● Modified</span>}
          </div>
          <div className="flex items-center gap-3">
            <span>Ln {cursor.line}, Col {cursor.col}</span>
            <span>{lang}</span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>
    </div>
  );
}

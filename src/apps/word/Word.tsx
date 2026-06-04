"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useFileSystemOptional } from "@/contexts/FileSystemContext";
import { useT } from "@/contexts/SystemContext";

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// ── Ribbon Icons ──────────────────────────────────────────────────────────────
function BoldIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>; }
function ItalicIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>; }
function UnderlineIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>; }
function AlignLeftIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>; }
function AlignCenterIcon(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>; }
function AlignRightIcon(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="7" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>; }
function SaveIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>; }

type Align = "left" | "center" | "right";

export default function Word({ windowId }: AppComponentProps) {
  const { state, dispatch } = useWindowManager();
  const fs = useFileSystemOptional();
  const t = useT();
  const meta = state.windows.get(windowId)?.meta ?? {};
  // Default filename is localized — meta.fileName falls back to
  // "Document.docx"/"文档.docx" so window title respects the lang toggle.
  const { filePath = "", fileName = t("word.defaultFilename") } = meta;

  const [content, setContent] = useState("");
  const [modified, setModified] = useState(false);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [align, setAlign] = useState<Align>("left");
  const [fontSize, setFontSize] = useState(14);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch({ type: "SET_TITLE", id: windowId, title: fileName });
    if (!fs || !filePath) return;
    const raw = fs.readFile(filePath);
    if (raw !== null && !raw.startsWith("__public:")) {
      setContent(raw);
      if (editorRef.current) editorRef.current.innerText = raw;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      setContent(editorRef.current.innerText);
      setModified(true);
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!fs || !filePath) return;
    fs.writeFile(filePath, content);
    setModified(false);
  }, [fs, filePath, content]);

  const execCmd = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }, []);

  const toggleBold      = useCallback(() => { execCmd("bold");      setBold(v => !v);      }, [execCmd]);
  const toggleItalic    = useCallback(() => { execCmd("italic");    setItalic(v => !v);    }, [execCmd]);
  const toggleUnderline = useCallback(() => { execCmd("underline"); setUnderline(v => !v); }, [execCmd]);

  const setAlignment = useCallback((a: Align) => {
    setAlign(a);
    const cmds: Record<Align, string> = { left: "justifyLeft", center: "justifyCenter", right: "justifyRight" };
    execCmd(cmds[a]);
  }, [execCmd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  function ribbonBtn(active: boolean, onClick: () => void, icon: React.ReactNode, title: string) {
    return (
      <button
        onMouseDown={e => { e.preventDefault(); onClick(); }}
        title={title}
        className="flex items-center justify-center rounded"
        style={{
          width: 28, height: 26,
          backgroundColor: active ? "rgba(0,100,255,0.18)" : "transparent",
          border: active ? "1px solid rgba(0,100,255,0.4)" : "1px solid transparent",
          color: active ? "#1a6ef5" : "#2c2c2c",
          cursor: "pointer",
        }}
      >
        {icon}
      </button>
    );
  }

  const words = wordCount(content);
  const chars = content.length;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: "#f0f0f0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      {/* Title bar supplement */}
      <div
        className="flex items-center flex-shrink-0 select-none"
        style={{ height: 36, padding: "0 20px", backgroundColor: "#2b579a", borderBottom: "1px solid rgba(0,0,0,0.2)" }}
      >
        <span className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>
          {fileName}{modified ? " ●" : ""}
        </span>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px]"
          style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
        >
          <SaveIcon /> {t("word.ribbon.save")}
        </button>
      </div>

      {/* Ribbon */}
      <div
        className="flex items-center flex-wrap gap-1.5 flex-shrink-0 select-none"
        style={{ height: 48, padding: "0 20px", backgroundColor: "#ffffff", borderBottom: "1px solid #d0d0d0", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}
      >
        {/* Font size */}
        <div className="flex items-center gap-1 mr-2">
          <button
            onMouseDown={e => { e.preventDefault(); setFontSize(s => Math.max(8, s - 1)); }}
            className="w-5 h-6 flex items-center justify-center rounded text-[14px]"
            style={{ color: "#2c2c2c", backgroundColor: "transparent" }}
          >−</button>
          <span className="text-[12px] w-6 text-center" style={{ color: "#2c2c2c" }}>{fontSize}</span>
          <button
            onMouseDown={e => { e.preventDefault(); setFontSize(s => Math.min(36, s + 1)); }}
            className="w-5 h-6 flex items-center justify-center rounded text-[14px]"
            style={{ color: "#2c2c2c", backgroundColor: "transparent" }}
          >+</button>
        </div>

        {/* Separator */}
        <div className="w-px h-6 mx-1" style={{ backgroundColor: "#d0d0d0" }} />

        {/* Bold / Italic / Underline */}
        {ribbonBtn(bold,      toggleBold,      <BoldIcon />,      t("word.ribbon.bold"))}
        {ribbonBtn(italic,    toggleItalic,    <ItalicIcon />,    t("word.ribbon.italic"))}
        {ribbonBtn(underline, toggleUnderline, <UnderlineIcon />, t("word.ribbon.underline"))}

        {/* Separator */}
        <div className="w-px h-6 mx-1" style={{ backgroundColor: "#d0d0d0" }} />

        {/* Alignment */}
        {ribbonBtn(align === "left",   () => setAlignment("left"),   <AlignLeftIcon />,   t("word.ribbon.alignLeft"))}
        {ribbonBtn(align === "center", () => setAlignment("center"), <AlignCenterIcon />, t("word.ribbon.center"))}
        {ribbonBtn(align === "right",  () => setAlignment("right"),  <AlignRightIcon />,  t("word.ribbon.alignRight"))}
      </div>

      {/* Document area */}
      <div
        className="flex-1 overflow-auto flex justify-center py-8 px-4"
        style={{ backgroundColor: "#e8e8e8" }}
      >
        {/* Paper */}
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            minHeight: "100%",
            backgroundColor: "#ffffff",
            boxShadow: "0 2px 12px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1)",
            padding: "48px 64px",
            borderRadius: 2,
          }}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            style={{
              outline: "none",
              minHeight: 300,
              fontSize: fontSize,
              lineHeight: 1.7,
              color: "#1a1a1a",
              fontFamily: "Georgia, 'Times New Roman', serif",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
            data-placeholder={t("word.placeholder")}
          />
        </div>
      </div>

      {/* Status bar */}
      <div
        className="flex items-center justify-between flex-shrink-0 select-none"
        style={{ height: 26, padding: "0 20px", backgroundColor: "#2b579a", color: "rgba(255,255,255,0.85)", fontSize: 11 }}
      >
        <span>{words} {t("word.status.words")}&nbsp;&nbsp;{chars} {t("word.status.characters")}</span>
        <span style={{ color: "rgba(255,255,255,0.6)" }}>
          {modified ? t("word.status.unsavedChanges") : t("word.status.saved")}
        </span>
      </div>

      {/* Placeholder style */}
      <style>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #aaa;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useRef, useCallback } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useFileSystemOptional } from "@/contexts/FileSystemContext";
import { useT } from "@/contexts/SystemContext";
import { useAppMenuListener } from "@/lib/menubar/appMenu";

const DOCS = "/Users/guest/Documents";

function wordCount(t: string) { return t.trim() ? t.trim().split(/\s+/).length : 0; }

export default function TextEdit(_props: AppComponentProps) {
  const fs = useFileSystemOptional();
  const t = useT();
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [modified, setModified] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [wrap, setWrap] = useState(true);
  const [showOpen, setShowOpen] = useState(false);
  const [openFiles, setOpenFiles] = useState<{ path: string; name: string }[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const dim = { color: "rgba(255,255,255,0.4)" } as React.CSSProperties;
  const normal = { color: "rgba(255,255,255,0.85)" } as React.CSSProperties;

  const handleNew = useCallback(() => { setContent(""); setFilename(null); setModified(false); }, []);

  const handleSave = useCallback(() => {
    if (!fs) { alert("File system not available."); return; }
    let name = filename;
    if (!name) {
      const p = window.prompt("Filename:", "Untitled.txt");
      if (!p?.trim()) return;
      name = p.trim();
      setFilename(name);
    }
    if (!fs.exists(DOCS)) fs.mkdir(DOCS);
    fs.writeFile(`${DOCS}/${name}`, content);
    setModified(false);
  }, [fs, filename, content]);

  useAppMenuListener("textedit", (detail) => {
    if (detail.type === "save") handleSave();
  });

  const handleOpen = useCallback(() => {
    if (fs && fs.exists(DOCS)) {
      const entries = fs.readDir(DOCS).filter(e => e.type === "file" && (e.name.endsWith(".txt") || e.name.endsWith(".md")));
      setOpenFiles(entries.map(e => ({ path: e.path, name: e.name })));
    } else {
      setOpenFiles([]);
    }
    setShowOpen(true);
  }, [fs]);

  const handleOpenFile = useCallback((f: { path: string; name: string }) => {
    if (!fs) return;
    const raw = fs.readFile(f.path);
    if (raw !== null) { setContent(raw); setFilename(f.name); setModified(false); }
    setShowOpen(false);
  }, [fs]);

  function tbBtn(active: boolean, onClick: () => void, label: React.ReactNode) {
    return (
      <button onClick={onClick} className="flex items-center justify-center px-2 py-1 rounded"
        style={{ color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)", backgroundColor: active ? "rgba(255,255,255,0.12)" : "transparent", fontSize: 13, minWidth: 26 }}>
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: "#1e1e1e", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", position: "relative", animation: "fadeIn 0.2s ease" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 flex-shrink-0" style={{ height: 40, backgroundColor: "#2a2a2c", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-1">
          {([[t("textedit.new"), handleNew], [t("textedit.open"), handleOpen], [t("textedit.save"), handleSave]] as [string, () => void][]).map(([label, fn]) => (
            <button key={label} onClick={fn} className="px-2.5 py-1 rounded"
              style={{ ...normal, backgroundColor: "rgba(255,255,255,0.07)", fontSize: 12 }}>
              {label}
            </button>
          ))}
          <div className="w-px h-5 mx-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          <span className="px-3" style={{ ...dim, fontSize: 12 }}>{t("textedit.systemFont")}</span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setFontSize(s => Math.max(10, s - 1))} className="w-5 h-5 flex items-center justify-center rounded" style={dim}>&#8722;</button>
            <span className="w-6 text-center" style={{ ...normal, fontSize: 12 }}>{fontSize}</span>
            <button onClick={() => setFontSize(s => Math.min(24, s + 1))} className="w-5 h-5 flex items-center justify-center rounded" style={dim}>+</button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {tbBtn(bold, () => setBold(v => !v), <strong>B</strong>)}
          {tbBtn(italic, () => setItalic(v => !v), <em>I</em>)}
          {tbBtn(underline, () => setUnderline(v => !v), <u>U</u>)}
          <div className="w-px h-5 mx-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          <label className="flex items-center gap-1.5 cursor-pointer" style={{ ...dim, fontSize: 12 }}>
            <input type="checkbox" checked={wrap} onChange={e => setWrap(e.target.checked)} className="w-3 h-3" /> {t("textedit.wrap")}
          </label>
        </div>
      </div>

      {/* Editor */}
      <textarea ref={taRef} value={content} onChange={e => { setContent(e.target.value); setModified(true); }}
        placeholder={t("textedit.startTyping")} spellCheck={false}
        className="flex-1 px-6 py-4 outline-none border-none resize-none"
        style={{ backgroundColor: "#1e1e1e", ...normal, fontSize, lineHeight: "1.6", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", fontWeight: bold ? 700 : 400, fontStyle: italic ? "italic" : "normal", textDecoration: underline ? "underline" : "none", whiteSpace: wrap ? "pre-wrap" : "pre", overflowX: wrap ? "hidden" : "auto" }}
      />

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ height: 24, backgroundColor: "#242424", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ ...dim, fontSize: 11 }}>
          {t("textedit.words")} {wordCount(content)}&nbsp;&nbsp;{t("textedit.chars")} {content.length}
          {modified && <span style={{ color: "rgba(255,180,50,0.8)", marginLeft: 8 }}>&#9679;</span>}
        </span>
        <span style={{ ...dim, fontSize: 11 }}>{filename ?? t("textedit.untitled")}</span>
      </div>

      {/* Open dialog */}
      {showOpen && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 50 }} onClick={() => setShowOpen(false)}>
          <div className="rounded-lg overflow-hidden flex flex-col" style={{ width: 320, maxHeight: 400, backgroundColor: "#2a2a2c", border: "1px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ ...normal, fontSize: 14, fontWeight: 600 }}>{t("textedit.openFile")}</span>
              <button onClick={() => setShowOpen(false)} style={dim}>&#10005;</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {openFiles.length === 0 ? (
                <div className="flex items-center justify-center py-8"><span style={{ ...dim, fontSize: 13 }}>{t("textedit.noFiles")}</span></div>
              ) : openFiles.map(f => (
                <button key={f.path} onClick={() => handleOpenFile(f)} className="w-full text-left px-4 py-2.5 hover:bg-white/5"
                  style={{ ...normal, fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

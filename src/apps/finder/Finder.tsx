"use client";

import React, { useState, useCallback, useEffect } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useT, useSystem } from "@/contexts/SystemContext";
import { ContextMenu, type MenuItem } from "@/components/shared/ContextMenu";
import { useFileSystemOptional } from "@/contexts/FileSystemContext";
import { useProcesses } from "@/contexts/ProcessContext";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { planOpenFile } from "@/services/app-manager";

// ── Helpers ────────────────────────────────────────────────────────────────

type Translator = (key: string, vars?: Record<string, string>) => string;

function formatSize(bytes: number, t: Translator): string {
  if (bytes === 0) return t("finder.zeroKB");
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function guessKind(name: string): string {
  // Kind labels are technical and conventionally English in file managers
  // (Finder, Explorer); we keep them stable across languages to avoid
  // mis-translating things like "Markdown" / "JSON". If we ever decide to
  // localize these, add finder.kind.* keys and route through t() here.
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "app") return "Application";
  if (ext === "txt") return "Plain Text";
  if (ext === "md")  return "Markdown";
  if (ext === "pdf") return "PDF Document";
  if (ext === "json") return "JSON";
  if (ext === "docx") return "Word Document";
  if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp") return "Image";
  return "Document";
}

function formatDate(ts: number, lang: "en" | "zh", t: Translator): string {
  const diff = Date.now() - ts;
  const day = 86400000;
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const timeStr = new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (diff < day)       return t("finder.todayAt", { time: timeStr });
  if (diff < 2 * day)   return t("finder.yesterdayAt", { time: timeStr });
  return new Date(ts).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

// Convert a VFS path to breadcrumb segments for display. First segment is the
// localized "Macintosh HD" label so the breadcrumb root reflects the lang
// toggle; deeper path parts are literal VFS names — except ".Trash", which
// real Finder never shows raw: it displays the localized "Trash" label.
function pathToSegments(path: string, t: Translator): string[] {
  const root = t("desktop.macintoshHd");
  const parts = path.split("/").filter(Boolean)
    .map(p => p === ".Trash" ? t("finder.sidebar.trash") : p);
  if (parts.length === 0) return [root];
  return [root, ...parts];
}

// ── Types ──────────────────────────────────────────────────────────────────

interface FileEntry {
  name: string;
  type: "folder" | "file";
  size: string;
  kind: string;
  date: string;
  fullPath: string;
}

// ── Sidebar VFS paths ──────────────────────────────────────────────────────

// Sidebar id → VFS path. Items not in this map (airdrop / network) render a special view instead.
const SIDEBAR_PATHS: Record<string, string> = {
  recents:      "/Users/guest",
  shared:       "/Users/guest",
  downloads:    "/Users/guest/Downloads",
  documents:    "/Users/guest/Documents",
  desktop:      "/Users/guest/Desktop",
  applications: "/Applications",
  k4rto:        "/Users/guest/K4RTO",
  icloud:       "/Users/guest/Documents",
  trash:        "/Users/guest/.Trash",
};

// Sidebar ids that render a special placeholder view (no FS path).
const SPECIAL_VIEWS = new Set(["airdrop", "network"]);

// ── SVG Icons ──────────────────────────────────────────────────────────────

function ClockIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" strokeLinecap="round"/></svg>; }
function SharedIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/></svg>; }
function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function DocIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>; }
function DesktopIcon2() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" strokeLinecap="round"/></svg>; }
function GridIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function CloudIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>; }
function WifiIcon2()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>; }
function GlobeIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>; }
function TrashIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }

function FolderFileIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
        fill="#4a9eff" stroke="#3a8eef" strokeWidth="0.5"/>
    </svg>
  );
}

function DocumentFileIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#4a4a4a" stroke="#5a5a5a" strokeWidth="0.5"/>
      <path d="M14 2v6h6" fill="#3a3a3a" stroke="#5a5a5a" strokeWidth="0.5"/>
      <line x1="8" y1="13" x2="16" y2="13" stroke="#888" strokeWidth="1"/>
      <line x1="8" y1="16" x2="14" y2="16" stroke="#888" strokeWidth="1"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>;
}

function IconsViewIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function ListViewIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function ColumnViewIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="6" height="18" rx="1"/><rect x="10" y="3" width="6" height="18" rx="1"/><rect x="18" y="3" width="4" height="18" rx="1"/></svg>; }
function GalleryViewIcon(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="13" rx="2"/><rect x="2" y="17" width="5" height="5" rx="1"/><rect x="9" y="17" width="5" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/></svg>; }
function ShareIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>; }
function TagIcon()        { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>; }
function SearchIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function MoreIcon()       { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>; }
function PersonIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function SearchInputIcon(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function CloseXIcon()     { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }

// ── Get Info Popover ───────────────────────────────────────────────────────

function GetInfoPanel({ file, onClose, t }: { file: FileEntry; onClose: () => void; t: (key: string, vars?: Record<string, string>) => string }) {
  const lastSlash = file.fullPath.lastIndexOf("/");
  const where = lastSlash > 0 ? file.fullPath.slice(0, lastSlash) : "/";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  // ESC to close — matches AboutThisMac / Spotlight modal conventions
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-start justify-center"
      style={{ zIndex: 99998, backgroundColor: "rgba(0,0,0,0.32)", paddingTop: "10vh" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-surface glass-thick glass-radius-panel glass-shadow-lg"
        style={{
          width: 340,
          padding: 22,
          color: "rgba(255,255,255,0.92)",
          animation: "spring-pop 0.22s var(--spring-bouncy) both",
          position: "relative",
        }}
      >
        {/* Close. zIndex needed — without it the sibling modal body in the
            same stacking context can paint on top of this absolute button
            and swallow the click. Same fix as AboutThisMac. */}
        <button
          onClick={onClose}
          className="absolute flex items-center justify-center"
          style={{ zIndex: 10, top: 12, left: 12, width: 22, height: 22, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)" }}
          aria-label={t("finder.ctx.getInfo")}
        >
          <CloseXIcon />
        </button>

        {/* Big icon */}
        <div className="flex flex-col items-center" style={{ marginTop: 8, marginBottom: 18 }}>
          <div style={{ marginBottom: 12 }}>
            {file.type === "folder"
              ? <FolderFileIcon size={72} />
              : <DocumentFileIcon size={72} />}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, textAlign: "center", maxWidth: 280, wordBreak: "break-word" }}>
            {file.name}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
            {file.size} · {file.kind}
          </div>
        </div>

        {/* Info rows */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
          {[
            [t("finder.col.kind"),  file.kind],
            [t("finder.col.size"),  file.size],
            [t("finder.info.where"), where],
            [t("finder.info.modified"), file.date],
            ...(ext ? [[t("finder.info.extension"), ext.toUpperCase()] as [string, string]] : []),
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-3" style={{ padding: "4px 0", fontSize: 12 }}>
              <div style={{ width: 90, color: "rgba(255,255,255,0.45)", textAlign: "right", flexShrink: 0 }}>{k}</div>
              <div style={{ color: "rgba(255,255,255,0.88)", wordBreak: "break-all", overflow: "hidden" }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Path */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{t("finder.info.path")}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", wordBreak: "break-all", fontFamily: "Menlo, monospace" }}>{file.fullPath}</div>
        </div>
      </div>
    </div>
  );
}

// ── Special View (AirDrop / Network) ───────────────────────────────────────

function AirDropBigIcon() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="airdropGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a9eff"/>
          <stop offset="1" stopColor="#0058d0"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#airdropGrad)"/>
      <path d="M60 32 L88 80 L60 64 L32 80 Z" fill="white" opacity="0.95"/>
    </svg>
  );
}

function NetworkBigIcon() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a0a4ad"/>
          <stop offset="1" stopColor="#5a5e68"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#netGrad)"/>
      <circle cx="60" cy="60" r="32" stroke="white" strokeWidth="3" fill="none"/>
      <ellipse cx="60" cy="60" rx="14" ry="32" stroke="white" strokeWidth="3" fill="none"/>
      <line x1="28" y1="60" x2="92" y2="60" stroke="white" strokeWidth="3"/>
    </svg>
  );
}

function SpecialView({ kind, t }: { kind: "airdrop" | "network"; t: (key: string) => string }) {
  const isAirDrop = kind === "airdrop";
  return (
    <div className="flex flex-col items-center justify-center h-full px-12 text-center select-none">
      <div style={{ marginBottom: 24, opacity: 0.85 }}>
        {isAirDrop ? <AirDropBigIcon /> : <NetworkBigIcon />}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 8 }}>
        {isAirDrop ? t("finder.special.airdropTitle") : t("finder.special.networkTitle")}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", maxWidth: 360, lineHeight: 1.5 }}>
        {isAirDrop ? t("finder.special.airdropDesc") : t("finder.special.networkDesc")}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

type ViewMode = "icons" | "list";
interface CtxMenuState { x: number; y: number; file: FileEntry; }

export default function Finder({ windowId }: AppComponentProps) {
  // Honor meta.initialPath so launchers (Dock trash, Spotlight, etc.) can
  // open Finder pointed at a specific folder instead of the Downloads default.
  const wm = useWindowManager();
  const initialMeta = wm.state.windows.get(windowId)?.meta ?? {};
  const initialPath = typeof initialMeta.initialPath === "string"
    ? initialMeta.initialPath
    : "/Users/guest/Downloads";
  // Reverse-lookup which sidebar entry corresponds to initialPath so launchers
  // like Dock-Trash open Finder with the right sidebar row highlighted.
  // Falls back to "downloads" — the implicit home for a fresh Finder window.
  const initialSidebarId =
    (Object.entries(SIDEBAR_PATHS).find(([, p]) => p === initialPath)?.[0]) ?? "downloads";
  const t = useT();
  const { lang } = useSystem();
  const fs = useFileSystemOptional();
  const { launch } = useProcesses();

  const [selected, setSelected] = useState<string>(initialSidebarId);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortCol, setSortCol] = useState<"name" | "size" | "kind" | "date">("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const [getInfoFile, setGetInfoFile] = useState<FileEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Navigation
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [pathHistory, setPathHistory] = useState([initialPath]);
  const [histIdx, setHistIdx] = useState(0);

  // Special placeholder views (airdrop / network) — no FS path, render custom UI
  const [specialView, setSpecialView] = useState<"airdrop" | "network" | null>(null);

  // File list (from VFS or empty)
  const [files, setFiles] = useState<FileEntry[]>([]);

  // Load directory contents from VFS (Finder hides dot-files like macOS default;
  // Terminal etc. can still readDir to see them.)
  const loadDir = useCallback((path: string) => {
    if (!fs) { setFiles([]); return; }
    if (!fs.exists(path)) { setFiles([]); return; }
    const entries = fs.readDir(path).filter(e => !e.name.startsWith("."));
    setFiles(entries.map(e => ({
      name: e.name,
      type: e.type === "dir" ? "folder" : "file",
      size: e.type === "file" ? formatSize(e.size, t) : "--",
      kind: e.type === "dir" ? "Folder" : guessKind(e.name),
      date: formatDate(e.modifiedAt, lang, t),
      fullPath: e.path,
    })));
    setSelectedFile(null);
  }, [fs]);

  // Navigate to a path (adds to history)
  const navigateTo = useCallback((path: string) => {
    setSpecialView(null);
    // Reset search on every navigation — stale filter would silently empty the
    // new directory and the user would think it's empty (reviewer P0-1).
    setSearchQuery("");
    setSearchOpen(false);
    setCurrentPath(path);
    setPathHistory(h => {
      const nh = h.slice(0, histIdx + 1);
      return [...nh, path];
    });
    setHistIdx(i => i + 1);
    loadDir(path);
  }, [histIdx, loadDir]);

  // Navigate without adding to history (for back/forward)
  const jumpTo = useCallback((path: string) => {
    setSpecialView(null);
    setSearchQuery("");
    setSearchOpen(false);
    setCurrentPath(path);
    loadDir(path);
  }, [loadDir]);

  // Initial load
  useEffect(() => {
    loadDir(currentPath);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs]);

  // Sidebar click
  const handleSidebarSelect = useCallback((id: string) => {
    setSelected(id);
    if (SPECIAL_VIEWS.has(id)) {
      setSpecialView(id as "airdrop" | "network");
      setFiles([]);
      return;
    }
    setSpecialView(null);
    const path = SIDEBAR_PATHS[id] ?? "/Users/guest";
    navigateTo(path);
  }, [navigateTo]);

  // Back / Forward
  const canGoBack    = histIdx > 0;
  const canGoForward = histIdx < pathHistory.length - 1;

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    const ni = histIdx - 1;
    setHistIdx(ni);
    jumpTo(pathHistory[ni]);
  }, [canGoBack, histIdx, pathHistory, jumpTo]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    const ni = histIdx + 1;
    setHistIdx(ni);
    jumpTo(pathHistory[ni]);
  }, [canGoForward, histIdx, pathHistory, jumpTo]);

  // Open / navigate into folder or file
  const openFile = useCallback((file: FileEntry) => {
    if (file.type === "folder") {
      navigateTo(file.fullPath);
      return;
    }
    if (!fs) return;
    const plan = planOpenFile(fs, file.fullPath);
    if (plan) launch(plan.appId, plan.meta);
  }, [navigateTo, launch, fs]);

  // Listen for menu bar actions dispatched via finderMenuAction custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const { type, view, path } = (e as CustomEvent<{ type: string; view?: string; path?: string }>).detail;
      if (type === "goBack")              goBack();
      if (type === "goForward")           goForward();
      if (type === "navigate" && path)    navigateTo(path);
      if (type === "setView" && view)     setViewMode(view as ViewMode);
    };
    window.addEventListener("finderMenuAction", handler);
    return () => window.removeEventListener("finderMenuAction", handler);
  }, [goBack, goForward, navigateTo, setViewMode]);

  // Context menu for file rows
  const openCtxMenu = useCallback((e: React.MouseEvent, file: FileEntry) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, file });
  }, []);

  // Are we currently looking at the Trash? Drives which actions to surface.
  const inTrash = currentPath === "/Users/guest/.Trash" || currentPath.startsWith("/Users/guest/.Trash/");

  // ⌘+Delete moves the selected file to Trash (or, when already in .Trash,
  // permanently deletes it). Mirrors real Finder. The deps capture
  // selectedFile / files / inTrash so the handler always sees fresh state.
  // Focus guard: this listener is on `document`, so without a windowId check
  // multiple Finder windows would all fire on a single keypress. Only the
  // currently-focused Finder window should react.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Focused window = last entry in windowOrder (top of z-stack).
      const order = wm.state.windowOrder;
      const focusedId = order.length > 0 ? order[order.length - 1] : null;
      if (focusedId !== windowId) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      if (!fs || !selectedFile) return;
      const file = files.find(f => f.name === selectedFile);
      if (!file) return;
      e.preventDefault();
      if (inTrash) {
        if (!confirm(t("finder.ctx.confirmDeleteImmediately", { name: file.name }))) return;
        fs.remove(file.fullPath);
      } else {
        fs.moveToTrash(file.fullPath);
      }
      setSelectedFile(null);
      loadDir(currentPath);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fs, selectedFile, files, inTrash, t, loadDir, currentPath, wm.state.windowOrder, windowId]);

  const buildCtxItems = useCallback((file: FileEntry): MenuItem[] => {
    const items: MenuItem[] = [
      { label: t("finder.ctx.open"), action: () => openFile(file) },
    ];
    if (file.type === "file") {
      items.push({ label: t("finder.ctx.openWithTextEdit"), action: () => launch("textedit", { filePath: file.fullPath, fileName: file.name }) });
    }
    items.push(
      { separator: true },
      { label: t("finder.ctx.getInfo"), action: () => setGetInfoFile(file) },
      { separator: true },
    );

    if (inTrash) {
      // Inside .Trash, "Move to Trash" makes no sense — show Put Back +
      // Delete Immediately instead. Put Back is disabled when the origin is
      // unknown (e.g. a manually-created file inside .Trash) or the origin
      // is now occupied by something else.
      const origin = fs?.getTrashOrigin(file.fullPath) ?? null;
      const originGone = !!(origin && fs?.exists(origin));
      items.push(
        {
          label: origin
            ? t("finder.ctx.putBackTo", { path: origin })
            : t("finder.ctx.putBack"),
          disabled: !origin || originGone,
          action: () => {
            if (!fs || !origin) return;
            fs.restoreFromTrash(file.fullPath);
            loadDir(currentPath);
          },
        },
        {
          label: t("finder.ctx.deleteImmediately"),
          action: () => {
            if (!fs) return;
            if (!confirm(t("finder.ctx.confirmDeleteImmediately", { name: file.name }))) return;
            fs.remove(file.fullPath);
            loadDir(currentPath);
          },
        },
      );
    } else {
      items.push(
        { label: t("finder.ctx.duplicate"), disabled: true },
        {
          label: t("finder.ctx.moveToTrash"),
          action: () => {
            if (!fs) return;
            fs.moveToTrash(file.fullPath);
            loadDir(currentPath);
          },
        },
      );
    }

    items.push(
      { separator: true },
      { label: t("finder.ctx.copy", { name: file.name }), disabled: true },
    );
    return items;
  }, [t, openFile, fs, loadDir, currentPath, inTrash]);

  // Filter by search query first (when search bar is open) — case-insensitive
  // substring match on file name. Empty query = no filter.
  const filteredFiles = searchOpen && searchQuery.trim()
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  // Sorting
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    // Folders always first
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    let va = "", vb = "";
    if (sortCol === "name") { va = a.name; vb = b.name; }
    else if (sortCol === "size") { va = a.size; vb = b.size; }
    else if (sortCol === "kind") { va = a.kind; vb = b.kind; }
    else { va = a.date; vb = b.date; }
    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
  };

  // Current folder name for toolbar
  const currentFolderName = specialView
    ? (specialView === "airdrop" ? t("finder.sidebar.airdrop") : t("finder.sidebar.network"))
    : (currentPath.split("/").pop() || "Macintosh HD");

  // Path bar segments
  const pathSegments = pathToSegments(currentPath, t);

  // Sidebar data with translations
  const sidebarData = [
    {
      header: null,
      items: [
        { id: "recents",  label: t("finder.sidebar.recents"),  icon: <ClockIcon /> },
        { id: "shared",   label: t("finder.sidebar.shared"),   icon: <SharedIcon /> },
      ],
    },
    {
      header: t("finder.sidebar.favorites"),
      items: [
        { id: "downloads",    label: t("finder.sidebar.downloads"),    icon: <DownloadIcon /> },
        { id: "documents",    label: t("finder.sidebar.documents"),    icon: <DocIcon /> },
        { id: "desktop",      label: t("finder.sidebar.desktop"),      icon: <DesktopIcon2 /> },
        { id: "k4rto",        label: t("finder.sidebar.k4rto"),        icon: <PersonIcon /> },
        { id: "applications", label: t("finder.sidebar.applications"), icon: <GridIcon /> },
      ],
    },
    {
      header: t("finder.sidebar.locations"),
      items: [
        { id: "icloud",   label: t("finder.sidebar.icloudDrive"), icon: <CloudIcon /> },
        { id: "airdrop",  label: t("finder.sidebar.airdrop"),     icon: <WifiIcon2 /> },
        { id: "network",  label: t("finder.sidebar.network"),     icon: <GlobeIcon /> },
        { id: "trash",    label: t("finder.sidebar.trash"),       icon: <TrashIcon /> },
      ],
    },
    {
      header: t("finder.sidebar.tags"),
      items: [],
    },
  ];

  // Column definitions
  const cols: Array<[typeof sortCol, string, string, React.CSSProperties]> = [
    ["name", t("finder.col.name"), "flex-1 min-w-0", {}],
    ["size", t("finder.col.size"), "w-20 text-right flex-shrink-0", { paddingRight: 12 }],
    ["kind", t("finder.col.kind"), "w-36 flex-shrink-0", { paddingLeft: 8 }],
    ["date", t("finder.col.date"), "w-40 flex-shrink-0", { paddingLeft: 8 }],
  ];

  return (
    <div className="finder-glass-app flex flex-col h-full" style={{ color: "rgba(255,255,255,0.86)", animation: "fadeIn 0.2s ease" }}>
      {/* ── Toolbar ── */}
      <div className="finder-toolbar-glass flex items-center gap-2 px-5 h-[52px] flex-shrink-0 select-none">
        {/* Back / Forward */}
        <div className="flex items-center gap-0.5 mr-1">
          <button onClick={goBack}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[18px]"
            style={{ color: canGoBack ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", cursor: canGoBack ? "pointer" : "default" }}>
            &#8249;
          </button>
          <button onClick={goForward}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[18px]"
            style={{ color: canGoForward ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", cursor: canGoForward ? "pointer" : "default" }}>
            &#8250;
          </button>
        </div>

        {/* Title / breadcrumb */}
        {specialView ? (
          <span className="text-[15px] font-bold flex-1 ml-1">{currentFolderName}</span>
        ) : (
          <div className="flex items-center gap-1 flex-1 ml-1 min-w-0 overflow-hidden">
            {pathSegments.map((seg, i, arr) => {
              const isLast = i === arr.length - 1;
              const onClick = () => {
                if (i === 0) return; // "Macintosh HD" — no nav target
                if (isLast) return;  // already there
                const parts = pathSegments.slice(1, i + 1);
                navigateTo("/" + parts.join("/"));
              };
              // Last segment gets `flex-shrink` + `min-w-0` so it can shrink without
              // being pushed off when path is deep; non-last get a tighter maxWidth
              // so they yield space to the current-dir name.
              return (
                <span
                  key={`${seg}-${i}`}
                  className="flex items-center gap-1"
                  style={{
                    minWidth: 0,
                    flexShrink: isLast ? 1 : 0.5,
                  }}
                >
                  <span
                    onClick={onClick}
                    className="truncate"
                    style={{
                      fontSize: 15,
                      fontWeight: isLast ? 700 : 500,
                      color: isLast ? "white" : "rgba(255,255,255,0.55)",
                      cursor: isLast || i === 0 ? "default" : "pointer",
                      padding: "2px 4px",
                      borderRadius: 4,
                      transition: "background-color 0.12s ease",
                      maxWidth: isLast ? undefined : 90,
                      minWidth: 0,
                    }}
                    onMouseEnter={e => { if (!isLast && i !== 0) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {seg}
                  </span>
                  {!isLast && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, flexShrink: 0 }}>&#8250;</span>}
                </span>
              );
            })}
          </div>
        )}

        {/* Empty Trash — only visible when inside .Trash. Real macOS surfaces
            this as a destructive primary action on the Trash window's toolbar.
            Disabled when the trash is already empty. */}
        {inTrash && (
          <button
            onClick={() => {
              if (!fs) return;
              const topCount = fs.readDir("/Users/guest/.Trash").length;
              if (topCount === 0) return;
              if (!confirm(t("finder.ctx.confirmEmptyTrash", { n: String(topCount) }))) return;
              fs.emptyTrash();
              loadDir(currentPath);
              setSelectedFile(null);
            }}
            className="px-3 h-7 rounded-[6px] text-[12px] mr-2"
            style={{
              color: files.length > 0 ? "white" : "rgba(255,255,255,0.35)",
              backgroundColor: files.length > 0 ? "rgba(255,59,48,0.85)" : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: files.length > 0 ? "pointer" : "default",
            }}
            disabled={files.length === 0}
            title={t("finder.ctx.emptyTrash")}
          >
            {t("finder.ctx.emptyTrash")}
          </button>
        )}

        {/* View toggle */}
        <div className="flex items-center rounded-[8px] overflow-hidden mr-1"
          style={{ border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)" }}>
          {([["icons", <IconsViewIcon />], ["list", <ListViewIcon />], ["columns", <ColumnViewIcon />], ["gallery", <GalleryViewIcon />]] as const).map(([mode, icon]) => (
            <button key={mode}
              onClick={() => setViewMode(mode === "icons" ? "icons" : "list")}
              className="w-9 h-7 flex items-center justify-center"
              style={{
                color: viewMode === mode ? "white" : "rgba(255,255,255,0.45)",
                backgroundColor: viewMode === mode ? "rgba(255,255,255,0.15)" : "transparent",
              }}>
              {icon}
            </button>
          ))}
        </div>

        {/* Right actions */}
        {[<ShareIcon />, <TagIcon />, <MoreIcon />].map((icon, i) => (
          <button key={i} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: "rgba(255,255,255,0.55)", backgroundColor: "rgba(255,255,255,0.07)" }}
            disabled
            title={t("finder.toolbar.comingSoon")}
          >
            {icon}
          </button>
        ))}

        {/* Search — toggles between icon button and inline input */}
        {searchOpen ? (
          <div
            className="flex items-center gap-1.5 px-2 h-8 rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.10)", border: "0.5px solid rgba(255,255,255,0.08)", minWidth: 200, maxWidth: 260 }}
          >
            <span style={{ color: "rgba(255,255,255,0.55)", display: "flex" }}><SearchInputIcon /></span>
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") { setSearchQuery(""); setSearchOpen(false); } }}
              placeholder={t("finder.searchPlaceholder")}
              className="flex-1 outline-none bg-transparent text-[12px]"
              style={{ color: "rgba(255,255,255,0.9)", border: "none", minWidth: 0 }}
              aria-label="Filter files"
            />
            <button
              onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ color: "rgba(255,255,255,0.55)" }}
              aria-label="Close search"
            >
              <CloseXIcon />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: "rgba(255,255,255,0.7)", backgroundColor: "rgba(255,255,255,0.07)" }}
            title={t("finder.searchPlaceholder")}
            aria-label={t("finder.searchPlaceholder")}
          >
            <SearchIcon />
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <div className="finder-sidebar-glass flex-shrink-0 overflow-y-auto py-2 select-none"
          style={{ width: 210 }}>
          {sidebarData.map((section, si) => (
            <div key={si} className="mb-1">
              {section.header && (
                <div className="pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.3)", paddingLeft: 16, paddingRight: 12 }}>
                  {section.header}
                </div>
              )}
              {section.items.map(item => {
                const isActive = selected === item.id;
                return (
                  <button key={item.id} onClick={() => handleSidebarSelect(item.id)}
                    className="w-full flex items-center gap-2 text-[13px] text-left"
                    style={{
                      padding: "5px 10px 5px 16px",
                      color: isActive ? "white" : "rgba(255,255,255,0.75)",
                      backgroundColor: isActive ? "rgba(0, 96, 220, 0.92)" : "transparent",
                      borderRadius: 6,
                      margin: "1px 6px",
                      width: "calc(100% - 12px)",
                    }}>
                    <span style={{ color: isActive ? "white" : "#4a9eff", flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── File Content ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {specialView ? (
            <SpecialView kind={specialView} t={t} />
          ) : viewMode === "list" ? (
            <>
              {/* Column headers */}
              <div className="finder-header-glass flex items-center h-8 flex-shrink-0 text-[12px] select-none"
                style={{ padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.42)" }}>
                {cols.map(([col, label, cls, style]) => (
                  <button key={col} className={`${cls} flex items-center gap-1 text-left`}
                    style={style as React.CSSProperties}
                    onClick={() => toggleSort(col)}>
                    {label}
                    {sortCol === col && <span className="text-[10px]">{sortAsc ? "\u2191" : "\u2193"}</span>}
                  </button>
                ))}
              </div>

              {/* Rows */}
              <div className="flex-1 overflow-y-auto">
                {sortedFiles.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>{t("finder.emptyFolder")}</span>
                  </div>
                ) : sortedFiles.map((file, i) => {
                  const isSel = selectedFile === file.name;
                  return (
                    <div key={file.name}
                      onClick={() => setSelectedFile(file.name)}
                      onDoubleClick={() => openFile(file)}
                      onContextMenu={e => openCtxMenu(e, file)}
                      className="flex items-center h-[26px] text-[13px] cursor-default select-none"
                      style={{
                        backgroundColor: isSel ? "rgba(0, 96, 220, 0.92)" : i % 2 === 0 ? "rgba(255,255,255,0.025)" : "transparent",
                        color: isSel ? "white" : "rgba(255,255,255,0.8)",
                        paddingLeft: 16,
                        paddingRight: 16,
                      }}>
                      {/* Chevron for folders */}
                      <span style={{ color: isSel ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)", marginRight: 4, flexShrink: 0 }}>
                        {file.type === "folder"
                          ? <ChevronRightIcon />
                          : <span style={{ width: 10, display: "inline-block" }} />}
                      </span>
                      {/* Icon */}
                      <span className="mr-2 flex-shrink-0">
                        {file.type === "folder" ? <FolderFileIcon size={15} /> : <DocumentFileIcon size={15} />}
                      </span>
                      {/* Name */}
                      <span className="flex-1 min-w-0 truncate">{file.name}</span>
                      {/* Size */}
                      <span className="w-20 text-right flex-shrink-0"
                        style={{ paddingRight: 12, color: isSel ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)" }}>
                        {file.size}
                      </span>
                      {/* Kind */}
                      <span className="w-36 flex-shrink-0 truncate"
                        style={{ paddingLeft: 8, color: isSel ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)" }}>
                        {file.kind}
                      </span>
                      {/* Date */}
                      <span className="w-40 flex-shrink-0 truncate"
                        style={{ paddingLeft: 8, color: isSel ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)" }}>
                        {file.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Icons view */
            <div className="flex-1 overflow-y-auto p-4">
              {sortedFiles.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>{t("finder.emptyFolder")}</span>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {sortedFiles.map(file => (
                    <div key={file.name}
                      onClick={() => setSelectedFile(file.name)}
                      onDoubleClick={() => openFile(file)}
                      onContextMenu={e => openCtxMenu(e, file)}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-lg cursor-default"
                      style={{ backgroundColor: selectedFile === file.name ? "rgba(0, 96, 220, 0.92)" : "transparent" }}>
                      {file.type === "folder" ? <FolderFileIcon size={52} /> : <DocumentFileIcon size={52} />}
                      <span className="text-[11px] text-center truncate w-full"
                        style={{ color: selectedFile === file.name ? "white" : "rgba(255,255,255,0.8)" }}>
                        {file.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Path Bar ── */}
          <div className="finder-bottom-glass flex items-center gap-1 h-7 flex-shrink-0 text-[11px] select-none overflow-hidden"
            style={{ padding: "0 20px", borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
            {pathSegments.map((seg, i, arr) => (
              <span key={`${seg}-${i}`} className="flex items-center gap-1 flex-shrink-0">
                <span
                  className="cursor-default"
                  style={{ color: i === arr.length - 1 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.35)" }}
                  onClick={() => {
                    if (i === 0) return;                  // Macintosh HD
                    if (i === arr.length - 1) return;     // already on this dir — don't duplicate history
                    const parts = pathSegments.slice(1, i + 1); // skip "Macintosh HD"
                    navigateTo("/" + parts.join("/"));
                  }}
                >
                  {seg}
                </span>
                {i < arr.length - 1 && <span style={{ opacity: 0.4 }}>&#8250;</span>}
              </span>
            ))}
            {selectedFile && (
              <>
                <span style={{ opacity: 0.4 }}>&#8250;</span>
                <span className="flex items-center gap-1 flex-shrink-0" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {files.find(f => f.name === selectedFile)?.type === "folder"
                    ? <FolderFileIcon size={11} />
                    : <DocumentFileIcon size={11} />}
                  {selectedFile}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Context Menu ── */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={buildCtxItems(ctxMenu.file)}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* ── Get Info Panel ── */}
      {getInfoFile && (
        <GetInfoPanel
          file={getInfoFile}
          onClose={() => setGetInfoFile(null)}
          t={t}
        />
      )}
    </div>
  );
}

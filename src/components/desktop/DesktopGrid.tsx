"use client";

import { useCallback, useId, useState } from "react";
import Image from "next/image";
import { ContextMenu, type MenuItem } from "@/components/shared/ContextMenu";
import { useT } from "@/contexts/SystemContext";
import { useFileSystemOptional } from "@/contexts/FileSystemContext";
import { withBase } from "@/lib/paths";

// ── Document icon — generic sheet w/ a corner ear-fold, used for any non-folder
// VFS entry on the desktop. Renders an extension label badge so PDF / TXT /
// MD etc. are distinguishable at a glance.
//
// useId gives each <DocumentIcon> instance a globally-unique gradient id that
// is also stable across SSR and hydration. Repeating `id="docGrad"` across
// instances would violate the SVG/HTML spec (browsers use the *first* matching
// def); a module-level counter (the previous approach) diverges between the
// server and client render passes and trips React's hydration mismatch.
function DocumentIcon({ ext, tint }: { ext: string; tint: string }) {
  const gradId = `docGrad-${useId()}`;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.96" />
          <stop offset="1" stopColor="#dfe2e6" stopOpacity="0.96" />
        </linearGradient>
      </defs>
      {/* Sheet body */}
      <path
        d="M10 4 H32 L42 14 V46 Q42 48 40 48 H12 Q10 48 10 46 Z"
        fill={`url(#${gradId})`}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="0.6"
      />
      {/* Folded corner */}
      <path
        d="M32 4 L42 14 H34 Q32 14 32 12 Z"
        fill="rgba(0,0,0,0.10)"
      />
      {/* Extension label badge */}
      {ext && (
        <g>
          <rect
            x="10"
            y="32"
            width="32"
            height="11"
            rx="2"
            fill={tint}
          />
          <text
            x="26"
            y="40"
            textAnchor="middle"
            fontFamily="-apple-system, SF Pro Text, sans-serif"
            fontSize="7.5"
            fontWeight="700"
            fill="white"
            letterSpacing="0.5"
          >
            {ext.toUpperCase()}
          </text>
        </g>
      )}
    </svg>
  );
}

const EXT_TINT: Record<string, string> = {
  pdf:  "#e53935",   // Apple's Preview-PDF red-ish
  md:   "#0a84ff",   // markdown / docs blue
  txt:  "#6b7280",   // neutral
  json: "#f59e0b",
  ts:   "#3178c6",
  tsx:  "#3178c6",
  js:   "#d4a017",
  jsx:  "#d4a017",
  css:  "#7c3aed",
  html: "#e34c26",
  doc:  "#1d4ed8",
  docx: "#1d4ed8",
};

function tintFor(ext: string): string {
  return EXT_TINT[ext.toLowerCase()] ?? "#6b7280";
}

/** Pick which app should open a given filename. Mirrors Spotlight's dispatch. */
function appForFile(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf", "png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "preview";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["ts", "tsx", "js", "jsx", "json", "css", "html", "md"].includes(ext)) return "vscode";
  return "textedit";
}

function metaForFile(
  appId: string,
  filePath: string,
  fileName: string,
  vfsContent: string | null,
): Record<string, string> {
  if (appId === "preview") {
    // If the VFS entry is a public-asset marker (e.g. `__public:K4RTO/Resume.pdf`),
    // honor it — otherwise pdfjs would 404 because /Desktop/Resume.pdf
    // doesn't actually exist under public/. For real on-disk VFS content
    // (no marker), fall back to the path-stripping heuristic.
    let publicPath: string;
    if (vfsContent && vfsContent.startsWith("__public:")) {
      publicPath = "/" + vfsContent.slice("__public:".length);
    } else {
      publicPath = filePath.replace("/Users/guest/", "/");
    }
    return { filePath, publicPath, fileName };
  }
  return { filePath, fileName };
}

interface DesktopIconProps {
  name: string;
  selected: boolean;
  /** Either a webp/png filename under /System/Icons/96x96/ (legacy)... */
  icon?: string;
  /** ...or a fully rendered React node (inline SVG). */
  iconNode?: React.ReactNode;
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu: (x: number, y: number) => void;
}

function DesktopIcon({ name, icon, iconNode, selected, onSelect, onOpen, onContextMenu }: DesktopIconProps) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-lg cursor-default select-none"
      style={{ width: 80, padding: "6px 4px", backgroundColor: selected ? "rgba(255,255,255,0.12)" : "transparent" }}
      onClick={e => { e.stopPropagation(); onSelect(); }}
      onDoubleClick={onOpen}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onContextMenu(e.clientX, e.clientY); }}
    >
      <div
        className="drop-shadow-lg"
        style={{
          width: 52,
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: selected ? "brightness(0.8) saturate(1.2)" : undefined,
        }}
      >
        {iconNode ? iconNode : icon ? (
          <Image
            src={withBase(`/System/Icons/96x96/${icon}`)}
            alt={name}
            width={52}
            height={52}
            draggable={false}
            unoptimized
            style={{ width: 52, height: 52 }}
          />
        ) : null}
      </div>
      <span
        style={{
          fontSize: 11,
          color: "white",
          textShadow: "0 1px 3px rgba(0,0,0,0.9)",
          textAlign: "center",
          lineHeight: 1.3,
          maxWidth: 76,
          wordBreak: "break-word",
          backgroundColor: selected ? "#0058d0" : "transparent",
          borderRadius: 3,
          padding: selected ? "1px 4px" : undefined,
        }}
      >
        {name}
      </span>
    </div>
  );
}

interface CtxState { x: number; y: number; items: MenuItem[] }

export function DesktopGrid({ onLaunchApp }: { onLaunchApp?: (appId: string, meta?: Record<string, string>) => void }) {
  const t = useT();
  const fs = useFileSystemOptional();
  const [selected, setSelected] = useState<string | null>(null);
  const [ctx, setCtx] = useState<CtxState | null>(null);

  const openFinder = useCallback(() => onLaunchApp?.("finder"), [onLaunchApp]);

  // Read VFS Desktop dir. Hide dot-files (matches Finder convention) and the
  // Trash + system entries that shouldn't appear as user-facing icons.
  const desktopFiles = (fs?.readDir("/Users/guest/Desktop") ?? [])
    .filter((e) => !e.name.startsWith("."));

  const openVfsItem = useCallback(
    (path: string, name: string, isDir: boolean) => {
      if (!onLaunchApp || !fs) return;
      if (isDir) {
        onLaunchApp("finder", { initialPath: path });
        return;
      }
      const appId = appForFile(name);
      const content = fs.readFile(path);
      onLaunchApp(appId, metaForFile(appId, path, name, content));
    },
    [onLaunchApp, fs],
  );

  const backgroundCtxItems: MenuItem[] = [
    { label: t("desktop.ctx.newFolder"), action: () => {}, shortcut: "⇧⌘N", disabled: true },
    { label: t("desktop.ctx.getInfo"), disabled: true },
    { separator: true },
    { label: t("desktop.ctx.changeWallpaper"), disabled: true },
    { separator: true },
    { label: t("desktop.ctx.sortBy"), disabled: true },
    { label: t("desktop.ctx.cleanUp"), disabled: true },
  ];

  const hdItems: MenuItem[] = [
    { label: t("desktop.hd.open"), action: openFinder },
    { label: t("desktop.hd.openInNewTab"), action: openFinder },
    { separator: true },
    { label: t("desktop.hd.getInfo"), action: () => {} },
    { separator: true },
    { label: t("desktop.hd.eject"), disabled: true },
  ];

  return (
    <>
      {/* Invisible desktop layer for right-click / deselect */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 1 }}
        onClick={() => { setSelected(null); setCtx(null); }}
        onContextMenu={e => {
          e.preventDefault();
          setSelected(null);
          setCtx({ x: e.clientX, y: e.clientY, items: backgroundCtxItems });
        }}
      />

      {/* Desktop icons — top-right column. Macintosh HD pinned at the top
          (system fixture); VFS Desktop entries follow below it. Trash is
          intentionally NOT on the desktop — the Dock already carries it
          with the badge / context menu / drop-target affordances. */}
      <div
        className="absolute flex flex-col gap-1"
        style={{ top: 36, right: 8, zIndex: 10 }}
      >
        <DesktopIcon
          name={t("desktop.macintoshHd")}
          icon="mounted.webp"
          selected={selected === "hd"}
          onSelect={() => setSelected("hd")}
          onOpen={openFinder}
          onContextMenu={(x, y) => setCtx({ x, y, items: hdItems })}
        />

        {desktopFiles.map((e) => {
          const isDir = e.type === "dir";
          const ext = isDir ? "" : (e.name.split(".").pop() ?? "");
          const iconNode = isDir ? undefined : (
            <DocumentIcon ext={ext} tint={tintFor(ext)} />
          );
          const icon = isDir ? "folder.webp" : undefined;
          // "Show in Finder" opens a Finder window pointed at the parent dir
          // (Desktop) — matches the macOS Finder gesture. Without initialPath
          // we'd land at the default Downloads location.
          //
          // "Move to Trash" matches Finder's right-click affordance for parity —
          // without it, the only way to trash a desktop icon was to open Finder
          // first, navigate to Desktop, and trash from there.
          const fileItems: MenuItem[] = [
            { label: t("desktop.file.open"), action: () => openVfsItem(e.path, e.name, isDir) },
            { separator: true },
            {
              label: t("desktop.file.showInFinder"),
              action: () => onLaunchApp?.("finder", { initialPath: "/Users/guest/Desktop" }),
            },
            { separator: true },
            {
              label: t("finder.ctx.moveToTrash"),
              action: () => {
                if (!fs) return;
                fs.moveToTrash(e.path);
                if (selected === e.path) setSelected(null);
              },
            },
          ];
          return (
            <DesktopIcon
              key={e.path}
              name={e.name}
              icon={icon}
              iconNode={iconNode}
              selected={selected === e.path}
              onSelect={() => setSelected(e.path)}
              onOpen={() => openVfsItem(e.path, e.name, isDir)}
              onContextMenu={(x, y) => setCtx({ x, y, items: fileItems })}
            />
          );
        })}
      </div>

      {/* Context menu */}
      {ctx && <ContextMenu x={ctx.x} y={ctx.y} items={ctx.items} onClose={() => setCtx(null)} />}
    </>
  );
}

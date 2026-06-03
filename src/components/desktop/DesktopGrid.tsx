"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { ContextMenu, type MenuItem } from "@/components/shared/ContextMenu";
import { useT } from "@/contexts/SystemContext";

interface DesktopIconProps {
  name: string;
  icon: string;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu: (x: number, y: number) => void;
}

function DesktopIcon({ name, icon, selected, onSelect, onOpen, onContextMenu }: DesktopIconProps) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-lg cursor-default select-none"
      style={{ width: 80, padding: "6px 4px", backgroundColor: selected ? "rgba(255,255,255,0.12)" : "transparent" }}
      onClick={e => { e.stopPropagation(); onSelect(); }}
      onDoubleClick={onOpen}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onContextMenu(e.clientX, e.clientY); }}
    >
      <Image
        src={`/System/Icons/96x96/${icon}`}
        alt={name}
        width={52}
        height={52}
        draggable={false}
        className="drop-shadow-lg"
        style={{ width: 52, height: 52, filter: selected ? "brightness(0.8) saturate(1.2)" : undefined }}
      />
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

export function DesktopGrid({ onLaunchApp }: { onLaunchApp?: (appId: string) => void }) {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const [ctx, setCtx] = useState<CtxState | null>(null);

  const openFinder = useCallback(() => onLaunchApp?.("finder"), [onLaunchApp]);

  const desktopItems: MenuItem[] = [
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

  const trashItems: MenuItem[] = [
    { label: t("desktop.trash.open"), action: openFinder },
    { separator: true },
    { label: t("desktop.trash.empty"), action: () => {}, shortcut: "⇧⌘⌫", disabled: true },
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
          setCtx({ x: e.clientX, y: e.clientY, items: desktopItems });
        }}
      />

      {/* Desktop icons — top-right */}
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
        <DesktopIcon
          name={t("desktop.trash")}
          icon="trash.webp"
          selected={selected === "trash"}
          onSelect={() => setSelected("trash")}
          onOpen={openFinder}
          onContextMenu={(x, y) => setCtx({ x, y, items: trashItems })}
        />
      </div>

      {/* Context menu */}
      {ctx && <ContextMenu x={ctx.x} y={ctx.y} items={ctx.items} onClose={() => setCtx(null)} />}
    </>
  );
}

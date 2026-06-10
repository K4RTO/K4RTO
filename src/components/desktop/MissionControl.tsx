"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { dockAppItems } from "@/components/dock/Dock";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useT } from "@/contexts/SystemContext";
import { withBase } from "@/lib/paths";

interface MissionControlProps {
  onClose: () => void;
}

/**
 * macOS Mission Control — full-screen overlay that lays every open window
 * out as scaled-down tiles in a responsive grid. Click a tile to focus that
 * window (and dismiss the overlay).
 *
 * Triggers: F3 (Desktop handler opens it; this component handles closing
 * via F3, Esc, backdrop click, or tile click).
 *
 * We don't render real Window previews — they'd require either a heavy
 * html-to-image library or an off-screen DOM dance. Instead each tile is a
 * styled card with the app icon, the window title, and a stub of macOS
 * window chrome (traffic lights + title bar). Good enough to communicate
 * "this is window N of M" without the engineering cost.
 */
export function MissionControl({ onClose }: MissionControlProps) {
  const t = useT();
  const { state, dispatch, focusWindow } = useWindowManager();
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Stash onClose in a ref so the close-key effect doesn't need to depend on
  // it (parent passes a fresh arrow each render, but the action is stable).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Trigger enter animation one frame after mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const beginClose = useCallback(() => {
    setClosing((wasClosing) => {
      if (wasClosing) return wasClosing;
      // Match the longest CSS transition (0.26s) + small buffer.
      setTimeout(() => onCloseRef.current(), 280);
      return true;
    });
  }, []);

  // ESC and F3 both dismiss.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "F3") {
        e.preventDefault();
        beginClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [beginClose]);

  // Pull every non-minimized window. Minimized windows live in the dock —
  // surfacing them here would confuse the "see what's open at a glance" goal.
  // Sort by zIndex DESCENDING so the most-recently-focused window lands in
  // the top-left tile — matches the reading order users expect for
  // "important things first".
  const visibleWindows = useMemo(() => {
    return Array.from(state.windows.values())
      .filter((w) => w.status !== "minimized")
      .sort((a, b) => b.zIndex - a.zIndex);
  }, [state.windows]);

  // Pick a grid column count based on how many windows are open. Real
  // Mission Control packs by aspect ratio — this is a good-enough heuristic.
  const cols = useMemo(() => {
    const n = visibleWindows.length;
    if (n <= 1) return 1;
    if (n <= 4) return 2;
    if (n <= 9) return 3;
    return 4;
  }, [visibleWindows.length]);

  const dockLookup = useMemo(() => {
    return new Map(dockAppItems.map((item) => [item.appId, item]));
  }, []);

  function pickWindow(id: string) {
    const w = state.windows.get(id);
    if (w?.status === "minimized") {
      dispatch({ type: "RESTORE_WINDOW", id });
    }
    focusWindow(id);
    beginClose();
  }

  return (
    <div
      className="fixed inset-0"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) beginClose();
      }}
      style={{
        // Same zIndex tier as Launchpad — covers Dock + MenuBar but below
        // Spotlight, context menus, and the lock screen.
        zIndex: 10001,
        opacity: closing ? 0 : mounted ? 1 : 0,
        backdropFilter: closing ? "blur(0px)" : mounted ? "blur(26px) saturate(150%)" : "blur(0px)",
        WebkitBackdropFilter: closing ? "blur(0px)" : mounted ? "blur(26px) saturate(150%)" : "blur(0px)",
        background: "rgba(0,0,0,0.20)",
        transition:
          "opacity 0.24s cubic-bezier(0.4, 0, 0.2, 1), backdrop-filter 0.24s cubic-bezier(0.4, 0, 0.2, 1), -webkit-backdrop-filter 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Top label */}
      <div
        className="absolute left-1/2 select-none"
        style={{
          top: 44,
          transform: `translateX(-50%) scale(${closing ? 0.92 : mounted ? 1 : 0.92})`,
          opacity: closing ? 0 : mounted ? 0.85 : 0,
          color: "white",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.04em",
          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          transition:
            "opacity 0.24s cubic-bezier(0.4, 0, 0.2, 1), transform 0.24s cubic-bezier(0.32, 0.72, 0, 1.0)",
          pointerEvents: "none",
        }}
      >
        {visibleWindows.length === 0
          ? t("missionControl.empty")
          : visibleWindows.length === 1
            ? t("missionControl.countOne")
            : t("missionControl.count", { n: String(visibleWindows.length) })}
      </div>

      {/* Tile grid */}
      <div
        className="absolute"
        style={{
          top: 100,
          left: 80,
          right: 80,
          bottom: 80,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 32,
          alignContent: "start",
          justifyItems: "center",
          opacity: closing ? 0 : mounted ? 1 : 0,
          transform: `scale(${closing ? 1.04 : mounted ? 1 : 0.94})`,
          transformOrigin: "center top",
          transition:
            "opacity 0.26s cubic-bezier(0.4, 0, 0.2, 1), transform 0.26s cubic-bezier(0.32, 0.72, 0, 1.0)",
        }}
      >
        {visibleWindows.map((w) => {
          const def = dockLookup.get(w.appId);
          return (
            <WindowTile
              key={w.id}
              title={w.title}
              icon={def?.icon ?? null}
              svgIcon={def?.svgIcon ?? null}
              onClick={() => pickWindow(w.id)}
            />
          );
        })}

        {visibleWindows.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              color: "rgba(255,255,255,0.55)",
              fontSize: 14,
              padding: "120px 0",
            }}
          >
            {t("missionControl.emptyHint")}
          </div>
        )}
      </div>
    </div>
  );
}

interface WindowTileProps {
  title: string;
  icon: string | null;
  svgIcon: React.ReactNode | null;
  onClick: () => void;
}

function WindowTile({ title, icon, svgIcon, onClick }: WindowTileProps) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex flex-col items-stretch cursor-pointer outline-none"
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        width: "100%",
        maxWidth: 360,
      }}
      title={title}
    >
      {/* Stylized window chrome */}
      <div
        className="glass-surface"
        style={{
          width: "100%",
          height: 220,
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
          transition: "transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1.04)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 18px 48px rgba(0,0,0,0.55)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 36px rgba(0,0,0,0.45)";
        }}
      >
        {/* Title bar with traffic lights */}
        <div
          className="flex items-center gap-2 px-3 flex-shrink-0"
          style={{
            height: 28,
            background: "rgba(255,255,255,0.10)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
          <span
            className="truncate"
            style={{
              flex: 1,
              textAlign: "center",
              color: "rgba(255,255,255,0.85)",
              fontSize: 11,
              fontWeight: 500,
              paddingRight: 30,  // offset for the traffic lights cluster width
            }}
          >
            {title}
          </span>
        </div>

        {/* Content area — centered app icon (poor-man's preview) */}
        <div
          className="flex items-center justify-center flex-1"
          style={{ padding: 24 }}
        >
          {icon ? (
            <Image
              src={withBase(`/System/Icons/96x96/${icon}`)}
              alt=""
              width={84}
              height={84}
              unoptimized
              draggable={false}
              style={{ opacity: 0.92, filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.35))" }}
            />
          ) : svgIcon ? (
            <div
              className="flex items-center justify-center"
              style={{ width: 84, height: 84, color: "white", opacity: 0.92, filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.35))" }}
            >
              {svgIcon}
            </div>
          ) : null}
        </div>
      </div>

      {/* Title label under the tile (like macOS Mission Control window labels) */}
      <span
        className="select-none truncate"
        style={{
          marginTop: 10,
          color: "white",
          fontSize: 12,
          fontWeight: 500,
          textShadow: "0 1px 3px rgba(0,0,0,0.6)",
          maxWidth: 360,
        }}
      >
        {title}
      </span>
    </button>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useProcesses } from "@/contexts/ProcessContext";
import { useT } from "@/contexts/SystemContext";
import { getApp } from "@/apps/registry";
import type { WindowState } from "@/lib/window/types";

// --- Traffic Light Buttons ---
function TrafficLights({
  onClose,
  onMinimize,
  onMaximize,
}: {
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}) {
  return (
    <div className="flex items-center gap-2 group">
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="w-3 h-3 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "#FF5F57" }}
      >
        <svg viewBox="0 0 10 10" className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onMinimize(); }}
        className="w-3 h-3 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "#FFBD2E" }}
      >
        <svg viewBox="0 0 10 10" className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <path d="M2 5h6" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onMaximize(); }}
        className="w-3 h-3 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "#28C840" }}
      >
        <svg viewBox="0 0 10 10" className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <path d="M2 3.5l3-1.5 3 1.5M2 6.5l3 1.5 3-1.5" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

// --- Resize Handles ---
const HANDLE_STYLES: Record<string, React.CSSProperties> = {
  n:  { top: -3, left: 8, right: 8, height: 6, cursor: "ns-resize" },
  s:  { bottom: -3, left: 8, right: 8, height: 6, cursor: "ns-resize" },
  e:  { right: -3, top: 8, bottom: 8, width: 6, cursor: "ew-resize" },
  w:  { left: -3, top: 8, bottom: 8, width: 6, cursor: "ew-resize" },
  ne: { top: -3, right: -3, width: 12, height: 12, cursor: "nesw-resize" },
  nw: { top: -3, left: -3, width: 12, height: 12, cursor: "nwse-resize" },
  se: { bottom: -3, right: -3, width: 12, height: 12, cursor: "nwse-resize" },
  sw: { bottom: -3, left: -3, width: 12, height: 12, cursor: "nesw-resize" },
};

function ResizeHandles({
  windowId,
  windowState,
}: {
  windowId: string;
  windowState: WindowState;
}) {
  const { dispatch } = useWindowManager();

  const onResizeStart = useCallback(
    (direction: string, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startRect = { ...windowState.rect };

      const onPointerMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let { x, y, width, height } = startRect;

        if (direction.includes("e")) width = Math.max(windowState.minSize.width, startRect.width + dx);
        if (direction.includes("w")) {
          const newWidth = Math.max(windowState.minSize.width, startRect.width - dx);
          x = startRect.x + (startRect.width - newWidth);
          width = newWidth;
        }
        if (direction.includes("s")) height = Math.max(windowState.minSize.height, startRect.height + dy);
        if (direction.includes("n")) {
          const newHeight = Math.max(windowState.minSize.height, startRect.height - dy);
          y = startRect.y + (startRect.height - newHeight);
          height = newHeight;
        }

        dispatch({ type: "RESIZE_WINDOW", id: windowId, rect: { x, y, width, height } });
      };

      const onPointerUp = () => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    },
    [dispatch, windowId, windowState]
  );

  if (!windowState.resizable || windowState.status === "maximized") return null;

  return (
    <>
      {Object.entries(HANDLE_STYLES).map(([dir, style]) => (
        <div
          key={dir}
          className="absolute z-10"
          style={{ ...style, position: "absolute" }}
          onPointerDown={(e) => onResizeStart(dir, e)}
        />
      ))}
    </>
  );
}

// --- Main Window Component ---
export function Window({
  windowState,
  children,
}: {
  windowState: WindowState;
  children: ReactNode;
}) {
  const { dispatch, focusWindow, closeWindow } = useWindowManager();
  const { getProcessByWindowId, kill } = useProcesses();
  const t = useT();
  const titleBarRef = useRef<HTMLDivElement>(null);

  // Localize the title bar text. Apps that haven't customized their title
  // (Calculator, Settings, Clock, etc.) carry windowState.title === the
  // registry's English app.name; for those we substitute the dock i18n key
  // so the title bar matches the dock label. Apps that DID call SET_TITLE
  // with something dynamic (Preview "Resume.pdf (中)", VSCode filename,
  // Finder folder name) keep their explicit title untouched.
  const registryApp = getApp(windowState.appId);
  const isUntouchedTitle = registryApp ? windowState.title === registryApp.name : false;
  const displayTitle = isUntouchedTitle
    ? (t(`dock.${windowState.appId}`) || windowState.title)
    : windowState.title;
  const [isNew, setIsNew] = useState(true);
  const [isMinimizing, setIsMinimizing] = useState(false);
  // Close animation flag — when true, the window plays a fade+scale-down
  // before the parent actually unmounts it. Without this the close traffic
  // light just makes the window vanish instantly, which feels janky.
  const [isClosing, setIsClosing] = useState(false);

  // Open animation — spring-pop keyframe lives in globals.css. We let the
  // browser run the animation directly (instead of toggling inline transform)
  // so the bouncy overshoot reads correctly. 320ms covers the full pop.
  useEffect(() => {
    const timer = setTimeout(() => setIsNew(false), 320);
    return () => clearTimeout(timer);
  }, []);

  // Drag handling
  // Snap-zone state — drives the preview overlay while dragging near a screen
  // edge. Cleared on pointerup or when the cursor leaves all trigger zones.
  // Local to this window because only one window can be dragged at a time.
  type SnapZone = null | "max" | "left" | "right";
  const [snapZone, setSnapZone] = useState<SnapZone>(null);

  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      focusWindow(windowState.id);

      const startX = e.clientX;
      const startY = e.clientY;
      const startPos = { x: windowState.rect.x, y: windowState.rect.y };

      if (windowState.status === "maximized") {
        dispatch({ type: "RESTORE_WINDOW", id: windowState.id });
      }

      // Edge-trigger band: cursor within this many pixels of a screen edge
      // arms the corresponding snap zone. Real macOS uses ~5px; we lean a bit
      // wider so trackpad users without precise pointers can reliably hit it.
      const EDGE = 14;
      const MENU_BAR = 28;

      const onPointerMove = (ev: PointerEvent) => {
        const newX = startPos.x + (ev.clientX - startX);
        const newY = Math.max(MENU_BAR, startPos.y + (ev.clientY - startY));
        dispatch({ type: "MOVE_WINDOW", id: windowState.id, x: newX, y: newY });

        // Determine which snap zone (if any) the cursor is currently arming.
        // Top edge wins over left/right because dragging up-into-corner is
        // the most common "I want full screen" gesture.
        let zone: SnapZone = null;
        if (ev.clientY <= MENU_BAR + EDGE) zone = "max";
        else if (ev.clientX <= EDGE)              zone = "left";
        else if (ev.clientX >= window.innerWidth - EDGE) zone = "right";
        setSnapZone(zone);
      };

      const onPointerUp = (ev: PointerEvent) => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);

        // Apply whichever snap zone was armed at release. We re-evaluate from
        // the final cursor position rather than trusting setSnapZone — React
        // state updates are async so the latest move event might not have
        // committed yet.
        const dockReserve = 80;  // approximate dock height, mirrors MAXIMIZE_WINDOW reducer
        const w = window.innerWidth;
        const h = window.innerHeight;
        let finalZone: SnapZone = null;
        if (ev.clientY <= MENU_BAR + EDGE) finalZone = "max";
        else if (ev.clientX <= EDGE)              finalZone = "left";
        else if (ev.clientX >= w - EDGE)          finalZone = "right";

        if (finalZone === "max") {
          dispatch({ type: "MAXIMIZE_WINDOW", id: windowState.id });
        } else if (finalZone === "left") {
          dispatch({
            type: "RESIZE_WINDOW",
            id: windowState.id,
            rect: { x: 0, y: MENU_BAR, width: Math.floor(w / 2), height: h - MENU_BAR - dockReserve },
          });
        } else if (finalZone === "right") {
          const halfW = Math.floor(w / 2);
          dispatch({
            type: "RESIZE_WINDOW",
            id: windowState.id,
            rect: { x: w - halfW, y: MENU_BAR, width: halfW, height: h - MENU_BAR - dockReserve },
          });
        }
        setSnapZone(null);
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    },
    [dispatch, focusWindow, windowState]
  );

  // Race condition we guard against: the user can click the Dock icon to
  // restore the window during the 420ms minimize animation. The reducer will
  // set status back to "normal" mid-flight; if we then dispatched
  // MINIMIZE_WINDOW anyway, the window would re-minimize unexpectedly. We
  // sample the latest status via a ref at fire-time instead of trusting the
  // captured closure. These hooks MUST stay above the minimized early-return
  // below — hooks after a conditional return crash React with "Rendered fewer
  // hooks than expected" the moment the window actually minimizes.
  const statusRef = useRef(windowState.status);
  useEffect(() => { statusRef.current = windowState.status; }, [windowState.status]);

  // Already minimized and not in the process of animating → hide
  if (windowState.status === "minimized" && !isMinimizing) return null;

  const handleClose = () => {
    // Animate fade+scale-down first, THEN actually kill the process. The
    // 180ms matches the CSS transition below; without the delay the window
    // would unmount before users could see anything happen.
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      const proc = getProcessByWindowId(windowState.id);
      if (proc) {
        kill(proc.id);
      } else {
        closeWindow(windowState.id);
      }
    }, 180);
  };

  // Intercept minimize: play the genie animation first, then dispatch the
  // MINIMIZE_WINDOW state change so the window collapses to the dock with
  // the curved skew real macOS uses. (statusRef lives above the minimized
  // early-return — see comment there.)
  const handleMinimize = () => {
    if (isMinimizing) return;
    setIsMinimizing(true);
    setTimeout(() => {
      setIsMinimizing(false);
      // If something restored the window mid-animation, don't re-minimize.
      if (statusRef.current !== "minimized") {
        dispatch({ type: "MINIMIZE_WINDOW", id: windowState.id });
      }
    }, 420);
  };

  const handleMaximize = () => {
    if (windowState.status === "maximized") {
      dispatch({ type: "RESTORE_WINDOW", id: windowState.id });
    } else {
      dispatch({ type: "MAXIMIZE_WINDOW", id: windowState.id });
    }
  };

  // Compose animation state.
  //
  //   isMinimizing → use `genie-minimize` keyframe (curved skew → Dock)
  //   isNew        → use `spring-pop` keyframe (bouncy scale-in)
  //   isClosing    → inline transform/opacity transition (snappy fade-out)
  //   otherwise    → no animation, no inline transform
  //
  // Keyframes take precedence over inline transform when both are set, so
  // these states are kept mutually exclusive in practice (isClosing can't
  // overlap isNew because the user can't click close in the first frame).
  let animAnimation: string | undefined;
  let animTransform: string | undefined;
  let animOpacity: number | undefined;
  let animTransition: string | undefined;

  if (isMinimizing) {
    animAnimation = "genie-minimize 0.42s cubic-bezier(0.4, 0, 0.6, 1) both";
  } else if (isClosing) {
    animTransform = "scale(0.88)";
    animOpacity = 0;
    animTransition = "transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease";
  } else if (isNew) {
    animAnimation = "spring-pop var(--spring-duration-medium) var(--spring-bouncy) both";
  }

  return (
    <div
      className="absolute overflow-hidden window-glass-frame"
      style={{
        left: windowState.rect.x,
        top: windowState.rect.y,
        width: windowState.rect.width,
        height: windowState.rect.height,
        zIndex: windowState.zIndex,
        borderRadius: windowState.status === "maximized" ? 0 : 10,
        boxShadow: "0 28px 80px 6px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.10)",
        animation: animAnimation,
        transform: animTransform,
        opacity: animOpacity,
        transition: animTransition,
        // Bottom origin so spring-pop "rises from the dock" and genie sucks
        // straight down toward the dock — closer to real macOS visuals.
        transformOrigin: "center bottom",
      }}
      onPointerDown={() => focusWindow(windowState.id)}
    >
      {/* Title bar */}
      <div
        ref={titleBarRef}
        className="glass-surface glass-thin glass-liquid flex items-center h-[38px] select-none"
        style={{
          paddingLeft: 16,
          paddingRight: 16,
          borderRadius: 0,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          cursor: "default",
          // Preserve both inset highlights from .glass-surface; suppress outer shadow (we're inside a window)
          boxShadow: "inset 0 0.5px 0 var(--glass-highlight-top), inset 0 -0.5px 0 var(--glass-highlight-bottom)",
        }}
        onPointerDown={onDragStart}
      >
        <TrafficLights
          onClose={handleClose}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
        />
        <span className="flex-1 text-center text-[13px] font-medium truncate pointer-events-none"
          style={{ color: "rgba(255,255,255,0.85)" }}>
          {displayTitle}
        </span>
        <div className="w-[52px]" />
      </div>

      {/* Content area — transparent canvas; individual apps paint their own glass */}
      <div
        className="flex-1 overflow-auto"
        style={{
          backgroundColor: "rgba(18, 18, 22, 0.42)",
          backdropFilter: "blur(18px) saturate(150%)",
          WebkitBackdropFilter: "blur(18px) saturate(150%)",
          height: `calc(100% - 38px)`,
        }}
      >
        {children}
      </div>

      {/* Resize handles */}
      <ResizeHandles windowId={windowState.id} windowState={windowState} />

      {/* Snap-zone preview overlay — only shown during a drag when the cursor
          is in a snap trigger band. Rendered as a child of the window so it
          inherits this window's stacking context; uses `position: fixed` so
          its coordinates are viewport-relative regardless of the parent's
          transform. */}
      {snapZone && <SnapPreview zone={snapZone} />}
    </div>
  );
}

/** Translucent preview rectangle showing where a drag-snap will land. */
function SnapPreview({ zone }: { zone: "max" | "left" | "right" }) {
  const MENU_BAR = 28;
  const DOCK_RESERVE = 80;
  let style: React.CSSProperties = { left: 0, top: MENU_BAR };
  if (zone === "max") {
    style = { left: 0, top: MENU_BAR, width: "100vw", height: `calc(100vh - ${MENU_BAR + DOCK_RESERVE}px)` };
  } else if (zone === "left") {
    style = { left: 0, top: MENU_BAR, width: "50vw", height: `calc(100vh - ${MENU_BAR + DOCK_RESERVE}px)` };
  } else {
    style = { left: "50vw", top: MENU_BAR, width: "50vw", height: `calc(100vh - ${MENU_BAR + DOCK_RESERVE}px)` };
  }
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        zIndex: 99000,
        pointerEvents: "none",
        background: "rgba(96, 165, 250, 0.18)",
        border: "2px solid rgba(96, 165, 250, 0.55)",
        borderRadius: 12,
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        transition: "all 0.12s cubic-bezier(0.32, 0.72, 0, 1.0)",
        ...style,
      }}
    />
  );
}

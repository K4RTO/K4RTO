"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useProcesses } from "@/contexts/ProcessContext";
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
  const titleBarRef = useRef<HTMLDivElement>(null);
  const [isNew, setIsNew] = useState(true);
  const [isMinimizing, setIsMinimizing] = useState(false);

  // Open animation
  useEffect(() => {
    const timer = setTimeout(() => setIsNew(false), 50);
    return () => clearTimeout(timer);
  }, []);

  // Drag handling
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

      const onPointerMove = (ev: PointerEvent) => {
        const newX = startPos.x + (ev.clientX - startX);
        const newY = Math.max(28, startPos.y + (ev.clientY - startY));
        dispatch({ type: "MOVE_WINDOW", id: windowState.id, x: newX, y: newY });
      };

      const onPointerUp = () => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    },
    [dispatch, focusWindow, windowState]
  );

  // Already minimized and not in the process of animating → hide
  if (windowState.status === "minimized" && !isMinimizing) return null;

  const handleClose = () => {
    const proc = getProcessByWindowId(windowState.id);
    if (proc) {
      kill(proc.id);
    } else {
      closeWindow(windowState.id);
    }
  };

  // Intercept minimize: play animation first, then dispatch
  const handleMinimize = () => {
    setIsMinimizing(true);
    setTimeout(() => {
      setIsMinimizing(false);
      dispatch({ type: "MINIMIZE_WINDOW", id: windowState.id });
    }, 260);
  };

  const handleMaximize = () => {
    if (windowState.status === "maximized") {
      dispatch({ type: "RESTORE_WINDOW", id: windowState.id });
    } else {
      dispatch({ type: "MAXIMIZE_WINDOW", id: windowState.id });
    }
  };

  // Compose transform and opacity based on animation state
  const animTransform = isMinimizing
    ? "scale(0.1) translateY(400px)"
    : isNew ? "scale(0.95)" : "scale(1)";
  const animOpacity = (isMinimizing || isNew) ? 0 : 1;
  const animTransition = isMinimizing
    ? "transform 0.26s cubic-bezier(0.4,0,0.6,1), opacity 0.2s ease"
    : "transform 0.2s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease";

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: windowState.rect.x,
        top: windowState.rect.y,
        width: windowState.rect.width,
        height: windowState.rect.height,
        zIndex: windowState.zIndex,
        borderRadius: windowState.status === "maximized" ? 0 : 10,
        boxShadow: "0 28px 80px 6px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.08)",
        transform: animTransform,
        opacity: animOpacity,
        transition: animTransition,
        transformOrigin: "center bottom",
      }}
      onPointerDown={() => focusWindow(windowState.id)}
    >
      {/* Title bar */}
      <div
        ref={titleBarRef}
        className="glass-surface glass-thin flex items-center h-[38px] select-none"
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
          {windowState.title}
        </span>
        <div className="w-[52px]" />
      </div>

      {/* Content area — transparent canvas; individual apps paint their own glass */}
      <div
        className="flex-1 overflow-auto"
        style={{
          backgroundColor: "rgba(22, 22, 26, 0.55)",
          height: `calc(100% - 38px)`,
        }}
      >
        {children}
      </div>

      {/* Resize handles */}
      <ResizeHandles windowId={windowState.id} windowState={windowState} />
    </div>
  );
}

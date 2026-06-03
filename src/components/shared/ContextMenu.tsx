"use client";

import { useEffect, useRef } from "react";

export interface MenuItem {
  label?: string;
  action?: () => void;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Clamp position so menu doesn't go off-screen
  const clampedX = Math.min(x, window.innerWidth - 240);
  const clampedY = Math.min(y, window.innerHeight - items.length * 28 - 16);

  return (
    <div
      ref={ref}
      onContextMenu={e => e.preventDefault()}
      className="glass-surface glass-radius-popover"
      style={{
        position: "fixed",
        left: clampedX,
        top: clampedY,
        zIndex: 99999,
        minWidth: 220,
        padding: "4px 0",
        userSelect: "none",
      }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return (
            <div
              key={i}
              style={{ height: 1, backgroundColor: "rgba(255,255,255,0.09)", margin: "3px 8px" }}
            />
          );
        }
        return (
          <div
            key={i}
            onClick={() => { if (!item.disabled && item.action) { item.action(); onClose(); } }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "5px 14px",
              fontSize: 13,
              color: item.disabled ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.9)",
              cursor: item.disabled ? "default" : "pointer",
              borderRadius: 5,
              margin: "1px 4px",
              transition: "background-color 0.08s",
            }}
            onMouseEnter={e => {
              if (!item.disabled) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.12)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginLeft: 20 }}>
                {item.shortcut}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

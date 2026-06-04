"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { dockAppItems, type DockAppItem } from "@/components/dock/Dock";
import { useT } from "@/contexts/SystemContext";
import { withBase } from "@/lib/paths";

interface LaunchpadProps {
  /** Called when the user picks an app or asks to dismiss without picking. */
  onClose: () => void;
  onLaunchApp: (appId: string, meta?: Record<string, string>) => void;
}

/**
 * macOS Launchpad — full-screen overlay grid of every app, with a search box
 * up top. Open on F4 / Dock click; close on Esc, click-outside, or app launch.
 *
 * Layout: 6 columns × N rows, centered. With 13 apps that's 3 visible rows.
 *
 * Animation: scale-up + fade-in on open (~280ms), scale-down + fade-out on
 * close (~200ms). Uses an internal `closing` flag so we can run the exit
 * animation before unmounting from the parent.
 */
export function Launchpad({ onClose, onLaunchApp }: LaunchpadProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trigger enter animation one tick after mount so the `from` styles apply
  // first. Without this, the transition has nothing to animate from.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // onClose can be an inline arrow from the parent; stash it in a ref so the
  // ESC effect doesn't have to depend on it (and so beginClose stays stable
  // across re-renders).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const beginClose = useCallback(() => {
    setClosing((wasClosing) => {
      if (wasClosing) return wasClosing;  // already closing, ignore
      // Match the *longest* CSS transition duration (app grid is 0.28s) plus a
      // tiny buffer, so the exit animation never gets cut off by unmount.
      setTimeout(() => onCloseRef.current(), 300);
      return true;
    });
  }, []);

  // ESC closes; F4 also closes (so the open-via-F4 / close-via-F4 round-trip
  // uses this animated exit path instead of being unmounted instantly by the
  // Desktop-level toggle).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "F4") {
        e.preventDefault();
        beginClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [beginClose]);

  function pick(appId: string) {
    onLaunchApp(appId);
    beginClose();
  }

  const apps = useMemo<DockAppItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dockAppItems;
    return dockAppItems.filter((a) => {
      const localized = t(a.nameKey).toLowerCase();
      return localized.includes(q) || a.appId.includes(q);
    });
  }, [query, t]);

  return (
    <div
      className="fixed inset-0"
      // z-stack target (high → low): LoginScreen 100000, ContextMenu /
      // AboutThisMac 99999, Spotlight 99990, Launchpad 10001 (here),
      // MenuBar popup 10000, MenuBar bar 9999, Dock 9998. So Launchpad covers
      // Dock + MenuBar (matching real macOS full-screen Launchpad), but the
      // lock screen / Spotlight / context menus all still beat it.
      style={{
        zIndex: 10001,
        opacity: closing ? 0 : mounted ? 1 : 0,
        backdropFilter: closing ? "blur(0px)" : mounted ? "blur(28px) saturate(160%)" : "blur(0px)",
        WebkitBackdropFilter: closing ? "blur(0px)" : mounted ? "blur(28px) saturate(160%)" : "blur(0px)",
        background: "rgba(0, 0, 0, 0.18)",
        transition:
          "opacity 0.24s cubic-bezier(0.4, 0, 0.2, 1), backdrop-filter 0.24s cubic-bezier(0.4, 0, 0.2, 1), -webkit-backdrop-filter 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseDown={(e) => {
        // Click on the backdrop (not bubbled from an inner element) → close.
        if (e.target === e.currentTarget) beginClose();
      }}
    >
      {/* Search box at the top */}
      <div
        className="absolute left-1/2 flex items-center gap-2 px-4 select-none"
        style={{
          top: 64,
          transform: `translateX(-50%) scale(${closing ? 0.96 : mounted ? 1 : 0.96})`,
          width: 320,
          height: 40,
          borderRadius: 12,
          background: "rgba(255,255,255,0.16)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.20)",
          opacity: closing ? 0 : mounted ? 1 : 0,
          transition:
            "opacity 0.24s cubic-bezier(0.4, 0, 0.2, 1), transform 0.24s cubic-bezier(0.32, 0.72, 0, 1.0)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("launchpad.searchPlaceholder")}
          className="flex-1 bg-transparent outline-none border-none text-[14px]"
          style={{ color: "white", caretColor: "white" }}
          spellCheck={false}
          autoComplete="off"
          aria-label={t("launchpad.searchPlaceholder")}
        />
      </div>

      {/* App grid */}
      <div
        className="absolute inset-x-0 grid justify-center"
        style={{
          top: 140,
          gridTemplateColumns: "repeat(6, 120px)",
          gap: "28px 36px",
          justifyContent: "center",
          padding: "0 32px",
          transform: `scale(${closing ? 1.08 : mounted ? 1 : 0.92})`,
          opacity: closing ? 0 : mounted ? 1 : 0,
          transformOrigin: "center top",
          transition:
            "opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1), transform 0.28s cubic-bezier(0.32, 0.72, 0, 1.0)",
        }}
      >
        {apps.map((app) => (
          <LaunchpadIcon
            key={app.appId}
            app={app}
            label={t(app.nameKey)}
            onClick={() => pick(app.appId)}
          />
        ))}
        {apps.length === 0 && (
          <div
            className="col-span-6 text-center select-none"
            style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, padding: "60px 0" }}
          >
            {t("launchpad.noResults")}
          </div>
        )}
      </div>
    </div>
  );
}

interface LaunchpadIconProps {
  app: DockAppItem;
  label: string;
  onClick: () => void;
}

function LaunchpadIcon({ app, label, onClick }: LaunchpadIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 cursor-pointer outline-none"
      style={{ background: "transparent", border: "none", padding: 0 }}
      title={label}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 78,
          height: 78,
          borderRadius: 18,
          background: app.svgIcon
            ? "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)"
            : "transparent",
          border: app.svgIcon ? "1px solid rgba(255,255,255,0.10)" : "none",
          overflow: "hidden",
          // Subtle lift on hover — applied via inline style so we don't need
          // a separate stylesheet rule for this single component.
          transition: "transform 0.15s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
        }}
      >
        {app.icon ? (
          <Image
            src={withBase(`/System/Icons/96x96/${app.icon}`)}
            alt=""
            width={78}
            height={78}
            style={{ objectFit: "cover" }}
            draggable={false}
            unoptimized
          />
        ) : (
          <div
            className="flex items-center justify-center"
            style={{ width: 56, height: 56, color: "white" }}
          >
            {app.svgIcon}
          </div>
        )}
      </div>
      <span
        className="select-none"
        style={{
          color: "white",
          fontSize: 12,
          fontWeight: 500,
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          maxWidth: 100,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
    </button>
  );
}

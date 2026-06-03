"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getAllApps } from "@/apps/registry";
import { useT } from "@/contexts/SystemContext";

interface SpotlightResult {
  type: "app" | "suggestion";
  label: string;
  subtitle?: string;
  appId?: string;
}

const APP_ICONS: Record<string, string> = {
  finder: "🗂", terminal: "⌨", safari: "🧭", notes: "📝",
  textedit: "📄", settings: "⚙", calculator: "🔢", calendar: "📅",
};

// App name translation keys
const APP_NAME_KEYS: Record<string, string> = {
  finder: "dock.finder", safari: "dock.safari", notes: "dock.notes",
  textedit: "dock.textedit", terminal: "dock.terminal",
  calculator: "dock.calculator", calendar: "dock.calendar", settings: "dock.settings",
};

interface SpotlightProps {
  onClose: () => void;
  onLaunchApp: (appId: string) => void;
}

export function Spotlight({ onClose, onLaunchApp }: SpotlightProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results: SpotlightResult[] = [];

  if (query.trim()) {
    const q = query.toLowerCase();

    getAllApps().forEach(app => {
      const localizedName = APP_NAME_KEYS[app.id] ? t(APP_NAME_KEYS[app.id]) : app.name;
      if (localizedName.toLowerCase().includes(q) || app.name.toLowerCase().includes(q)) {
        results.push({
          type: "app",
          label: localizedName,
          subtitle: t("spotlight.application"),
          appId: app.id,
        });
      }
    });

    results.push({
      type: "suggestion",
      label: t("spotlight.searchWebFor", { q: query }),
      subtitle: t("spotlight.google"),
    });
  }

  const launch = useCallback((r: SpotlightResult) => {
    if (r.type === "app" && r.appId) {
      onLaunchApp(r.appId);
      onClose();
    } else if (r.type === "suggestion") {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
      onClose();
    }
  }, [query, onLaunchApp, onClose]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) launch(results[selected]);
  }

  return (
    <div
      className="fixed inset-0 flex items-start justify-center"
      style={{ zIndex: 99990, backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", paddingTop: "18vh" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-surface glass-thick glass-shadow-lg glass-radius-popover"
        style={{
          width: 640,
          overflow: "hidden",
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5" style={{ height: 58 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={onKeyDown}
            placeholder={t("spotlight.placeholder")}
            className="flex-1 bg-transparent outline-none border-none text-[18px]"
            style={{ color: "rgba(255,255,255,0.9)", caretColor: "#0058d0" }}
            spellCheck={false}
            autoComplete="off"
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ color: "rgba(255,255,255,0.3)", fontSize: 18, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", maxHeight: 360, overflowY: "auto" }}>
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 cursor-default"
                style={{
                  height: 48,
                  backgroundColor: i === selected ? "rgba(0,88,208,0.9)" : "transparent",
                }}
                onMouseEnter={() => setSelected(i)}
                onMouseDown={() => launch(r)}
              >
                <div className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 28, height: 28, fontSize: 18 }}>
                  {r.type === "app"
                    ? (APP_ICONS[r.appId ?? ""] ?? "📦")
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  }
                </div>
                <div className="flex flex-col">
                  <span style={{ color: i === selected ? "white" : "rgba(255,255,255,0.85)", fontSize: 14 }}>
                    {r.label}
                  </span>
                  {r.subtitle && (
                    <span style={{ color: i === selected ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)", fontSize: 11 }}>
                      {r.subtitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

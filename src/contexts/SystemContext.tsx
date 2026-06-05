"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import translations from "@/lib/i18n/translations";

// ── Types ──────────────────────────────────────────────────────────────

export type Lang = "en" | "zh";
export type Theme = "light" | "dark" | "auto";
export type SidebarSize = "small" | "medium" | "large";

export interface SystemState {
  lang: Lang;
  theme: Theme;
  accent: string;
  wallpaper: string;
  sidebarSize: SidebarSize;
}

interface SystemContextValue extends SystemState {
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  setAccent: (c: string) => void;
  setWallpaper: (w: string) => void;
  setSidebarSize: (s: SidebarSize) => void;
  /** Resolved theme: 'light' | 'dark' (resolves 'auto' against prefers-color-scheme) */
  resolvedTheme: "light" | "dark";
}

const SystemContext = createContext<SystemContextValue | null>(null);

// ── Defaults & persistence ─────────────────────────────────────────────

const LS_KEY = "system_state_v1";

const DEFAULTS: SystemState = {
  lang: "en",
  theme: "dark",                       // ← Default dark per Phase 1 plan
  accent: "#0058d0",                   // ← Default macOS blue
  wallpaper: "monterey-dark",          // ← Default procedural wallpaper variant
  sidebarSize: "medium",
};

// Whitelists — tampered localStorage values (DevTools / extensions) for these
// enums would otherwise leak into document.dataset and produce undefined CSS state.
const VALID_LANGS = new Set<string>(["en", "zh"]);
const VALID_THEMES = new Set<string>(["light", "dark", "auto"]);
const VALID_SIDEBAR_SIZES = new Set<string>(["small", "medium", "large"]);
// Wallpaper id is loosely typed (palette keys live in Wallpaper.tsx) — Wallpaper
// itself falls back to the default palette on unknown id, so no strict check here.

function sanitize(parsed: Partial<SystemState>): Partial<SystemState> {
  const out: Partial<SystemState> = { ...parsed };
  if (out.lang        && !VALID_LANGS.has(out.lang))               delete out.lang;
  if (out.theme       && !VALID_THEMES.has(out.theme))             delete out.theme;
  if (out.sidebarSize && !VALID_SIDEBAR_SIZES.has(out.sidebarSize)) delete out.sidebarSize;
  if (out.accent      && typeof out.accent !== "string")            delete out.accent;
  if (out.wallpaper   && typeof out.wallpaper !== "string")         delete out.wallpaper;
  return out;
}

/** Pick a default UI language from the user's browser/system locale on the
 *  very first visit. After the user chooses a language manually (Settings
 *  toggle) it persists to localStorage and the auto-detect no longer runs. */
function detectInitialLang(): Lang {
  if (typeof navigator === "undefined") return DEFAULTS.lang;
  const nav = navigator.language || (navigator.languages && navigator.languages[0]) || "";
  // BCP 47: "zh", "zh-CN", "zh-Hans-CN", "zh-TW" — all start with "zh".
  // Everything else falls back to English (broadest fit for "rest of world").
  return /^zh\b/i.test(nav) ? "zh" : "en";
}

function loadFromStorage(): SystemState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      // First visit — seed lang from the browser locale so a Chinese-system
      // user sees Chinese UI without having to find the toggle.
      return { ...DEFAULTS, lang: detectInitialLang() };
    }
    const parsed = JSON.parse(raw) as Partial<SystemState>;
    // Merge with defaults so a missing or invalid key falls back instead of crashing
    return { ...DEFAULTS, ...sanitize(parsed) };
  } catch {
    return { ...DEFAULTS, lang: detectInitialLang() };
  }
}

function saveToStorage(state: SystemState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch { /* quota / serialize failure is non-fatal */ }
}

// ── Theme application — write to document so CSS variables flip globally ─

function resolveAutoTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme: Theme): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  const resolved = theme === "auto" ? resolveAutoTheme() : theme;
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

function applyAccent(accent: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--accent", accent);
}

// ── Provider ───────────────────────────────────────────────────────────

export function SystemProvider({ children }: { children: ReactNode }) {
  // Initialize from storage (SSR returns defaults; client hydrates the same defaults
  // because the inline script in layout.tsx already applied them to <html>).
  const [state, setState] = useState<SystemState>(() => DEFAULTS);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [hydrated, setHydrated] = useState(false);

  // After mount, hydrate from localStorage and apply to document
  useEffect(() => {
    const loaded = loadFromStorage();
    setState(loaded);
    setResolvedTheme(applyTheme(loaded.theme));
    applyAccent(loaded.accent);
    setHydrated(true);
  }, []);

  // Persist whenever state changes (after hydration so we don't write defaults on mount)
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(state);
  }, [state, hydrated]);

  // Re-apply when theme changes (handles auto → light/dark)
  useEffect(() => {
    if (!hydrated) return;
    setResolvedTheme(applyTheme(state.theme));
  }, [state.theme, hydrated]);

  // Re-apply when accent changes
  useEffect(() => {
    if (!hydrated) return;
    applyAccent(state.accent);
  }, [state.accent, hydrated]);

  // Listen for OS color-scheme changes (only matters in 'auto' mode)
  useEffect(() => {
    if (state.theme !== "auto") return;
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setResolvedTheme(applyTheme("auto"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [state.theme]);

  // Memoized setters — each preserves the rest of state
  const setLang        = useCallback((lang: Lang)        => setState(s => ({ ...s, lang })), []);
  const setTheme       = useCallback((theme: Theme)      => setState(s => ({ ...s, theme })), []);
  const setAccent      = useCallback((accent: string)    => setState(s => ({ ...s, accent })), []);
  const setWallpaper   = useCallback((wallpaper: string) => setState(s => ({ ...s, wallpaper })), []);
  const setSidebarSize = useCallback((sidebarSize: SidebarSize) => setState(s => ({ ...s, sidebarSize })), []);

  return (
    <SystemContext.Provider
      value={{
        ...state,
        setLang,
        setTheme,
        setAccent,
        setWallpaper,
        setSidebarSize,
        resolvedTheme,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────

export function useSystem() {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error("useSystem must be used within SystemProvider");
  return ctx;
}

export function useT() {
  const { lang } = useSystem();
  return useCallback((key: string, vars?: Record<string, string>): string => {
    const entry = translations[key];
    if (!entry) return key;
    const text = entry[lang] ?? entry.en ?? key;
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (_: string, k: string) => vars[k] ?? "");
  }, [lang]);
}

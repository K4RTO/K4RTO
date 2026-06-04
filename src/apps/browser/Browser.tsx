"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useT } from "@/contexts/SystemContext";
import { useAppMenuListener } from "@/lib/menubar/appMenu";

// ── Constants ──────────────────────────────────────────────────────────────

interface Bookmark {
  id: string;
  label: string;
  url: string;
  embeddable: boolean;
  tint?: string;
}

// Personal links — open in new tab. These power portfolio conversion.
const PERSONAL_BOOKMARKS: Bookmark[] = [
  { id: "github",   label: "GitHub",   url: "https://github.com/K4RTO",                embeddable: false, tint: "#24292e" },
  { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/in/K4RTO/",      embeddable: false, tint: "#0A66C2" },
  { id: "mail",     label: "Email",    url: "mailto:k4rtol@163.com",                   embeddable: false, tint: "#FF3B30" },
  { id: "spotify",  label: "Spotify",  url: "https://open.spotify.com/playlist/1koxgvj1npSj4a97JY91Y2", embeddable: false, tint: "#1DB954" },
];

// General bookmarks. Bing is the default search and renders cleanly in iframe.
const GENERAL_BOOKMARKS: Bookmark[] = [
  { id: "bing",      label: "Bing",            url: "https://www.bing.com",                     embeddable: true,  tint: "#008373" },
  { id: "wikipedia", label: "Wikipedia",       url: "https://en.wikipedia.org/wiki/Main_Page", embeddable: false, tint: "#000" },
  { id: "mdn",       label: "MDN",             url: "https://developer.mozilla.org",            embeddable: false, tint: "#000" },
  { id: "devto",     label: "dev.to",          url: "https://dev.to",                           embeddable: false, tint: "#0a0a0a" },
  { id: "archive",   label: "Internet Archive",url: "https://archive.org",                      embeddable: false, tint: "#000" },
  { id: "hn",        label: "Hacker News",     url: "https://news.ycombinator.com",             embeddable: false, tint: "#ff6600" },
];

// Domains known to block iframe embedding (X-Frame-Options: DENY or CSP frame-ancestors).
// When proxy is enabled, these are still tried via proxy. When proxy is disabled, we
// short-circuit to the fallback card.
const KNOWN_BLOCKED_DOMAINS = new Set([
  "github.com", "www.github.com",
  "linkedin.com", "www.linkedin.com",
  "twitter.com", "www.twitter.com", "x.com",
  "facebook.com", "www.facebook.com",
  "instagram.com", "www.instagram.com",
  "google.com", "www.google.com",
  "amazon.com", "www.amazon.com",
  "reddit.com", "www.reddit.com",
  "developer.mozilla.org",
  "dev.to",
  "news.ycombinator.com",
]);

const LS_HISTORY = "browser_history_v1";
const EMBED_TIMEOUT_MS = 5000;
const HISTORY_LIMIT = 100;
const MAX_TABS = 12;

const PROXY_URL: string = process.env.NEXT_PUBLIC_PROXY_URL ?? "";
const PROXY_ENABLED: boolean = Boolean(PROXY_URL);

function viaProxy(target: string): string {
  if (!PROXY_ENABLED || !target) return target;
  if (target.startsWith(PROXY_URL)) return target;
  if (target.startsWith("mailto:")) return target;
  try {
    const u = new URL(target);
    if (u.pathname.startsWith("/embed/")) return target;
    if (u.hostname === "player.vimeo.com") return target;
  } catch { /* ignore */ }
  return `${PROXY_URL}/?url=${encodeURIComponent(target)}`;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function hostOf(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

function isBlocked(url: string): boolean {
  return KNOWN_BLOCKED_DOMAINS.has(hostOf(url));
}

function faviconUrl(url: string, size = 64): string {
  const h = hostOf(url);
  if (!h) return "";
  return `https://www.google.com/s2/favicons?domain=${h}&sz=${size}`;
}

const ALLOWED_SCHEMES = new Set(["http:", "https:", "mailto:", "ftp:"]);

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase() + ":";
    if (ALLOWED_SCHEMES.has(scheme)) return trimmed;
    return `https://www.bing.com/search?q=${encodeURIComponent(trimmed)}`;
  }
  if (trimmed.includes(".") && !trimmed.includes(" ")) return "https://" + trimmed;
  // Default search engine: Bing (embeds cleanly in iframe, unlike Google).
  return `https://www.bing.com/search?q=${encodeURIComponent(trimmed)}`;
}

function rewriteForEmbed(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // Google has both XFO and JS frame-busting. Even with proxy, JS jumps out.
    // Redirect search queries to Bing (embeds cleanly) and homepages to Bing too.
    if (host === "google.com" || host === "google.co.uk" || host.endsWith(".google.com")) {
      const q = u.searchParams.get("q");
      if (q) return `https://www.bing.com/search?q=${encodeURIComponent(q)}`;
      return "https://www.bing.com/";
    }

    if (host === "open.spotify.com" && /^\/(playlist|track|album|episode|show)\//.test(u.pathname)) {
      if (!u.pathname.startsWith("/embed/")) {
        u.pathname = "/embed" + u.pathname;
        return u.toString();
      }
    }

    if ((host === "youtube.com" || host === "youtu.be") && u.pathname === "/watch") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (host === "youtu.be" && u.pathname.length > 1) {
      return `https://www.youtube.com/embed${u.pathname}`;
    }

    if (host === "vimeo.com" && /^\/\d+$/.test(u.pathname)) {
      return `https://player.vimeo.com/video${u.pathname}`;
    }
  } catch { /* malformed URL */ }
  return url;
}

function isJsFrameBuster(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "google.com" || host.endsWith(".google.com")
      || host === "facebook.com" || host.endsWith(".facebook.com")
      || host === "twitter.com" || host === "x.com";
  } catch {
    return false;
  }
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

function saveJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* */ }
}

function trackEvent(name: string, payload?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[analytics:stub]", name, payload ?? {});
  }
}

let tabIdSeq = 0;
function makeTabId(): string {
  tabIdSeq += 1;
  return `t${tabIdSeq}_${Date.now().toString(36)}`;
}

// ── Icons ──────────────────────────────────────────────────────────────────

function BackIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>; }
function ForwardIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>; }
function ReloadIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>; }
function HomeIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function ShareIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>; }
function ReaderIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>; }
function LockIcon()    { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function ExternalIcon(){ return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>; }
function ShieldIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function CloseIcon()   { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function PlusIcon()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }

// ── Favicon image ──────────────────────────────────────────────────────────

function FaviconImage({ url, size, tint, label }: { url: string; size: number; tint?: string; label: string }) {
  const host = hostOf(url);
  const [failed, setFailed] = useState(false);
  const useFallback = !host || failed;

  if (useFallback) {
    return (
      <div
        className="flex items-center justify-center text-white font-semibold"
        style={{
          width: size,
          height: size,
          borderRadius: size >= 32 ? 10 : 4,
          backgroundColor: tint ?? "#666",
          fontSize: size * 0.5,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {(label[0] ?? "?").toUpperCase()}
      </div>
    );
  }
  // Small (≤24px) — no background plate; larger — use rounded plate so light favicons stay readable.
  const isLarge = size >= 32;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={faviconUrl(url, Math.max(64, size * 2))}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{
        borderRadius: isLarge ? 10 : 3,
        backgroundColor: isLarge ? "rgba(255,255,255,0.94)" : "transparent",
        padding: isLarge ? 6 : 0,
        flexShrink: 0,
        objectFit: "contain",
      }}
    />
  );
}

// ── Start Page ─────────────────────────────────────────────────────────────

interface StartPageProps {
  onNavigate: (url: string) => void;
  recents: string[];
  onClearHistory: () => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

function StartPage({ onNavigate, recents, onClearHistory, t }: StartPageProps) {
  const sectionTitle: React.CSSProperties = {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 16,
  };

  const handleClick = (bm: Bookmark) => {
    trackEvent("browser_bookmark_clicked", { id: bm.id });
    if (bm.url.startsWith("mailto:")) {
      window.open(bm.url, "_blank", "noopener");
      trackEvent("browser_external_open", { id: bm.id, source: "mailto" });
      return;
    }
    onNavigate(bm.url);
  };

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ padding: "48px 64px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: "rgba(255,255,255,0.92)", letterSpacing: "-0.02em" }}>
          {t("browser.startTitle")}
        </div>
        {PROXY_ENABLED && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "rgba(52,199,89,0.12)", border: "0.5px solid rgba(52,199,89,0.3)", fontSize: 11, color: "#34c759", fontWeight: 600 }}
            title={t("browser.proxy.tooltip")}
          >
            <ShieldIcon /> {t("browser.proxy.enabled")}
          </div>
        )}
      </div>

      {/* Favorites */}
      <div style={sectionTitle}>{t("browser.favorites")}</div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))", marginBottom: 44 }}>
        {PERSONAL_BOOKMARKS.map(bm => (
          <button
            key={bm.id}
            onClick={() => handleClick(bm)}
            className="flex flex-col items-center gap-2.5 p-4 rounded-2xl"
            style={{
              backgroundColor: "rgba(255,255,255,0.035)",
              border: "0.5px solid rgba(255,255,255,0.06)",
              transition: "transform 0.18s var(--spring-snappy), background-color 0.18s ease, border-color 0.18s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.035)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
            }}
            aria-label={`Open ${bm.label}`}
          >
            <FaviconImage url={bm.url} size={44} tint={bm.tint} label={bm.label} />
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 500, letterSpacing: "-0.005em" }}>
              {bm.label}
            </div>
          </button>
        ))}
      </div>

      {/* Frequently Visited */}
      <div style={sectionTitle}>{t("browser.frequentlyVisited")}</div>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", marginBottom: 44 }}>
        {GENERAL_BOOKMARKS.map(bm => (
          <button
            key={bm.id}
            onClick={() => handleClick(bm)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{
              backgroundColor: "rgba(255,255,255,0.035)",
              border: "0.5px solid rgba(255,255,255,0.06)",
              textAlign: "left",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.035)"; }}
            aria-label={`Open ${bm.label}`}
          >
            <FaviconImage url={bm.url} size={20} tint={bm.tint} label={bm.label} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bm.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hostOf(bm.url)}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Recents from history */}
      {recents.length > 0 ? (
        <>
          <div style={{ ...sectionTitle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>{t("browser.history")}</span>
            <button
              onClick={onClearHistory}
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.55)",
                textTransform: "none",
                letterSpacing: 0,
                fontWeight: 500,
                padding: "3px 10px",
                borderRadius: 6,
                backgroundColor: "rgba(255,255,255,0.06)",
              }}
              aria-label={t("browser.clearHistory")}
            >
              {t("browser.clearHistory")}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 32 }}>
            {recents.slice(0, 5).map((u, i) => (
              <button
                key={`${u}-${i}`}
                onClick={() => onNavigate(u)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded text-left"
                style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, transition: "background-color 0.12s ease" }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <FaviconImage url={u} size={14} label={hostOf(u)} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={sectionTitle}>{t("browser.history")}</div>
          <div style={{ marginBottom: 32, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            {t("browser.noHistory")}
          </div>
        </>
      )}

      {/* Privacy Report */}
      <div style={sectionTitle}>{t("browser.privacyReport")}</div>
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: "rgba(255,255,255,0.035)", border: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        <span style={{ color: "#34c759" }}><ShieldIcon /></span>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
          {t("browser.trackerCount", { n: "0" })}
        </div>
      </div>

      <div style={{ height: 48 }} />
    </div>
  );
}

// ── External Preview Card ──────────────────────────────────────────────────

function ExternalPreviewCard({ url, t, reason }: { url: string; t: (k: string, v?: Record<string, string>) => string; reason: "blocked" | "timeout" }) {
  const host = hostOf(url);
  const isUnfixable = isJsFrameBuster(url);

  const title = isUnfixable
    ? t("browser.unfixableTitle", { host })
    : reason === "blocked"
      ? t("browser.embedBlocked")
      : t("browser.timeoutTitle");
  const desc = isUnfixable
    ? t("browser.unfixableDesc", { host })
    : reason === "blocked"
      ? t("browser.embedBlockedDesc", { host })
      : t("browser.timeoutDesc");

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "#1c1c1e" }}>
      <div className="flex flex-col items-center text-center" style={{ maxWidth: 460, padding: 36 }}>
        <div style={{ marginBottom: 18 }}>
          <FaviconImage url={url} size={64} label={host || "?"} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: 8, letterSpacing: "-0.01em" }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.55, marginBottom: 24 }}>
          {desc}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 18, wordBreak: "break-all" }}>{url}</div>
        <button
          onClick={() => {
            window.open(url, "_blank", "noopener");
            trackEvent("browser_external_open", { host, source: "fallback_card", reason: isUnfixable ? "js_framebuster" : reason });
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "#0058d0", color: "white" }}
          aria-label={`Open ${host} in new tab`}
        >
          <ExternalIcon />
          {t("browser.openExternal")}
        </button>
        {isUnfixable && host.includes("google") && (
          <div style={{ marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            {t("browser.googleTip")}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab state ──────────────────────────────────────────────────────────────

interface Tab {
  id: string;
  hist: string[];
  histIdx: number;
}

function newEmptyTab(): Tab {
  return { id: makeTabId(), hist: [], histIdx: -1 };
}

// ── Main Component ─────────────────────────────────────────────────────────

type Mode = "start" | "loading" | "embedded" | "blocked" | "timeout";

export default function Browser(_props: AppComponentProps) {
  const t = useT();
  const [tabs, setTabs] = useState<Tab[]>(() => [newEmptyTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [inputUrl, setInputUrl] = useState("");
  const [globalHistory, setGlobalHistory] = useState<string[]>(() => loadJSON<string[]>(LS_HISTORY, []));
  const [mode, setMode] = useState<Mode>("start");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTab = tabs.find(tab => tab.id === activeTabId) ?? tabs[0];
  const url = activeTab.histIdx >= 0 ? activeTab.hist[activeTab.histIdx] ?? "" : "";

  // Persist global history (shared across all tabs)
  useEffect(() => {
    saveJSON(LS_HISTORY, globalHistory.slice(-HISTORY_LIMIT));
  }, [globalHistory]);

  // Clear pending timeout on unmount
  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  // Sync input box with active tab URL
  useEffect(() => { setInputUrl(url); }, [url]);

  // Decide embed mode on URL change (also fires when switching tabs)
  useEffect(() => {
    if (!url) { setMode("start"); return; }
    if (!PROXY_ENABLED && isBlocked(url)) {
      setMode("blocked");
      return;
    }
    setMode("loading");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setMode(prev => prev === "loading" ? "timeout" : prev);
    }, EMBED_TIMEOUT_MS);
  }, [url]);

  // ── Tab operations ─────────────────────────────────────────────────────

  const updateActiveTab = useCallback((updater: (tab: Tab) => Tab) => {
    setTabs(prev => prev.map(tab => tab.id === activeTabId ? updater(tab) : tab));
  }, [activeTabId]);

  const addTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) return;
    const t = newEmptyTab();
    setTabs(prev => [...prev, t]);
    setActiveTabId(t.id);
    trackEvent("browser_tab_added");
  }, [tabs.length]);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(tab => tab.id === id);
      if (idx < 0) return prev;
      if (prev.length === 1) {
        // Last tab — replace with a fresh empty tab and switch to it
        const fresh = newEmptyTab();
        setActiveTabId(fresh.id);
        return [fresh];
      }
      const next = prev.filter(tab => tab.id !== id);
      // If we closed the active tab, switch to the previous one (or first)
      if (id === activeTabId) {
        const newActive = next[Math.max(0, idx - 1)];
        setActiveTabId(newActive.id);
      }
      return next;
    });
    trackEvent("browser_tab_closed");
  }, [activeTabId]);

  const switchTab = useCallback((id: string) => {
    if (id === activeTabId) return;
    setActiveTabId(id);
    trackEvent("browser_tab_switched");
  }, [activeTabId]);

  // ── Navigation (operates on the active tab) ────────────────────────────

  const navigate = useCallback((target: string) => {
    const normalized = normalizeUrl(target);
    if (!normalized) return;
    if (normalized.startsWith("mailto:")) {
      window.open(normalized, "_blank", "noopener");
      trackEvent("browser_external_open", { source: "address_bar_mailto" });
      return;
    }
    const u = rewriteForEmbed(normalized);
    updateActiveTab(tab => {
      const trimmed = tab.histIdx < 0 ? [] : tab.hist.slice(0, tab.histIdx + 1);
      const nextHist = [...trimmed, u].slice(-HISTORY_LIMIT);
      return { ...tab, hist: nextHist, histIdx: nextHist.length - 1 };
    });
    setGlobalHistory(g => {
      const filtered = g.filter(item => item !== u);
      return [...filtered, u].slice(-HISTORY_LIMIT);
    });
    trackEvent("browser_navigate", { host: hostOf(u), rewritten: u !== normalized });
  }, [updateActiveTab]);

  const goBack = useCallback(() => {
    updateActiveTab(tab => tab.histIdx > 0 ? { ...tab, histIdx: tab.histIdx - 1 } : tab);
  }, [updateActiveTab]);

  const goForward = useCallback(() => {
    updateActiveTab(tab => tab.histIdx < tab.hist.length - 1 ? { ...tab, histIdx: tab.histIdx + 1 } : tab);
  }, [updateActiveTab]);

  const goHome = useCallback(() => {
    updateActiveTab(tab => ({ ...tab, histIdx: -1 }));
    setInputUrl("");
  }, [updateActiveTab]);

  const refresh = useCallback(() => {
    if (!iframeRef.current || !url) return;
    setMode("loading");
    iframeRef.current.src = viaProxy(url) || "about:blank";
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setMode(prev => prev === "loading" ? "timeout" : prev);
    }, EMBED_TIMEOUT_MS);
  }, [url]);

  const openCurrentExternal = useCallback(() => {
    if (!url) return;
    window.open(url, "_blank", "noopener");
    trackEvent("browser_external_open", { host: hostOf(url), source: "address_bar" });
  }, [url]);

  const clearHistory = useCallback(() => {
    setGlobalHistory([]);
    saveJSON(LS_HISTORY, []);
    trackEvent("browser_history_cleared");
  }, []);

  const handleIframeLoad = useCallback(() => {
    const ifr = iframeRef.current;
    if (!ifr || !url) return;
    let isBlankOrSameOrigin = false;
    try {
      const href = ifr.contentWindow?.location.href;
      if (!href || href === "about:blank") isBlankOrSameOrigin = true;
    } catch {
      setMode("embedded");
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      return;
    }
    if (isBlankOrSameOrigin) {
      setMode("blocked");
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    } else {
      setMode("embedded");
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    }
  }, [url]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ⌘T new tab
      if (e.metaKey && (e.key === "t" || e.key === "T") && !e.shiftKey) {
        e.preventDefault();
        addTab();
        return;
      }
      // ⌘W close current tab (still leaves window open if last tab; OS handles ⌘Q)
      if (e.metaKey && (e.key === "w" || e.key === "W") && !e.shiftKey) {
        e.preventDefault();
        closeTab(activeTabId);
        return;
      }
      // ⌘R reload
      if (e.metaKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        refresh();
        return;
      }
      // ⌘L focus address bar
      if (e.metaKey && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        (document.querySelector('[aria-label="Address bar"]') as HTMLInputElement | null)?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addTab, closeTab, refresh, activeTabId]);

  // ── MenuBar integration ───────────────────────────────────────────────

  useAppMenuListener("safari", (detail) => {
    switch (detail.type) {
      case "new-window":
      case "new-tab":           addTab(); break;
      case "close-tab":         closeTab(activeTabId); break;
      case "reload":            refresh(); break;
      case "go-home":           goHome(); break;
      case "focus-address":
        (document.querySelector('[aria-label="Address bar"]') as HTMLInputElement | null)?.focus();
        break;
      case "find":
        // Browser has no in-page search; focus address bar as the closest analog
        (document.querySelector('[aria-label="Address bar"]') as HTMLInputElement | null)?.focus();
        break;
    }
  });

  // ── Recents derived from global history ────────────────────────────────

  const recents = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (let i = globalHistory.length - 1; i >= 0 && out.length < 10; i--) {
      const h = globalHistory[i];
      if (!seen.has(h)) { seen.add(h); out.push(h); }
    }
    return out;
  }, [globalHistory]);

  // ── Tab label (URL host or "New Tab") ──────────────────────────────────

  const tabLabel = (tab: Tab): string => {
    const u = tab.histIdx >= 0 ? tab.hist[tab.histIdx] ?? "" : "";
    if (!u) return t("browser.untitled");
    const h = hostOf(u);
    return h || u.slice(0, 24);
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const canGoBack = activeTab.histIdx > 0;
  const canGoForward = activeTab.histIdx >= 0 && activeTab.histIdx < activeTab.hist.length - 1;
  const isHttps = url.startsWith("https://");

  const navBtnStyle = (enabled: boolean): React.CSSProperties => ({
    color: enabled ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.22)",
    transition: "background-color 0.12s ease, color 0.12s ease",
  });

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#1c1c1e", color: "rgba(255,255,255,0.85)" }}>
      {/* ── Tab bar ───────────────────────────────────────────────────── */}
      <div
        className="glass-surface glass-thin flex items-center gap-1 pl-2 pr-1 flex-shrink-0 overflow-x-auto"
        style={{
          height: 36,
          borderRadius: 0,
          boxShadow: "inset 0 0.5px 0 var(--glass-highlight-top), inset 0 -0.5px 0 rgba(255,255,255,0.04)",
        }}
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const u = tab.histIdx >= 0 ? tab.hist[tab.histIdx] ?? "" : "";
          const label = tabLabel(tab);
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className="group flex items-center gap-2 pl-2.5 pr-1 h-7 flex-shrink-0 rounded-md"
              style={{
                minWidth: 110,
                maxWidth: 180,
                backgroundColor: isActive ? "rgba(255,255,255,0.10)" : "transparent",
                border: isActive ? "0.5px solid rgba(255,255,255,0.10)" : "0.5px solid transparent",
                transition: "background-color 0.12s ease, border-color 0.12s ease",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
              title={u || label}
            >
              {u
                ? <FaviconImage url={u} size={14} label={label} />
                : <div style={{ width: 14, height: 14, flexShrink: 0 }} />}
              <span style={{
                fontSize: 12,
                color: isActive ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.6)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                textAlign: "left",
                letterSpacing: "-0.005em",
              }}>{label}</span>
              <span
                role="button"
                onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                className="w-4 h-4 flex items-center justify-center rounded-sm flex-shrink-0"
                style={{
                  color: "rgba(255,255,255,0.55)",
                  opacity: tabs.length > 1 ? 1 : 0,
                  transition: "background-color 0.1s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                aria-label={t("browser.closeTab")}
              >
                <CloseIcon />
              </span>
            </button>
          );
        })}
        <button
          onClick={addTab}
          disabled={tabs.length >= MAX_TABS}
          className="w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 ml-0.5"
          style={{ color: "rgba(255,255,255,0.55)", transition: "background-color 0.1s ease" }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
          title={t("browser.newTab")}
          aria-label={t("browser.newTab")}
        >
          <PlusIcon />
        </button>
        <div className="flex-1" />
      </div>

      {/* ── Chrome bar ────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-1.5 px-3 flex-shrink-0"
        style={{
          height: 46,
          backgroundColor: "rgba(0,0,0,0.15)",
          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Back / Forward / Reload / Home */}
        <div className="flex items-center gap-0.5">
          {[
            { icon: <BackIcon />,    fn: goBack,    enabled: canGoBack,    label: t("browser.back") },
            { icon: <ForwardIcon />, fn: goForward, enabled: canGoForward, label: t("browser.forward") },
            { icon: <ReloadIcon />,  fn: refresh,   enabled: mode !== "start", label: t("browser.reload") },
            { icon: <HomeIcon />,    fn: goHome,    enabled: true, label: t("browser.home") },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.fn}
              disabled={!btn.enabled}
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={navBtnStyle(btn.enabled)}
              onMouseEnter={e => { if (btn.enabled) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
              title={btn.label}
              aria-label={btn.label}
            >
              {btn.icon}
            </button>
          ))}
        </div>

        {/* Address bar (pill) */}
        <form
          className="flex-1 flex justify-center"
          onSubmit={e => { e.preventDefault(); if (inputUrl) navigate(inputUrl); }}
        >
          <div
            className="flex items-center gap-2 px-3.5 h-8 rounded-full w-full"
            style={{
              backgroundColor: "rgba(255,255,255,0.07)",
              maxWidth: 720,
              border: "0.5px solid rgba(255,255,255,0.06)",
              transition: "background-color 0.15s ease, border-color 0.15s ease",
            }}
          >
            {isHttps && <span style={{ color: "rgba(255,255,255,0.45)", flexShrink: 0, display: "flex" }}><LockIcon /></span>}
            <input
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              placeholder={t("browser.placeholder")}
              className="flex-1 outline-none bg-transparent text-[13px]"
              style={{ color: "rgba(255,255,255,0.92)", border: "none", minWidth: 0, letterSpacing: "-0.005em" }}
              aria-label="Address bar"
            />
            {url && (
              <button type="button" onClick={openCurrentExternal}
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                style={{ color: "rgba(255,255,255,0.5)" }}
                title={t("browser.openExternal")} aria-label={t("browser.openExternal")}>
                <ExternalIcon />
              </button>
            )}
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-0.5">
          <button
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ color: "rgba(255,255,255,0.35)" }}
            title={t("browser.readerNotAvailable")} aria-label={t("browser.readerMode")} disabled
          ><ReaderIcon /></button>
          <button
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ color: "rgba(255,255,255,0.35)" }}
            title={t("browser.share")} aria-label={t("browser.share")} disabled
          ><ShareIcon /></button>
        </div>
      </div>

      {/* ── Bookmarks bar ────────────────────────────────────────────── */}
      {mode !== "start" && (
        <div
          className="flex items-center gap-0.5 px-3 flex-shrink-0 overflow-x-auto"
          style={{
            height: 30,
            backgroundColor: "rgba(0,0,0,0.20)",
            borderBottom: "0.5px solid rgba(255,255,255,0.04)",
          }}
        >
          {[...PERSONAL_BOOKMARKS, ...GENERAL_BOOKMARKS].slice(0, 9).map(bm => (
            <button
              key={bm.id}
              onClick={() => {
                trackEvent("browser_bookmark_clicked", { id: bm.id, source: "bookmarks_bar" });
                if (bm.url.startsWith("mailto:")) {
                  window.open(bm.url, "_blank", "noopener");
                  trackEvent("browser_external_open", { id: bm.id, source: "mailto" });
                  return;
                }
                navigate(bm.url);
              }}
              className="flex items-center gap-1.5 px-2 h-6 rounded-md flex-shrink-0"
              style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, transition: "background-color 0.12s ease" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
              title={bm.url}
            >
              <FaviconImage url={bm.url} size={14} tint={bm.tint} label={bm.label} />
              <span>{bm.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Content area ─────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: "#fff" }}>
        {mode === "start" ? (
          <div className="absolute inset-0" style={{ backgroundColor: "#1c1c1e" }}>
            <StartPage onNavigate={navigate} recents={recents} onClearHistory={clearHistory} t={t} />
          </div>
        ) : (
          <>
            {/* Single iframe; key combines activeTabId + url so tab switches reset it. */}
            <iframe
              key={`${activeTabId}::${url}`}
              ref={iframeRef}
              src={viaProxy(url) || "about:blank"}
              className="w-full h-full"
              style={{ border: "none", backgroundColor: "white" }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              onLoad={handleIframeLoad}
              title="Web content"
            />

            {mode === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "#1c1c1e", pointerEvents: "none" }}>
                <div className="w-6 h-6 rounded-full border-2 animate-spin"
                  style={{ borderColor: "rgba(255,255,255,0.18)", borderTopColor: "#0a84ff" }} />
              </div>
            )}

            {(mode === "blocked" || mode === "timeout") && url && (
              <ExternalPreviewCard url={url} t={t} reason={mode === "blocked" ? "blocked" : "timeout"} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

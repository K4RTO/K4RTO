"use client";

import { useState } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useSystem, useT } from "@/contexts/SystemContext";
import { WALLPAPER_PRESETS } from "@/components/desktop/Wallpaper";

const ACCENT_COLOR_KEYS = [
  { color: "#0058d0", labelKey: "color.blue" },
  { color: "#9b59b6", labelKey: "color.purple" },
  { color: "#e91e8c", labelKey: "color.pink" },
  { color: "#ff3b30", labelKey: "color.red" },
  { color: "#ff9500", labelKey: "color.orange" },
  { color: "#ffcc00", labelKey: "color.yellow" },
  { color: "#28c840", labelKey: "color.green" },
  { color: "#8e8e93", labelKey: "color.graphite" },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)} className="relative cursor-pointer flex-shrink-0"
      style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: on ? "#28c840" : "rgba(255,255,255,0.2)", transition: "background-color 0.2s" }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "white", position: "absolute", top: 2, left: on ? 18 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  const dim = { color: "rgba(255,255,255,0.4)" };
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div>
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 14 }}>{label}</div>
        {desc && <div style={{ ...dim, fontSize: 12, marginTop: 2 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function AppearancePane() {
  const t = useT();
  const sys = useSystem();
  // Local-only cosmetic options (no global side-effect — kept as local state)
  const [wallpaperTint, setWallpaperTint] = useState(true);
  const [scrollBars, setScrollBars] = useState<"auto" | "scrolling" | "always">("auto");
  const dim = { color: "rgba(255,255,255,0.4)" };
  const section = (key: string) => (
    <div className="px-4 pt-4 pb-1" style={{ ...dim, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t(key)}</div>
  );

  const modeKeys: Array<{ id: "light" | "dark" | "auto"; labelKey: string }> = [
    { id: "light", labelKey: "appearance.light" },
    { id: "dark",  labelKey: "appearance.dark" },
    { id: "auto",  labelKey: "appearance.auto" },
  ];

  const sizeKeys: Array<{ id: "small" | "medium" | "large"; labelKey: string }> = [
    { id: "small",  labelKey: "appearance.small" },
    { id: "medium", labelKey: "appearance.medium" },
    { id: "large",  labelKey: "appearance.large" },
  ];

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#1c1c1e" }}>
      {section("appearance.section.appearance")}
      <div className="mx-4 rounded-xl overflow-hidden mb-2" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
          {modeKeys.map((m, i) => (
            <button key={m.id} onClick={() => sys.setTheme(m.id)} className="flex-1 flex flex-col items-center gap-2 py-4"
              style={{ borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none", outline: sys.theme === m.id ? "2px solid #0058d0" : "2px solid transparent", outlineOffset: -2, borderRadius: m.id === "light" ? "10px 0 0 10px" : m.id === "auto" ? "0 10px 10px 0" : undefined }}>
              <div className="rounded-lg overflow-hidden" style={{ width: 52, height: 36, background: m.id === "light" ? "#f5f5f5" : m.id === "dark" ? "#1c1c1e" : "linear-gradient(135deg, #f5f5f5 50%, #1c1c1e 50%)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ height: 10, backgroundColor: m.id === "light" ? "#e8e8e8" : m.id === "dark" ? "#2c2c2e" : undefined }} />
              </div>
              <span style={{ ...dim, fontSize: 12 }}>{t(m.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {section("appearance.section.accentColor")}
      <div className="mx-4 rounded-xl px-4 py-3 mb-2 flex items-center gap-2 flex-wrap" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {ACCENT_COLOR_KEYS.map(a => (
          <button key={a.color} onClick={() => sys.setAccent(a.color)} title={t(a.labelKey)}
            style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: a.color, border: sys.accent === a.color ? "3px solid white" : "3px solid transparent", outline: sys.accent === a.color ? "2px solid " + a.color : "none", transition: "border 0.1s" }} />
        ))}
      </div>

      {section("appearance.section.sidebarSize")}
      <div className="mx-4 rounded-xl overflow-hidden mb-2" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
          {sizeKeys.map((s, i) => (
            <button key={s.id} onClick={() => sys.setSidebarSize(s.id)} className="flex-1 py-2 text-sm"
              style={{ color: sys.sidebarSize === s.id ? "white" : "rgba(255,255,255,0.4)", backgroundColor: sys.sidebarSize === s.id ? "rgba(255,255,255,0.12)" : "transparent", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none", fontSize: 13 }}>
              {t(s.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {section("appearance.section.options")}
      <div className="mx-4 rounded-xl overflow-hidden mb-2" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        <Row label={t("appearance.wallpaperTint")}>
          <Toggle on={wallpaperTint} onChange={setWallpaperTint} />
        </Row>
        <Row label={t("appearance.showScrollBars")}>
          <select value={scrollBars} onChange={e => setScrollBars(e.target.value as typeof scrollBars)}
            className="outline-none rounded px-2 py-1 text-sm" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <option value="auto">{t("appearance.automatically")}</option>
            <option value="scrolling">{t("appearance.whenScrolling")}</option>
            <option value="always">{t("appearance.always")}</option>
          </select>
        </Row>
      </div>
    </div>
  );
}

// ── Wallpaper pane ──────────────────────────────────────────────────────

function WallpaperPane() {
  const t = useT();
  const sys = useSystem();
  const dim = { color: "rgba(255,255,255,0.4)" };
  const section = (key: string) => (
    <div className="px-4 pt-4 pb-1" style={{ ...dim, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t(key)}</div>
  );

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#1c1c1e" }}>
      {section("wallpaper.section.preset")}
      <div className="px-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", marginBottom: 16 }}>
        {WALLPAPER_PRESETS.map(p => {
          const isActive = sys.wallpaper === p.id;
          return (
            <button
              key={p.id}
              onClick={() => sys.setWallpaper(p.id)}
              className="flex flex-col items-stretch gap-2 p-2 rounded-xl"
              style={{
                backgroundColor: isActive ? "var(--accent-soft)" : "rgba(255,255,255,0.04)",
                border: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                transition: "background-color 0.15s ease, border-color 0.15s ease",
              }}
              aria-pressed={isActive}
              aria-label={t(p.labelKey)}
            >
              <div
                style={{
                  height: 88,
                  borderRadius: 8,
                  background: p.swatch,
                  boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 -0.5px 0 rgba(0,0,0,0.20)",
                }}
              />
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 500, textAlign: "center" }}>
                {t(p.labelKey)}
              </div>
            </button>
          );
        })}
      </div>
      <div className="px-4 pb-4" style={{ ...dim, fontSize: 11, lineHeight: 1.5 }}>
        {t("wallpaper.note")}
      </div>
    </div>
  );
}

const W = { stroke: "white", fill: "none", strokeWidth: "1.8", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const PANE_ICONS: Record<string, React.ReactNode> = {
  appearance: <svg width="14" height="14" viewBox="0 0 24 24" {...W}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  wifi:       <svg width="14" height="14" viewBox="0 0 24 24" {...W}><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="white" stroke="none"/></svg>,
  bluetooth:  <svg width="14" height="14" viewBox="0 0 24 24" {...W}><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/></svg>,
  notif:      <svg width="14" height="14" viewBox="0 0 24 24" {...W}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  sound:      <svg width="14" height="14" viewBox="0 0 24 24" {...W}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="rgba(255,255,255,0.25)"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>,
  displays:   <svg width="14" height="14" viewBox="0 0 24 24" {...W}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  battery:    <svg width="14" height="14" viewBox="0 0 24 24" {...W}><rect x="1" y="6" width="18" height="12" rx="2"/><path d="M23 13v-2"/><path d="M5 10v4M9 10v4"/></svg>,
  keyboard:   <svg width="14" height="14" viewBox="0 0 24 24" {...W}><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12"/></svg>,
  mouse:      <svg width="14" height="14" viewBox="0 0 24 24" {...W}><rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v8"/></svg>,
  privacy:    <svg width="14" height="14" viewBox="0 0 24 24" {...W}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  desktop:    <svg width="14" height="14" viewBox="0 0 24 24" {...W}><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 19h20"/><circle cx="8" cy="19" r="1" fill="white" stroke="none"/><circle cx="12" cy="19" r="1" fill="white" stroke="none"/><circle cx="16" cy="19" r="1" fill="white" stroke="none"/></svg>,
  general:    <svg width="14" height="14" viewBox="0 0 24 24" {...W}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  wallpaper:  <svg width="14" height="14" viewBox="0 0 24 24" {...W}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="9" r="1.5" fill="white" stroke="none"/><path d="M21 16l-5-5L8 19"/></svg>,
};

export default function Settings(_props: AppComponentProps) {
  const t = useT();
  const [sel, setSel] = useState("appearance");
  const dim = { color: "rgba(255,255,255,0.4)" };

  const PANES = [
    { id: "appearance", labelKey: "settings.appearance", color: "#5856D6" },
    { id: "wallpaper",  labelKey: "settings.wallpaper",  color: "#34C759" },
    { id: "wifi",       labelKey: "settings.wifi",       color: "#007AFF" },
    { id: "bluetooth",  labelKey: "settings.bluetooth",  color: "#5856D6" },
    { id: "notif",      labelKey: "settings.notif",      color: "#FF3B30" },
    { id: "sound",      labelKey: "settings.sound",      color: "#FF2D55" },
    { id: "displays",   labelKey: "settings.displays",   color: "#5AC8FA" },
    { id: "battery",    labelKey: "settings.battery",    color: "#34C759" },
    { id: "keyboard",   labelKey: "settings.keyboard",   color: "#8E8E93" },
    { id: "mouse",      labelKey: "settings.mouse",      color: "#8E8E93" },
    { id: "privacy",    labelKey: "settings.privacy",    color: "#007AFF" },
    { id: "desktop",    labelKey: "settings.desktop",    color: "#007AFF" },
    { id: "general",    labelKey: "settings.general",    color: "#8E8E93" },
  ];

  const selPane = PANES.find(p => p.id === sel);

  return (
    <div className="flex h-full overflow-hidden" style={{ backgroundColor: "#1c1c1e", animation: "fadeIn 0.2s ease" }}>
      {/* Sidebar */}
      <div className="flex-shrink-0 overflow-y-auto" style={{ width: 220, backgroundColor: "#1c1c1e", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Search */}
        <div className="px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={dim}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <span style={{ ...dim, fontSize: 13 }}>{t("settings.search")}</span>
          </div>
        </div>

        {/* Profile */}
        <div className="flex items-center gap-3 px-4 py-3 mb-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}>G</div>
          <div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 600 }}>Guest</div>
            <div style={{ ...dim, fontSize: 11 }}>{t("settings.appleId")}</div>
          </div>
        </div>

        {/* Panes */}
        <div className="py-1">
          {PANES.map(p => (
            <button key={p.id} onClick={() => setSel(p.id)}
              className="w-full flex items-center gap-2.5 py-1.5 text-left rounded-lg mx-1"
              style={{ width: "calc(100% - 8px)", paddingLeft: 16, paddingRight: 10, backgroundColor: sel === p.id ? "rgba(255,255,255,0.1)" : "transparent", color: sel === p.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)", fontSize: 13 }}>
              <div className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: p.color }}>
                {PANE_ICONS[p.id]}
              </div>
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: "transparent" }}>
        <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <h1 style={{ color: "rgba(255,255,255,0.9)", fontSize: 22, fontWeight: 700 }}>
            {selPane ? t(selPane.labelKey) : "Settings"}
          </h1>
        </div>
        {sel === "appearance" ? (
          <AppearancePane />
        ) : sel === "wallpaper" ? (
          <WallpaperPane />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span style={{ ...dim, fontSize: 14 }}>
              {t("settings.comingSoon", { name: selPane ? t(selPane.labelKey) : sel })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

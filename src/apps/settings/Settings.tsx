"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useSystem, useT } from "@/contexts/SystemContext";
import { WALLPAPER_PRESETS } from "@/components/desktop/Wallpaper";

const ACCENT_COLOR_KEYS = [
  { color: "#007aff", labelKey: "color.blue" },
  { color: "#af52de", labelKey: "color.purple" },
  { color: "#ff2d8f", labelKey: "color.pink" },
  { color: "#ff453a", labelKey: "color.red" },
  { color: "#ff9f0a", labelKey: "color.orange" },
  { color: "#ffd60a", labelKey: "color.yellow" },
  { color: "#30d158", labelKey: "color.green" },
  { color: "#98989d", labelKey: "color.graphite" },
];

type PaneId =
  | "wifi" | "bluetooth" | "network" | "vpn" | "battery" | "general"
  | "accessibility" | "appearance" | "siri" | "desktop" | "displays"
  | "menubar" | "spotlight" | "wallpaper" | "notif" | "sound"
  | "focus" | "screenTime" | "lockScreen";

type Pane = {
  id: PaneId;
  labelKey: string;
  color: string;
  glyph: ReactNode;
  groupAfter?: boolean;
};

const dim: CSSProperties = { color: "rgba(255,255,255,0.58)" };
const cardStyle: CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.055)",
  border: "1px solid rgba(255,255,255,0.055)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.025)",
};

const W = {
  stroke: "white",
  fill: "none",
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Glyph({ children }: { children: ReactNode }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" {...W}>{children}</svg>;
}

const glyphs = {
  wifi: <Glyph><path d="M5 12.5a10.5 10.5 0 0 1 14 0" /><path d="M2 9a15 15 0 0 1 20 0" /><path d="M8.5 16a5.5 5.5 0 0 1 7 0" /><circle cx="12" cy="20" r="1.4" fill="white" stroke="none" /></Glyph>,
  bluetooth: <Glyph><path d="M7 7l10 10-5 5V2l5 5L7 17" /></Glyph>,
  network: <Glyph><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18" /><path d="M12 3a14 14 0 0 0 0 18" /></Glyph>,
  vpn: <Glyph><path d="M4 18h16" /><path d="M12 2v16" /><path d="M6 8a6 6 0 0 1 12 0" /><path d="M8 13h8" /></Glyph>,
  battery: <Glyph><rect x="2" y="7" width="17" height="10" rx="2" /><path d="M22 12v1" /><path d="M6 11h7" /></Glyph>,
  general: <Glyph><circle cx="12" cy="12" r="3" /><path d="M19 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L13.7 2h-4l-.3 3a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 3l-2 1.5 2 3.5 2.4-1A8 8 0 0 0 9.4 19l.3 3h4l.3-3a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5Z" /></Glyph>,
  accessibility: <Glyph><circle cx="12" cy="5" r="2" /><path d="M4 10h16" /><path d="M12 8v12" /><path d="M8 14l-3 6" /><path d="M16 14l3 6" /></Glyph>,
  appearance: <Glyph><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18Z" fill="rgba(0,0,0,0.42)" /></Glyph>,
  siri: <Glyph><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" /><circle cx="12" cy="12" r="4" /></Glyph>,
  desktop: <Glyph><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M7 20h10M12 16v4" /></Glyph>,
  displays: <Glyph><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></Glyph>,
  menubar: <Glyph><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18" /><path d="M7 14h10" /></Glyph>,
  spotlight: <Glyph><circle cx="10.8" cy="10.8" r="6.3" /><path d="M16 16l4 4" /></Glyph>,
  wallpaper: <Glyph><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="9" r="1.5" fill="white" stroke="none" /><path d="M21 16l-5-5-8 8" /></Glyph>,
  notif: <Glyph><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M14 21a2.2 2.2 0 0 1-4 0" /></Glyph>,
  sound: <Glyph><path d="M11 5 6 9H3v6h3l5 4V5Z" fill="rgba(255,255,255,0.28)" /><path d="M15 9a4 4 0 0 1 0 6" /><path d="M18 6a8 8 0 0 1 0 12" /></Glyph>,
  focus: <Glyph><path d="M18 3a9 9 0 1 0 3 12.6 7 7 0 0 1-9.6-9.6A8.8 8.8 0 0 1 18 3Z" fill="rgba(255,255,255,0.25)" /></Glyph>,
  screenTime: <Glyph><path d="M12 6v6l4 2" /><circle cx="12" cy="12" r="9" /><path d="M7 2h10" /></Glyph>,
  lockScreen: <Glyph><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Glyph>,
};

function IconTile({ color, children, large = false }: { color: string; children: ReactNode; large?: boolean }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: large ? 76 : 30,
        height: large ? 76 : 30,
        borderRadius: large ? 20 : 8,
        background: color,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 5px rgba(0,0,0,0.22)",
      }}
    >
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className="relative flex-shrink-0"
      style={{
        width: 52,
        height: 30,
        borderRadius: 999,
        backgroundColor: on ? "#30d158" : "rgba(255,255,255,0.16)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
        transition: "background-color 0.18s ease",
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          backgroundColor: "#fff",
          position: "absolute",
          top: 2,
          left: on ? 24 : 2,
          transition: "left 0.18s ease",
          boxShadow: "0 1px 4px rgba(0,0,0,0.38)",
        }}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-1 pb-2" style={{ ...dim, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0 }}>
      {children}
    </div>
  );
}

function SettingsCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={"rounded-[22px] overflow-hidden " + className} style={cardStyle}>
      {children}
    </div>
  );
}

function Row({
  icon,
  label,
  desc,
  children,
  chevron = false,
}: {
  icon?: ReactNode;
  label: string;
  desc?: string;
  children?: ReactNode;
  chevron?: boolean;
}) {
  return (
    <div className="flex items-center min-h-[58px] px-4 gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      {icon}
      <div className="min-w-0 flex-1">
        <div style={{ color: "rgba(255,255,255,0.88)", fontSize: 16, fontWeight: 600, lineHeight: 1.25 }}>{label}</div>
        {desc && <div className="mt-1 truncate" style={{ ...dim, fontSize: 13 }}>{desc}</div>}
      </div>
      {children}
      {chevron && <span style={{ color: "rgba(255,255,255,0.32)", fontSize: 28, lineHeight: 1 }}>{">"}</span>}
    </div>
  );
}

function ContentFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#242426" }}>
      <div className="mx-auto px-8 pb-10" style={{ maxWidth: 860 }}>
        {children}
      </div>
    </div>
  );
}

function Toolbar() {
  return (
    <div className="h-[56px] flex items-center px-5 flex-shrink-0" style={{ backgroundColor: "#242426" }}>
      <div className="flex items-center rounded-full overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.035)" }}>
        {["<", ">"].map((arrow, i) => (
          <button
            key={arrow}
            type="button"
            className="flex items-center justify-center"
            style={{
              width: 42,
              height: 38,
              color: "rgba(255,255,255,0.36)",
              fontSize: 24,
              lineHeight: 1,
              borderLeft: i === 1 ? "1px solid rgba(255,255,255,0.09)" : "none",
            }}
            aria-label={arrow === "<" ? "Back" : "Forward"}
          >
            {arrow}
          </button>
        ))}
      </div>
    </div>
  );
}

function GeneralPane() {
  const t = useT();
  const rows = [
    [
      { label: t("settings.about"), icon: <IconTile color="linear-gradient(#b8bac2,#8d9098)">{glyphs.desktop}</IconTile> },
      { label: t("settings.softwareUpdate"), icon: <IconTile color="linear-gradient(#bec0c8,#8f929a)">{glyphs.general}</IconTile> },
      { label: t("settings.storage"), icon: <IconTile color="linear-gradient(#c4c5ca,#93959d)">{glyphs.battery}</IconTile> },
    ],
    [
      { label: t("settings.appleCare"), icon: <IconTile color="#f5f5f7"><span style={{ color: "#ff2d55", fontSize: 18, fontWeight: 900 }}>A</span></IconTile> },
    ],
    [
      { label: t("settings.airDrop"), icon: <IconTile color="linear-gradient(135deg,#f9fbff,#e7eefb)"><Glyph><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /></Glyph></IconTile> },
    ],
    [
      { label: t("settings.passwords"), icon: <IconTile color="linear-gradient(#b8bac2,#8d9098)">{glyphs.menubar}</IconTile> },
      { label: t("settings.dateTime"), icon: <IconTile color="#0a84ff">{glyphs.screenTime}</IconTile> },
      { label: t("settings.language"), icon: <IconTile color="#0a84ff">{glyphs.network}</IconTile> },
      { label: t("settings.loginItems"), icon: <IconTile color="linear-gradient(#b8bac2,#8d9098)"><Glyph><path d="M6 8h12M6 12h12M6 16h12" /></Glyph></IconTile> },
      { label: t("settings.sharing"), icon: <IconTile color="linear-gradient(#d0d2d8,#a5a8b1)">{glyphs.accessibility}</IconTile> },
      { label: t("settings.startupDisk"), icon: <IconTile color="linear-gradient(#c4c5ca,#93959d)">{glyphs.battery}</IconTile> },
      { label: t("settings.timeMachine"), icon: <IconTile color="#55c8b8"><Glyph><path d="M5 12a7 7 0 1 0 2-5" /><path d="M5 4v5h5" /><path d="M12 8v5l3 2" /></Glyph></IconTile> },
    ],
    [
      { label: t("settings.deviceManagement"), icon: <IconTile color="linear-gradient(#d0d2d8,#a5a8b1)"><Glyph><path d="M6 12l4 4 8-8" /></Glyph></IconTile> },
    ],
  ];

  return (
    <ContentFrame>
      <SettingsCard className="mt-0 mb-5">
        <div className="flex flex-col items-center text-center px-8 py-9">
          <IconTile color="linear-gradient(#bfc1c9,#8c8f98)" large>{glyphs.general}</IconTile>
          <h1 className="mt-5" style={{ color: "rgba(255,255,255,0.92)", fontSize: 30, lineHeight: 1.15, fontWeight: 800 }}>
            {t("settings.general")}
          </h1>
          <p className="mt-2" style={{ ...dim, maxWidth: 560, fontSize: 16, lineHeight: 1.45, fontWeight: 600 }}>
            {t("settings.generalSubtitle")}
          </p>
        </div>
      </SettingsCard>

      <div className="space-y-4">
        {rows.map((group, index) => (
          <SettingsCard key={index}>
            {group.map(item => (
              <Row key={item.label} icon={item.icon} label={item.label} chevron />
            ))}
          </SettingsCard>
        ))}
      </div>
    </ContentFrame>
  );
}

function AppearancePane() {
  const t = useT();
  const sys = useSystem();
  const [wallpaperTint, setWallpaperTint] = useState(true);
  const [scrollBars, setScrollBars] = useState<"auto" | "scrolling" | "always">("auto");

  const modeKeys: Array<{ id: "light" | "dark" | "auto"; labelKey: string }> = [
    { id: "light", labelKey: "appearance.light" },
    { id: "dark", labelKey: "appearance.dark" },
    { id: "auto", labelKey: "appearance.auto" },
  ];
  const sizeKeys: Array<{ id: "small" | "medium" | "large"; labelKey: string }> = [
    { id: "small", labelKey: "appearance.small" },
    { id: "medium", labelKey: "appearance.medium" },
    { id: "large", labelKey: "appearance.large" },
  ];

  return (
    <ContentFrame>
      <h1 className="pt-1 pb-4" style={{ color: "rgba(255,255,255,0.94)", fontSize: 30, fontWeight: 800 }}>{t("settings.appearance")}</h1>

      <SectionLabel>{t("appearance.section.appearance")}</SectionLabel>
      <SettingsCard className="mb-5">
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {modeKeys.map((m, i) => {
            const active = sys.theme === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => sys.setTheme(m.id)}
                className="flex flex-col items-center justify-center gap-3 py-6 min-h-[124px]"
                style={{
                  borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  boxShadow: active ? "inset 0 0 0 3px var(--accent)" : "none",
                  backgroundColor: active ? "rgba(255,255,255,0.025)" : "transparent",
                }}
              >
                <div
                  className="overflow-hidden"
                  style={{
                    width: 74,
                    height: 50,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: m.id === "light" ? "#f5f5f7" : m.id === "dark" ? "#1e1e20" : "linear-gradient(135deg,#f5f5f7 0 50%,#1e1e20 50% 100%)",
                  }}
                >
                  <div style={{ height: 14, backgroundColor: m.id === "light" ? "#e5e5ea" : m.id === "dark" ? "#2f2f32" : "rgba(255,255,255,0.2)" }} />
                </div>
                <span style={{ color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.48)", fontSize: 15, fontWeight: 600 }}>
                  {t(m.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SectionLabel>{t("appearance.section.accentColor")}</SectionLabel>
      <SettingsCard className="mb-5">
        <div className="flex items-center gap-4 px-5 py-4">
          {ACCENT_COLOR_KEYS.map(a => {
            const active = sys.accent.toLowerCase() === a.color.toLowerCase();
            return (
              <button
                key={a.color}
                type="button"
                onClick={() => sys.setAccent(a.color)}
                title={t(a.labelKey)}
                aria-label={t(a.labelKey)}
                className="flex items-center justify-center"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  backgroundColor: a.color,
                  border: active ? "4px solid #fff" : "4px solid transparent",
                  outline: active ? `3px solid ${a.color}` : "none",
                }}
              />
            );
          })}
        </div>
      </SettingsCard>

      <SectionLabel>{t("appearance.section.sidebarSize")}</SectionLabel>
      <SettingsCard className="mb-5">
        <div className="grid p-1" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {sizeKeys.map(s => {
            const active = sys.sidebarSize === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => sys.setSidebarSize(s.id)}
                className="h-9 rounded-[14px]"
                style={{ color: active ? "white" : "rgba(255,255,255,0.48)", backgroundColor: active ? "rgba(255,255,255,0.16)" : "transparent", fontSize: 15, fontWeight: 600 }}
              >
                {t(s.labelKey)}
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SectionLabel>{t("appearance.section.options")}</SectionLabel>
      <SettingsCard>
        <Row label={t("appearance.wallpaperTint")}><Toggle on={wallpaperTint} onChange={setWallpaperTint} /></Row>
        <Row label={t("appearance.showScrollBars")}>
          <select
            value={scrollBars}
            onChange={e => setScrollBars(e.target.value as typeof scrollBars)}
            className="outline-none rounded-[10px] px-3 h-9"
            style={{ backgroundColor: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.84)", border: "1px solid rgba(255,255,255,0.10)", fontSize: 15 }}
          >
            <option value="auto">{t("appearance.automatically")}</option>
            <option value="scrolling">{t("appearance.whenScrolling")}</option>
            <option value="always">{t("appearance.always")}</option>
          </select>
        </Row>
      </SettingsCard>
    </ContentFrame>
  );
}

function WallpaperPane() {
  const t = useT();
  const sys = useSystem();

  return (
    <ContentFrame>
      <h1 className="pt-1 pb-4" style={{ color: "rgba(255,255,255,0.94)", fontSize: 30, fontWeight: 800 }}>{t("settings.wallpaper")}</h1>
      <SectionLabel>{t("wallpaper.section.preset")}</SectionLabel>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {WALLPAPER_PRESETS.map(p => {
          const active = sys.wallpaper === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => sys.setWallpaper(p.id)}
              className="flex flex-col gap-3 p-3 rounded-[18px] text-left"
              style={{
                ...cardStyle,
                border: active ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,0.055)",
                backgroundColor: active ? "var(--accent-soft)" : "rgba(255,255,255,0.055)",
              }}
              aria-pressed={active}
            >
              <div style={{ height: 104, borderRadius: 13, background: p.swatch, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)" }} />
              <div style={{ color: "rgba(255,255,255,0.88)", fontSize: 15, fontWeight: 700 }}>{t(p.labelKey)}</div>
            </button>
          );
        })}
      </div>
      <p className="mt-5" style={{ ...dim, fontSize: 14 }}>{t("wallpaper.note")}</p>
    </ContentFrame>
  );
}

function PlaceholderPane({ pane }: { pane: Pane }) {
  const t = useT();
  return (
    <ContentFrame>
      <SettingsCard className="mt-0">
        <div className="flex flex-col items-center text-center px-8 py-10">
          <IconTile color={pane.color} large>{pane.glyph}</IconTile>
          <h1 className="mt-5" style={{ color: "rgba(255,255,255,0.92)", fontSize: 30, lineHeight: 1.15, fontWeight: 800 }}>
            {t(pane.labelKey)}
          </h1>
          <p className="mt-2" style={{ ...dim, maxWidth: 520, fontSize: 16, lineHeight: 1.45, fontWeight: 600 }}>
            {t("settings.comingSoon", { name: t(pane.labelKey) })}
          </p>
        </div>
      </SettingsCard>
    </ContentFrame>
  );
}

export default function Settings(_props: AppComponentProps) {
  const t = useT();
  const [sel, setSel] = useState<PaneId>("general");

  const panes: Pane[] = [
    { id: "wifi", labelKey: "settings.wifi", color: "#0a84ff", glyph: glyphs.wifi },
    { id: "bluetooth", labelKey: "settings.bluetooth", color: "#0a84ff", glyph: glyphs.bluetooth },
    { id: "network", labelKey: "settings.network", color: "#0a84ff", glyph: glyphs.network },
    { id: "vpn", labelKey: "settings.vpn", color: "#0a84ff", glyph: glyphs.vpn },
    { id: "battery", labelKey: "settings.battery", color: "#34c759", glyph: glyphs.battery, groupAfter: true },
    { id: "general", labelKey: "settings.general", color: "linear-gradient(#bfc1c9,#8c8f98)", glyph: glyphs.general },
    { id: "accessibility", labelKey: "settings.accessibility", color: "#0a84ff", glyph: glyphs.accessibility },
    { id: "appearance", labelKey: "settings.appearance", color: "linear-gradient(135deg,#111,#f7f7f7)", glyph: glyphs.appearance },
    { id: "siri", labelKey: "settings.siri", color: "conic-gradient(from 20deg,#ff375f,#af52de,#64d2ff,#30d158,#ff9f0a,#ff375f)", glyph: glyphs.siri },
    { id: "desktop", labelKey: "settings.desktop", color: "#111", glyph: glyphs.desktop },
    { id: "displays", labelKey: "settings.displays", color: "#0a84ff", glyph: glyphs.displays },
    { id: "menubar", labelKey: "settings.menuBar", color: "linear-gradient(#c4c5ca,#90939b)", glyph: glyphs.menubar },
    { id: "spotlight", labelKey: "settings.spotlight", color: "#0a84ff", glyph: glyphs.spotlight },
    { id: "wallpaper", labelKey: "settings.wallpaper", color: "#32d3e6", glyph: glyphs.wallpaper, groupAfter: true },
    { id: "notif", labelKey: "settings.notif", color: "#ff453a", glyph: glyphs.notif },
    { id: "sound", labelKey: "settings.sound", color: "#ff2d55", glyph: glyphs.sound },
    { id: "focus", labelKey: "settings.focus", color: "#5e5ce6", glyph: glyphs.focus },
    { id: "screenTime", labelKey: "settings.screenTime", color: "#5e5ce6", glyph: glyphs.screenTime, groupAfter: true },
    { id: "lockScreen", labelKey: "settings.lockScreen", color: "#111", glyph: glyphs.lockScreen },
  ];

  const selected = panes.find(p => p.id === sel) ?? panes[0];

  return (
    <div className="flex h-full overflow-hidden" style={{ backgroundColor: "#242426", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <aside className="flex-shrink-0 overflow-y-auto pt-4 pb-5" style={{ width: 274, backgroundColor: "#1f1f21", borderRight: "1px solid rgba(255,255,255,0.11)" }}>
        <div className="px-5 pb-4">
          <div className="h-10 flex items-center gap-3 px-4 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7.5" /><path d="M20 20l-3.8-3.8" /></svg>
            <span style={{ ...dim, fontSize: 17, fontWeight: 500 }}>{t("settings.search")}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 pl-8 pr-6 pb-6">
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0f0f2", fontSize: 31 }}>
            K4
          </div>
          <div className="min-w-0">
            <div className="truncate" style={{ color: "rgba(255,255,255,0.94)", fontSize: 17, fontWeight: 800 }}>{t("settings.accountName")}</div>
            <div style={{ ...dim, fontSize: 14, fontWeight: 600 }}>{t("settings.appleAccount")}</div>
          </div>
        </div>

        <div className="pl-8 pr-4">
          {panes.map(p => {
            const active = sel === p.id;
            return (
              <div key={p.id}>
                <button
                  type="button"
                  onClick={() => setSel(p.id)}
                  className="w-full flex items-center gap-3 rounded-[12px] px-3 text-left"
                  style={{
                    height: 42,
                    color: active ? "white" : "rgba(255,255,255,0.84)",
                    background: active ? "linear-gradient(#0a84ff,#0067df)" : "transparent",
                    fontSize: 17,
                    fontWeight: 700,
                  }}
                >
                  <IconTile color={p.color}>{p.glyph}</IconTile>
                  <span className="truncate">{t(p.labelKey)}</span>
                </button>
                {p.groupAfter && <div style={{ height: 18 }} />}
              </div>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <Toolbar />
        {sel === "general" ? (
          <GeneralPane />
        ) : sel === "appearance" ? (
          <AppearancePane />
        ) : sel === "wallpaper" ? (
          <WallpaperPane />
        ) : (
          <PlaceholderPane pane={selected} />
        )}
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useT } from "@/contexts/SystemContext";

interface CityConfig {
  key: string;
  tz: string;
  labelKey: string;
  subtitleKey: string;
}

const CITIES: CityConfig[] = [
  { key: "shenzhen",   tz: "Asia/Shanghai",       labelKey: "clock.shenzhen",   subtitleKey: "clock.sub.shenzhen" },
  { key: "beijing",    tz: "Asia/Shanghai",        labelKey: "clock.beijing",    subtitleKey: "clock.sub.beijing" },
  { key: "canberra",   tz: "Australia/Sydney",     labelKey: "clock.canberra",   subtitleKey: "clock.sub.canberra" },
  { key: "losangeles", tz: "America/Los_Angeles",  labelKey: "clock.losAngeles", subtitleKey: "clock.sub.losAngeles" },
  { key: "newyork",    tz: "America/New_York",     labelKey: "clock.newYork",    subtitleKey: "clock.sub.newYork" },
  { key: "london",     tz: "Europe/London",        labelKey: "clock.london",     subtitleKey: "clock.sub.london" },
  { key: "paris",      tz: "Europe/Paris",         labelKey: "clock.paris",      subtitleKey: "clock.sub.paris" },
];

function getTimeInTz(tz: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(now);
  const h = parseInt(parts.find(p => p.type === "hour")?.value ?? "0");
  const m = parseInt(parts.find(p => p.type === "minute")?.value ?? "0");
  const s = parseInt(parts.find(p => p.type === "second")?.value ?? "0");

  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(now);

  const dateStr = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", month: "short", day: "numeric",
  }).format(now);

  // day offset vs local
  const localDate = new Date().toLocaleDateString("en-CA");
  const tzDate = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
  const diff = new Date(tzDate).getDate() - new Date(localDate).getDate();

  return { h, m, s, timeStr, dateStr, diff };
}

const HOUR_TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30 - 90) * Math.PI / 180;
  const isMaj = i % 3 === 0;
  const r1 = 40, r2 = isMaj ? 34 : 37;
  return { x1: 50 + r1 * Math.cos(a), y1: 50 + r1 * Math.sin(a), x2: 50 + r2 * Math.cos(a), y2: 50 + r2 * Math.sin(a), isMaj };
});

function AnalogClock({ h, m, s, id }: { h: number; m: number; s: number; id: string }) {
  const hAngle = ((h % 12) * 30 + m * 0.5) - 90;
  const mAngle = m * 6 - 90;
  const sAngle = s * 6 - 90;
  const toXY = (angle: number, r: number) => ({
    x: 50 + r * Math.cos(angle * Math.PI / 180),
    y: 50 + r * Math.sin(angle * Math.PI / 180),
  });
  const hEnd = toXY(hAngle, 26);
  const mEnd = toXY(mAngle, 34);
  const sEnd = toXY(sAngle, 36);
  const sTail = toXY(sAngle + 180, 10);
  const gradId = `cg-${id}`;

  return (
    <svg viewBox="0 0 100 100" width="96" height="96">
      <defs>
        <radialGradient id={gradId} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#3a3a3c" />
          <stop offset="100%" stopColor="#1a1a1c" />
        </radialGradient>
      </defs>
      {/* Bezel */}
      <circle cx="50" cy="50" r="48" fill="rgba(255,255,255,0.12)" />
      {/* Face */}
      <circle cx="50" cy="50" r="44" fill={`url(#${gradId})`} />
      {/* Hour ticks */}
      {HOUR_TICKS.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="white" strokeOpacity={t.isMaj ? 0.85 : 0.35}
          strokeWidth={t.isMaj ? 2.5 : 1.5} strokeLinecap="round" />
      ))}
      {/* Hour hand */}
      <line x1="50" y1="50" x2={hEnd.x} y2={hEnd.y}
        stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeOpacity="0.95" />
      {/* Minute hand */}
      <line x1="50" y1="50" x2={mEnd.x} y2={mEnd.y}
        stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.9" />
      {/* Second hand */}
      <line x1={sTail.x} y1={sTail.y} x2={sEnd.x} y2={sEnd.y}
        stroke="#FF3B30" strokeWidth="1.5" strokeLinecap="round" />
      {/* Center */}
      <circle cx="50" cy="50" r="4" fill="#2c2c2e" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <circle cx="50" cy="50" r="2" fill="#FF3B30" />
      {/* Gloss */}
      <ellipse cx="38" cy="34" rx="14" ry="9" fill="white" opacity="0.06" />
    </svg>
  );
}

export default function Clock(_props: AppComponentProps) {
  const t = useT();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="h-full overflow-auto"
      style={{
        backgroundColor: "#000",
        color: "white",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        animation: "fadeIn 0.2s ease",
      }}
    >
      {/* Header */}
      <div
        className="glass-surface glass-thin sticky top-0 px-6 py-3 flex items-center"
        style={{ borderRadius: 0, boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.08)", zIndex: 10 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mr-2 opacity-70">
          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" />
          <path d="M12 6v6l4 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
          {t("clock.worldClock")}
        </span>
      </div>

      {/* City grid */}
      <div
        className="grid p-5 gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
      >
        {CITIES.map((city) => {
          const { h, m, s, timeStr, dateStr, diff } = getTimeInTz(city.tz);
          const isNight = h < 6 || h >= 20;

          return (
            <div
              key={city.key}
              className="flex flex-col items-center rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isNight ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.09)",
                padding: "20px 16px 16px",
                transition: "background-color 0.3s",
              }}
            >
              {/* Analog clock */}
              <AnalogClock h={h} m={m} s={s} id={city.key} />

              {/* City name */}
              <div style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.95)", marginTop: 12 }}>
                {t(city.labelKey)}
              </div>

              {/* Date */}
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                {dateStr}
                {diff !== 0 && (
                  <span style={{ color: "#FF9F0A", marginLeft: 4 }}>
                    {diff > 0 ? "+1" : "-1"}
                  </span>
                )}
              </div>

              {/* Digital time */}
              <div style={{ fontSize: 22, fontWeight: 300, color: isNight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.9)", marginTop: 8, letterSpacing: "0.02em" }}>
                {timeStr}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

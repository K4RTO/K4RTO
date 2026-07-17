"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSystem, useT } from "@/contexts/SystemContext";

const HYDRATION_DATE = new Date(Date.UTC(2026, 0, 17, 12, 0, 0));

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Sparkline({ color, points }: { color: string; points: number[] }) {
  const path = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * 78;
      const y = 30 - v * 24;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width="82" height="34" viewBox="0 0 82 34" fill="none" aria-hidden>
      <path d={path} stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WidgetCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`glass-surface glass-thin ${className}`}
      style={{
        borderRadius: 16,
        color: "rgba(255,255,255,0.88)",
        overflow: "hidden",
      }}
    >
      {children}
    </section>
  );
}

export function DesktopWidgets() {
  const t = useT();
  const { lang } = useSystem();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const date = now ?? HYDRATION_DATE;
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const fallbackDateOptions = now ? undefined : { timeZone: "UTC" };
  const weekday = date.toLocaleDateString(locale, { weekday: "long", ...fallbackDateOptions });
  const month = date.toLocaleDateString(locale, { month: "long", ...fallbackDateOptions });
  const day = now ? date.getDate() : date.getUTCDate();
  const time = now ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : "--:--";
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => i + day - 5), [day]);

  const projects = [
    { name: "macOS Portfolio", value: "92%", color: "#30d158" },
    { name: "Browser OS Runtime", value: "74%", color: "#64d2ff" },
    { name: "GitHub Pages", value: "Live", color: "#ffd60a" },
  ];

  const skills = ["Next.js", "React", "TypeScript", "Tailwind", "IndexedDB"];

  return (
    <div
      className="pointer-events-none absolute left-5 top-12 z-[2] hidden w-[344px] flex-col gap-3 xl:flex"
      aria-label={t("desktop.widgets.label")}
    >
      <WidgetCard className="p-3">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-[#ff453a]">{month}</div>
            <div className="mt-2 grid grid-cols-7 gap-0 text-center">
              {days.map((n) => {
                const current = n === day;
                return (
                  <div
                    key={n}
                    className="flex h-6 items-center justify-center text-[11px] font-semibold"
                    style={{ color: current ? "white" : "rgba(255,255,255,0.55)" }}
                  >
                    <span
                      className="grid h-5 w-5 place-items-center rounded-full"
                      style={{ background: current ? "#ff453a" : "transparent" }}
                    >
                      {n}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="w-[132px] shrink-0 space-y-2 pt-1">
            <div>
              <div className="truncate text-[12px] font-semibold">{t("desktop.widgets.agenda.primary")}</div>
              <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.58)" }}>10:30</div>
            </div>
            <div>
              <div className="truncate text-[12px] font-semibold">{t("desktop.widgets.agenda.secondary")}</div>
              <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.58)" }}>14:00</div>
            </div>
          </div>
        </div>
      </WidgetCard>

      <div className="grid grid-cols-2 gap-3">
        <WidgetCard className="p-3">
          <div className="text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.62)" }}>
            {t("desktop.widgets.now")}
          </div>
          <div className="mt-1 text-[34px] font-light leading-none">{time}</div>
          <div className="mt-2 text-[13px] font-semibold">{weekday}</div>
          <div className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.58)" }}>
            {t("desktop.widgets.status")}
          </div>
        </WidgetCard>

        <WidgetCard className="p-3">
          <div className="text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.62)" }}>
            GitHub
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <div className="text-[26px] font-semibold leading-none">K4RTO</div>
              <div className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.58)" }}>
                {t("desktop.widgets.github")}
              </div>
            </div>
            <Sparkline color="#30d158" points={[0.18, 0.42, 0.35, 0.58, 0.52, 0.78, 0.86]} />
          </div>
        </WidgetCard>
      </div>

      <WidgetCard className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13px] font-semibold">{t("desktop.widgets.projects")}</div>
          <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.56)" }}>
            {t("desktop.widgets.live")}
          </div>
        </div>
        <div className="space-y-2.5">
          {projects.map((project) => (
            <div key={project.name}>
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold">{project.name}</span>
                <span style={{ color: project.color }}>{project.value}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/12">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: project.value === "Live" ? "100%" : project.value,
                    background: project.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </WidgetCard>

      <WidgetCard className="p-3">
        <div className="text-[13px] font-semibold">{t("desktop.widgets.skills")}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.82)",
                boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.16)",
              }}
            >
              {skill}
            </span>
          ))}
        </div>
      </WidgetCard>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSystem, useT } from "@/contexts/SystemContext";

const HYDRATION_DATE = new Date(Date.UTC(2026, 0, 17, 12, 0, 0));

function pad(n: number) {
  return String(n).padStart(2, "0");
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
        padding: "16px 20px",
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

  return (
    <div
      className="pointer-events-none absolute left-5 top-12 z-[2] hidden w-[344px] flex-col gap-4 xl:flex"
      aria-label={t("desktop.widgets.label")}
    >
      <WidgetCard>
        <div className="text-[14px] font-semibold leading-none text-[#ff453a]">{month}</div>
        <div className="mt-4 grid grid-cols-7 gap-x-2 gap-y-3 text-center">
          {days.map((n) => {
            const current = n === day;
            return (
              <div
                key={n}
                className="flex h-7 items-center justify-center text-[13px] font-semibold"
                style={{ color: current ? "white" : "rgba(255,255,255,0.58)" }}
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-full"
                  style={{ background: current ? "#ff453a" : "transparent" }}
                >
                  {n}
                </span>
              </div>
            );
          })}
        </div>
      </WidgetCard>

      <WidgetCard>
        <div className="text-[13px] font-semibold leading-none" style={{ color: "rgba(255,255,255,0.62)" }}>
          {t("desktop.widgets.now")}
        </div>
        <div className="mt-4 text-[54px] font-light leading-none tracking-normal">{time}</div>
        <div className="mt-3 text-[17px] font-semibold leading-tight">{weekday}</div>
        <div className="mt-1 text-[13px]" style={{ color: "rgba(255,255,255,0.58)" }}>
          {month} {day}
        </div>
      </WidgetCard>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useT } from "@/contexts/SystemContext";

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }

interface Cell { day: number; month: number; year: number; current: boolean; }

function buildGrid(y: number, m: number): Cell[] {
  const first = firstDay(y, m);
  const days = daysInMonth(y, m);
  const pm = m === 0 ? 11 : m - 1;
  const py = m === 0 ? y - 1 : y;
  const nm = m === 11 ? 0 : m + 1;
  const ny = m === 11 ? y + 1 : y;
  const pdim = daysInMonth(py, pm);
  const cells: Cell[] = [];
  for (let i = first - 1; i >= 0; i--) cells.push({ day: pdim - i, month: pm, year: py, current: false });
  for (let d = 1; d <= days; d++) cells.push({ day: d, month: m, year: y, current: true });
  let nd = 1;
  while (cells.length < 42) cells.push({ day: nd++, month: nm, year: ny, current: false });
  return cells;
}

export default function Calendar(_props: AppComponentProps) {
  const t = useT();
  const today = new Date();
  const td = today.getDate(), tm = today.getMonth(), ty = today.getFullYear();

  const [vm, setVm] = useState(tm);
  const [vy, setVy] = useState(ty);
  const [sel, setSel] = useState<Cell | null>(null);

  const [mm, setMm] = useState(tm);
  const [my, setMy] = useState(ty);

  // Build translated arrays
  const MONTHS   = Array.from({ length: 12 }, (_, i) => t(`cal.month.${i}`));
  const MONTHS_S = Array.from({ length: 12 }, (_, i) => t(`cal.monthS.${i}`));
  const DAYS     = Array.from({ length: 7 },  (_, i) => t(`cal.day.${i}`));

  function prevM() { if (vm === 0) { setVm(11); setVy(vy-1); } else setVm(vm-1); }
  function nextM() { if (vm === 11) { setVm(0); setVy(vy+1); } else setVm(vm+1); }
  function prevMini() { if (mm === 0) { setMm(11); setMy(my-1); } else setMm(mm-1); }
  function nextMini() { if (mm === 11) { setMm(0); setMy(my+1); } else setMm(mm+1); }
  function goToday() { setVm(tm); setVy(ty); setMm(tm); setMy(ty); setSel(null); }

  const isToday = (c: Cell) => c.day === td && c.month === tm && c.year === ty;
  const isSel = (c: Cell) => sel ? c.day === sel.day && c.month === sel.month && c.year === sel.year : false;

  function DayDot({ c, size = 28 }: { c: Cell; size?: number }) {
    const tod = isToday(c), s = isSel(c);
    const bg = (tod && s) || tod ? "#ff3b30" : s ? "#0058d0" : "transparent";
    const col = tod || s ? "white" : c.current ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)";
    return (
      <div onClick={() => setSel(c)} style={{ width: size, height: size, borderRadius: "50%", backgroundColor: bg, color: col, fontSize: size <= 22 ? 10 : 13, fontWeight: (tod || s) ? 700 : 400, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        {c.day}
      </div>
    );
  }

  const mainGrid = buildGrid(vy, vm);
  const miniGrid = buildGrid(my, mm);

  const selStr = sel
    ? new Date(sel.year, sel.month, sel.day).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: "#1c1c1e", color: "white", animation: "fadeIn 0.2s ease" }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="flex-shrink-0 flex flex-col p-3 gap-3 overflow-y-auto" style={{ width: 180, backgroundColor: "#2c2c2e", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Mini header */}
          <div className="flex items-center justify-between">
            <button onClick={prevMini} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>&#8249;</button>
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{MONTHS_S[mm]} {my}</span>
            <button onClick={nextMini} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>&#8250;</button>
          </div>
          {/* Mini weekday */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{d[0]}</div>)}
          </div>
          {/* Mini grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
            {miniGrid.map((c, i) => (
              <div key={i} onClick={() => { setSel(c); setVm(c.month); setVy(c.year); }} style={{ width: 20, height: 20, borderRadius: "50%", margin: "auto", backgroundColor: isToday(c) ? "#ff3b30" : isSel(c) ? "#0058d0" : "transparent", color: c.current ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: (isToday(c) || isSel(c)) ? 700 : 400, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                {c.day}
              </div>
            ))}
          </div>
          {/* Today button */}
          <button onClick={goToday} style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", borderRadius: 6, padding: "4px 0", fontSize: 12, cursor: "pointer", width: "100%" }}>{t("cal.today")}</button>
          {/* Events */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("cal.events")}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{t("cal.noEventsToday")}</div>
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <button onClick={prevM} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 22, padding: "0 4px" }}>&#8249;</button>
            <h2 style={{ fontSize: 18, fontWeight: 700, minWidth: 210 }}>{MONTHS[vm]} {vy}</h2>
            <button onClick={nextM} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 22, padding: "0 4px" }}>&#8250;</button>
          </div>
          {/* Weekday headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "6px 16px 0" }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", paddingBottom: 4 }}>{d}</div>)}
          </div>
          {/* Day grid */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(6, 1fr)", padding: "0 16px 8px", gap: 2, overflow: "hidden" }}>
            {mainGrid.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: "4px 4px 0 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <DayDot c={c} size={30} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "6px 16px", fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", justifyContent: "space-between", backgroundColor: "#1c1c1e", flexShrink: 0 }}>
        <span>{selStr}</span>
        <span>{t("cal.noEvents")}</span>
      </div>
    </div>
  );
}

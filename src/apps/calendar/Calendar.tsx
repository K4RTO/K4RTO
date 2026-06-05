"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useT, useSystem } from "@/contexts/SystemContext";
import { useAppMenuListener } from "@/lib/menubar/appMenu";

/** Event model — keep it simple. ISO date (YYYY-MM-DD) keys avoid any
 *  timezone math during render; time is optional ("HH:mm") for all-day vs
 *  timed entries. id is a non-secret nonce so React can key reliably. */
interface CalEvent {
  id: string;
  date: string;   // "YYYY-MM-DD"
  title: string;
  time?: string;  // "HH:mm" or undefined for all-day
}

const LS_EVENTS = "k4rto.calendar.events";

function pad2(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
function dateKey(y: number, m: number, d: number): string { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }
function loadEvents(): CalEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_EVENTS);
    if (!raw) return [];
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((e): e is CalEvent =>
      e && typeof e.id === "string" && typeof e.date === "string" && typeof e.title === "string"
    );
  } catch { return []; }
}

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
  const { lang } = useSystem();
  // Status bar date string follows the UI lang so a zh user sees a Chinese-
  // formatted date instead of "Thursday, June 4". Date itself is in the
  // user's system timezone — JS Date is always local-tz by default.
  const dateLocale = lang === "zh" ? "zh-CN" : "en-US";
  const today = new Date();
  const td = today.getDate(), tm = today.getMonth(), ty = today.getFullYear();

  const [vm, setVm] = useState(tm);
  const [vy, setVy] = useState(ty);
  const [sel, setSel] = useState<Cell | null>(null);

  const [mm, setMm] = useState(tm);
  const [my, setMy] = useState(ty);

  // Events — loaded once on mount, persisted to localStorage on every change.
  const [events, setEvents] = useState<CalEvent[]>(() => loadEvents());
  useEffect(() => {
    try { localStorage.setItem(LS_EVENTS, JSON.stringify(events)); } catch { /* ignore */ }
  }, [events]);

  /** Map of "YYYY-MM-DD" → events on that day. Pre-computed so every
   *  cell render is O(1) instead of O(events) scanning the array. */
  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) {
      const arr = m.get(e.date);
      if (arr) arr.push(e); else m.set(e.date, [e]);
    }
    // Sort each day's events: timed entries first (chronologically), then all-day.
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return a.title.localeCompare(b.title);
      });
    }
    return m;
  }, [events]);

  // New-event form state — only relevant when sel is set.
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  function addEvent() {
    if (!sel || !newTitle.trim()) return;
    const ev: CalEvent = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      date: dateKey(sel.year, sel.month, sel.day),
      title: newTitle.trim(),
      // Tighten the regex to reject semantically-invalid times like "25:99"
      // (loose `\d{1,2}:\d{2}` would accept those). Hours 00-23, minutes 00-59.
      time: /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(newTime) ? newTime : undefined,
    };
    setEvents(prev => [...prev, ev]);
    setNewTitle("");
    setNewTime("");
    // Refocus so users can rapid-fire entries.
    titleInputRef.current?.focus();
  }
  function deleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  // Build translated arrays
  const MONTHS   = Array.from({ length: 12 }, (_, i) => t(`cal.month.${i}`));
  const MONTHS_S = Array.from({ length: 12 }, (_, i) => t(`cal.monthS.${i}`));
  const DAYS     = Array.from({ length: 7 },  (_, i) => t(`cal.day.${i}`));

  function prevM() { if (vm === 0) { setVm(11); setVy(vy-1); } else setVm(vm-1); }
  function nextM() { if (vm === 11) { setVm(0); setVy(vy+1); } else setVm(vm+1); }
  function prevMini() { if (mm === 0) { setMm(11); setMy(my-1); } else setMm(mm-1); }
  function nextMini() { if (mm === 11) { setMm(0); setMy(my+1); } else setMm(mm+1); }
  function goToday() { setVm(tm); setVy(ty); setMm(tm); setMy(ty); setSel(null); }

  useAppMenuListener("calendar", (detail) => {
    if (detail.type === "go-today") goToday();
    // view-month is the only mode anyway — no-op
  });

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
    ? new Date(sel.year, sel.month, sel.day).toLocaleDateString(dateLocale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString(dateLocale, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

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
          {/* Events for the selected day (or today if no selection). Shows the
              add-event form when a day is selected, and the day's existing
              events with delete-on-hover. */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("cal.events")}</div>
            {(() => {
              const focusedDay = sel ?? { day: td, month: tm, year: ty, current: true };
              const key = dateKey(focusedDay.year, focusedDay.month, focusedDay.day);
              const list = eventsByDay.get(key) ?? [];
              return (
                <>
                  {list.length === 0 && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
                      {sel ? t("cal.noEventsDay") : t("cal.noEventsToday")}
                    </div>
                  )}
                  {list.map(ev => (
                    <div
                      key={ev.id}
                      className="group"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 6,
                        marginBottom: 6,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.85)",
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#ff453a", marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {ev.time && <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, marginRight: 4 }}>{ev.time}</span>}
                        <span>{ev.title}</span>
                      </div>
                      <button
                        onClick={() => deleteEvent(ev.id)}
                        className="opacity-0 group-hover:opacity-100"
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0, transition: "opacity 0.12s" }}
                        title={t("cal.deleteEvent")}
                        aria-label={t("cal.deleteEvent")}
                      >×</button>
                    </div>
                  ))}
                  {sel && (
                    <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addEvent(); }}
                        placeholder={t("cal.eventTitle")}
                        style={{
                          backgroundColor: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.9)",
                          borderRadius: 4,
                          padding: "4px 6px",
                          fontSize: 12,
                          outline: "none",
                        }}
                      />
                      <div style={{ display: "flex", gap: 4 }}>
                        <input
                          type="text"
                          value={newTime}
                          onChange={e => setNewTime(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") addEvent(); }}
                          placeholder="09:00"
                          maxLength={5}
                          style={{
                            backgroundColor: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.9)",
                            borderRadius: 4,
                            padding: "4px 6px",
                            fontSize: 11,
                            outline: "none",
                            width: 64,
                          }}
                          title={t("cal.eventTimeHint")}
                        />
                        <button
                          onClick={addEvent}
                          disabled={!newTitle.trim()}
                          style={{
                            flex: 1,
                            backgroundColor: newTitle.trim() ? "#0058d0" : "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: newTitle.trim() ? "white" : "rgba(255,255,255,0.4)",
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: newTitle.trim() ? "pointer" : "default",
                          }}
                        >{t("cal.addEvent")}</button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
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
          {/* Day grid — each cell shows the date in the top-right and up to 3
              event dots below, with a "+N" badge if there are more. */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(6, 1fr)", padding: "0 16px 8px", gap: 2, overflow: "hidden" }}>
            {mainGrid.map((c, i) => {
              const k = dateKey(c.year, c.month, c.day);
              const dayEvents = eventsByDay.get(k) ?? [];
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", padding: "4px 4px 4px 4px", borderTop: "1px solid rgba(255,255,255,0.06)", minHeight: 0, overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <DayDot c={c} size={30} />
                  </div>
                  {/* Event dots — keep to 3 visible plus a "+N" overflow badge. */}
                  {dayEvents.length > 0 && (
                    <div style={{ marginTop: 2, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
                      {dayEvents.slice(0, 3).map(ev => (
                        <span
                          key={ev.id}
                          title={`${ev.time ? ev.time + " " : ""}${ev.title}`}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: "#ff453a",
                            display: "inline-block",
                          }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 9, marginLeft: 2 }}>+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status bar — total events overall (not just current month) so users
       *  always know they have data, even when navigating to empty months. */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "6px 16px", fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", justifyContent: "space-between", backgroundColor: "#1c1c1e", flexShrink: 0 }}>
        <span>{selStr}</span>
        <span>{events.length === 0 ? t("cal.noEvents") : t("cal.eventCount", { n: String(events.length) })}</span>
      </div>
    </div>
  );
}

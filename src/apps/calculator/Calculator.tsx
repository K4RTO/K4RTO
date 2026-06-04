"use client";

import { useEffect, useRef, useState } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useT } from "@/contexts/SystemContext";
import { useAppMenuListener } from "@/lib/menubar/appMenu";

type Operation = "+" | "-" | "*" | "/" | null;
type BtnType = "digit" | "operator" | "function" | "sci";

// Width grows when Sci mode is on so the extra column has room. The basic
// width matches the registry default (240). Unit mode is sci-width too —
// the converter UI uses the extra horizontal real estate for the dropdowns.
const BASIC_WIDTH = 240;
const SCI_WIDTH = 360;
const UNIT_WIDTH = 360;

// ── Unit converter data ────────────────────────────────────────────────────
// Each category lists { key, ratio-to-base }. Temperature gets a custom
// convert function because it's not multiplicative (F = C×9/5+32).
interface UnitDef { id: string; ratio: number; }
interface CategoryDef {
  id: "length" | "weight" | "temperature" | "time";
  units: UnitDef[];
  custom?: (v: number, fromId: string, toId: string) => number;
}

const UNIT_CATEGORIES: CategoryDef[] = [
  { id: "length", units: [
    { id: "m",  ratio: 1 },
    { id: "cm", ratio: 0.01 },
    { id: "mm", ratio: 0.001 },
    { id: "km", ratio: 1000 },
    { id: "in", ratio: 0.0254 },
    { id: "ft", ratio: 0.3048 },
    { id: "mi", ratio: 1609.344 },
  ]},
  { id: "weight", units: [
    { id: "kg", ratio: 1 },
    { id: "g",  ratio: 0.001 },
    { id: "mg", ratio: 0.000001 },
    { id: "lb", ratio: 0.45359237 },
    { id: "oz", ratio: 0.028349523125 },
    { id: "t",  ratio: 1000 },
  ]},
  { id: "temperature", units: [
    { id: "C", ratio: 1 },
    { id: "F", ratio: 1 },
    { id: "K", ratio: 1 },
  ], custom: (v, from, to) => {
    // Normalize to Celsius first, then convert out.
    let c = v;
    if (from === "F") c = (v - 32) * 5 / 9;
    else if (from === "K") c = v - 273.15;
    if (to === "C") return c;
    if (to === "F") return c * 9 / 5 + 32;
    if (to === "K") return c + 273.15;
    return c;
  }},
  { id: "time", units: [
    { id: "s",   ratio: 1 },
    { id: "ms",  ratio: 0.001 },
    { id: "min", ratio: 60 },
    { id: "h",   ratio: 3600 },
    { id: "d",   ratio: 86400 },
    { id: "wk",  ratio: 604800 },
  ]},
];

function convertUnit(value: number, cat: CategoryDef, fromId: string, toId: string): number {
  if (cat.custom) return cat.custom(value, fromId, toId);
  const from = cat.units.find((u) => u.id === fromId);
  const to = cat.units.find((u) => u.id === toId);
  if (!from || !to) return value;
  // value × from.ratio → base; ÷ to.ratio → target
  return (value * from.ratio) / to.ratio;
}

function formatConvertedResult(n: number): string {
  if (!isFinite(n)) return "—";
  if (Number.isInteger(n) && Math.abs(n) < 1e9) return n.toString();
  if (Math.abs(n) >= 1e9 || (Math.abs(n) > 0 && Math.abs(n) < 1e-4)) return n.toExponential(4);
  return parseFloat(n.toPrecision(8)).toString();
}

const BG: Record<BtnType, string> = {
  digit:    "#333333",
  operator: "#ff9500",
  function: "#636366",
  sci:      "#1f3a5f",   // muted blue — distinguishes sci from regular function
};
const BG_HOVER: Record<BtnType, string> = {
  digit:    "#4a4a4a",
  operator: "#ffab30",
  function: "#7c7c80",
  sci:      "#2e5288",
};

function formatDisplay(v: string): string {
  if (v.length <= 9) return v;
  const n = parseFloat(v);
  if (isNaN(n)) return v.slice(0, 9);
  return n.toExponential(3);
}

function getFS(d: string): string {
  if (d.length <= 6) return "48px";
  if (d.length <= 8) return "38px";
  return "28px";
}

type CalcMode = "basic" | "sci" | "unit";

export default function Calculator({ windowId }: AppComponentProps) {
  const wm = useWindowManager();
  const t = useT();
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Operation>(null);
  const [waiting, setWaiting] = useState(false);
  const [justCalc, setJustCalc] = useState(false);
  const [mode, setMode] = useState<CalcMode>("basic");

  // Resize the window each time mode flips. Calculator was registered
  // as non-resizable for drag-handle suppression — programmatic resize via
  // the reducer still works (the `resizable` flag only gates the resize
  // grips in Window.tsx).
  //
  // Mount-skip guard: the effect would otherwise fire once with mode=basic
  // on first render and dispatch a redundant 240px resize. That's a no-op
  // for a freshly-created Calculator (default width 240) but would clobber
  // the window manager's persisted width if Calculator was reopened in sci
  // mode and the user closed it without flipping back to basic.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const w = mode === "basic" ? BASIC_WIDTH : mode === "sci" ? SCI_WIDTH : UNIT_WIDTH;
    wm.dispatch({ type: "RESIZE_WINDOW", id: windowId, rect: { width: w } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // MenuBar entries (View > Basic / Scientific / Unit) toggle this mode.
  useAppMenuListener("calculator", (action) => {
    if (action.type === "view-basic") setMode("basic");
    if (action.type === "view-scientific") setMode("sci");
    if (action.type === "view-unit") setMode("unit");
  });

  // Convenience aliases — `sci` is still used in many places below, kept as
  // a derived boolean so the existing button-rendering branches don't need
  // a sweeping refactor. Mode === "unit" hides the calc grid entirely and
  // renders the unit-converter panel instead.
  const sci = mode === "sci";

  const isClean = display === "0" && prev === null && op === null;

  function clear() {
    if (!isClean) {
      setDisplay("0");
      setJustCalc(false);
    } else {
      setDisplay("0"); setPrev(null); setOp(null); setWaiting(false); setJustCalc(false);
    }
  }

  function digit(d: string) {
    if (waiting || justCalc) { setDisplay(d); setWaiting(false); setJustCalc(false); }
    else if (display.replace(/[-.]/, "").length < 9) {
      setDisplay(display === "0" ? d : display + d);
    }
  }

  function dot() {
    if (waiting || justCalc) { setDisplay("0."); setWaiting(false); setJustCalc(false); return; }
    if (!display.includes(".")) setDisplay(display + ".");
  }

  function sign() {
    if (display === "0") return;
    setDisplay(display.startsWith("-") ? display.slice(1) : "-" + display);
    setJustCalc(false);
  }

  function pct() {
    setDisplay(parseFloat((parseFloat(display) / 100).toPrecision(12)).toString());
    setJustCalc(false);
  }

  function calc(a: number, b: number, o: Operation): number {
    if (o === "+") return a + b;
    if (o === "-") return a - b;
    if (o === "*") return a * b;
    if (o === "/") return b !== 0 ? a / b : 0;
    return b;
  }

  function operator(nextOp: "+" | "-" | "*" | "/") {
    const val = parseFloat(display);
    if (prev !== null && !waiting) {
      const r = calc(prev, val, op);
      const rs = parseFloat(r.toPrecision(12)).toString();
      setDisplay(rs); setPrev(r);
    } else {
      setPrev(val);
    }
    setOp(nextOp); setWaiting(true); setJustCalc(false);
  }

  function equals() {
    const val = parseFloat(display);
    if (prev !== null && op) {
      const r = calc(prev, val, op);
      setDisplay(parseFloat(r.toPrecision(12)).toString());
      setPrev(null); setOp(null); setWaiting(false); setJustCalc(true);
    }
  }

  // Unary sci functions: apply f to the current display value and replace it
  // with the result. Bail on NaN/Inf with "Error" rather than corrupting the
  // internal state with weird values.
  function applyUnary(f: (x: number) => number) {
    const v = parseFloat(display);
    if (isNaN(v)) return;
    const r = f(v);
    if (!isFinite(r) || isNaN(r)) {
      setDisplay(t("calculator.error"));
      setPrev(null); setOp(null); setWaiting(false); setJustCalc(true);
      return;
    }
    setDisplay(parseFloat(r.toPrecision(12)).toString());
    // Only set waiting=true when there's a pending operation — otherwise
    // setting it would cause the next digit press to silently discard the
    // sci result (the digit() branch for `waiting` replaces the display).
    // justCalc handles the chain-after-result case for both branches.
    setWaiting(op !== null);
    setJustCalc(true);
  }
  // Inject a constant onto the display (replacing any in-progress entry —
  // mirrors how pressing a digit while waiting=true behaves).
  function injectConst(v: number) {
    setDisplay(parseFloat(v.toPrecision(12)).toString());
    setWaiting(false);
    setJustCalc(true);
  }

  type Btn = { label: string; type: BtnType; wide?: boolean; fn: () => void };

  // Standard 4-col grid (basic mode) — left as-is so the existing UX is
  // pixel-identical when sci is off.
  const basicBtns: Btn[] = [
    { label: isClean ? "AC" : "C", type: "function", fn: clear },
    { label: "+/-", type: "function", fn: sign },
    { label: "%",   type: "function", fn: pct },
    { label: "÷",   type: "operator", fn: () => operator("/") },
    { label: "7", type: "digit", fn: () => digit("7") },
    { label: "8", type: "digit", fn: () => digit("8") },
    { label: "9", type: "digit", fn: () => digit("9") },
    { label: "×", type: "operator", fn: () => operator("*") },
    { label: "4", type: "digit", fn: () => digit("4") },
    { label: "5", type: "digit", fn: () => digit("5") },
    { label: "6", type: "digit", fn: () => digit("6") },
    { label: "−", type: "operator", fn: () => operator("-") },
    { label: "1", type: "digit", fn: () => digit("1") },
    { label: "2", type: "digit", fn: () => digit("2") },
    { label: "3", type: "digit", fn: () => digit("3") },
    { label: "+", type: "operator", fn: () => operator("+") },
    { label: "0", type: "digit", wide: true, fn: () => digit("0") },
    { label: ".", type: "digit", fn: dot },
    { label: "=", type: "operator", fn: equals },
  ];

  // Scientific column — 5 rows × 1 col, rendered on the left when sci mode
  // is on. Functions chosen for "what you'd actually reach for on a portfolio
  // calculator": trig, log, sqrt, square, pi.
  const sciCol: Btn[] = [
    { label: "sin", type: "sci", fn: () => applyUnary((x) => Math.sin(x)) },
    { label: "cos", type: "sci", fn: () => applyUnary((x) => Math.cos(x)) },
    { label: "ln",  type: "sci", fn: () => applyUnary((x) => Math.log(x)) },
    { label: "x²",  type: "sci", fn: () => applyUnary((x) => x * x) },
    { label: "π",   type: "sci", fn: () => injectConst(Math.PI) },
  ];
  // Second sci column — paired with the first when sci is on.
  const sciCol2: Btn[] = [
    { label: "tan", type: "sci", fn: () => applyUnary((x) => Math.tan(x)) },
    { label: "log", type: "sci", fn: () => applyUnary((x) => Math.log10(x)) },
    { label: "√x",  type: "sci", fn: () => applyUnary((x) => Math.sqrt(x)) },
    { label: "1/x", type: "sci", fn: () => applyUnary((x) => 1 / x) },
    { label: "e",   type: "sci", fn: () => injectConst(Math.E) },
  ];

  const disp = formatDisplay(display);
  // In sci mode the layout becomes (sci col 1 | sci col 2 | 4 basic cols) = 6 cols
  // arranged row-by-row. Buttons are interleaved per row so that pressing a sci
  // function lands at the same vertical position as the matching basic row.
  // Each "basic row" produces 4 entries in basicBtns; we pair with sci entries
  // by row index. There are 5 rows total (function row + 3 digit rows + zero row).
  const rowCount = 5;
  const gridCols = sci ? 6 : 4;
  const cells: Btn[] = [];
  if (sci) {
    for (let row = 0; row < rowCount; row++) {
      cells.push(sciCol[row], sciCol2[row]);
      const start = row * 4;
      cells.push(...basicBtns.slice(start, start + 4));
    }
  } else {
    cells.push(...basicBtns);
  }

  return (
    <div className="h-full flex flex-col select-none overflow-hidden" style={{ backgroundColor: "#1c1c1e", animation: "fadeIn 0.2s ease" }}>
      {/* Mode toggle — three-way pill (Basic / Sci / Unit). Sits in the top-
          left of the display area; doesn't compete with the digit readout. */}
      <div
        className="absolute flex items-center"
        style={{
          top: 8, left: 8, zIndex: 1,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 6, padding: 1,
        }}
      >
        {(["basic", "sci", "unit"] as CalcMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              background: mode === m ? "rgba(31, 58, 95, 0.95)" : "transparent",
              color: mode === m ? "white" : "rgba(255,255,255,0.55)",
              border: "none",
              padding: "3px 9px",
              borderRadius: 5,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              cursor: "pointer",
            }}
            title={t(`calculator.mode.${m}`)}
          >
            {m === "basic" ? "Basic" : m === "sci" ? "Sci" : "Unit"}
          </button>
        ))}
      </div>

      {/* Display — hidden in unit mode (which renders its own input row) */}
      {mode !== "unit" && (
        <div className="flex items-end justify-end gap-2 px-5 pb-3" style={{ backgroundColor: "#000", height: 100, flexShrink: 0, position: "relative" }}>
          <span className="text-white font-light" style={{ fontSize: getFS(disp), lineHeight: 1 }}>
            {disp}
          </span>
        </div>
      )}

      {/* Body — either the digit grid (basic / sci) or the unit converter. */}
      {mode === "unit" ? (
        <UnitConverter t={t} />
      ) : (
        <div className="p-4 flex-1" style={{ backgroundColor: "#1c1c1e" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 10, height: "100%" }}>
            {cells.map((btn, i) => {
              const bg = BG[btn.type];
              const hv = BG_HOVER[btn.type];
              return (
                <button key={i} onClick={btn.fn}
                  style={{
                    gridColumn: btn.wide ? "span 2" : undefined,
                    borderRadius: 9999,
                    backgroundColor: bg,
                    color: "white",
                    fontSize: btn.type === "sci" ? 15 : (btn.label === "+/-" ? 18 : 24),
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: btn.wide ? "flex-start" : "center",
                    paddingLeft: btn.wide ? 28 : undefined,
                    transition: "background-color 0.08s",
                    minHeight: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = hv)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = bg)}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Unit Converter pane ─────────────────────────────────────────────────────
// Self-contained: own state for category / from / to / value. No interaction
// with the calculator's digit grid state, since switching modes resets it
// visually and a converter that "remembered" the last digit-grid result would
// be confusing more than useful.
function UnitConverter({ t }: { t: (key: string, vars?: Record<string, string>) => string }) {
  const [catId, setCatId] = useState<CategoryDef["id"]>("length");
  const cat = UNIT_CATEGORIES.find((c) => c.id === catId)!;
  const [fromId, setFromId] = useState<string>(cat.units[0].id);
  const [toId, setToId] = useState<string>(cat.units[1].id);
  const [input, setInput] = useState("1");

  // When category changes, reset from/to to its first two units so we don't
  // hold onto stale ids that don't belong to the new category.
  useEffect(() => {
    setFromId(cat.units[0].id);
    setToId(cat.units[1]?.id ?? cat.units[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catId]);

  const value = parseFloat(input);
  const result = isNaN(value) ? null : convertUnit(value, cat, fromId, toId);

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    background: "#2c2c2e",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: "0.08em",
    marginBottom: 4,
    textTransform: "uppercase",
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#1c1c1e", padding: "20px 18px" }}>
      {/* Category tabs */}
      <div className="flex gap-1.5 mb-4">
        {UNIT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCatId(c.id)}
            style={{
              flex: 1,
              padding: "8px 4px",
              background: catId === c.id ? "#ff9500" : "rgba(255,255,255,0.06)",
              color: catId === c.id ? "white" : "rgba(255,255,255,0.75)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t(`calculator.unit.cat.${c.id}`)}
          </button>
        ))}
      </div>

      {/* From */}
      <label style={labelStyle}>{t("calculator.unit.from")}</label>
      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputMode="decimal"
          style={{
            flex: 1.4,
            padding: "10px 12px",
            background: "#2c2c2e",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 8,
            fontSize: 18,
            fontWeight: 600,
            fontFamily: "'SF Mono', monospace",
            minWidth: 0,
            outline: "none",
          }}
        />
        <select value={fromId} onChange={(e) => setFromId(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
          {cat.units.map((u) => (
            <option key={u.id} value={u.id}>{t(`calculator.unit.u.${cat.id}.${u.id}`) || u.id}</option>
          ))}
        </select>
      </div>

      {/* To */}
      <label style={labelStyle}>{t("calculator.unit.to")}</label>
      <div className="flex gap-2 mb-3">
        <div
          style={{
            flex: 1.4,
            padding: "10px 12px",
            background: "#1a1a1c",
            color: "#ff9500",
            border: "1px solid rgba(255,149,0,0.25)",
            borderRadius: 8,
            fontSize: 18,
            fontWeight: 600,
            fontFamily: "'SF Mono', monospace",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {result !== null ? formatConvertedResult(result) : "—"}
        </div>
        <select value={toId} onChange={(e) => setToId(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
          {cat.units.map((u) => (
            <option key={u.id} value={u.id}>{t(`calculator.unit.u.${cat.id}.${u.id}`) || u.id}</option>
          ))}
        </select>
      </div>

      {/* Swap from <-> to */}
      <button
        onClick={() => {
          const newFrom = toId, newTo = fromId;
          setFromId(newFrom);
          setToId(newTo);
          // Also flip input ↔ result for natural "round-trip" UX, when result valid
          if (result !== null) setInput(formatConvertedResult(result));
        }}
        style={{
          marginTop: 8,
          width: "100%",
          padding: "10px 12px",
          background: "rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.85)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        ⇅ {t("calculator.unit.swap")}
      </button>
    </div>
  );
}

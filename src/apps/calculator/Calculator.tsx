"use client";

import { useEffect, useRef, useState } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useAppMenuListener } from "@/lib/menubar/appMenu";

type Operation = "+" | "-" | "*" | "/" | null;
type BtnType = "digit" | "operator" | "function" | "sci";

// Width grows when Sci mode is on so the extra column has room. The basic
// width matches the registry default (240).
const BASIC_WIDTH = 240;
const SCI_WIDTH = 360;

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

export default function Calculator({ windowId }: AppComponentProps) {
  const wm = useWindowManager();
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Operation>(null);
  const [waiting, setWaiting] = useState(false);
  const [justCalc, setJustCalc] = useState(false);
  const [sci, setSci] = useState(false);

  // Resize the window each time sci mode flips. Calculator was registered
  // as non-resizable for drag-handle suppression — programmatic resize via
  // the reducer still works (the `resizable` flag only gates the resize
  // grips in Window.tsx).
  //
  // Mount-skip guard: the effect would otherwise fire once with sci=false on
  // first render and dispatch a redundant 240px resize. That's a no-op for a
  // freshly-created Calculator (default width is 240) but would clobber the
  // window manager's persisted width if Calculator was reopened in sci mode
  // and the user closed it without flipping back to basic.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    wm.dispatch({
      type: "RESIZE_WINDOW",
      id: windowId,
      rect: { width: sci ? SCI_WIDTH : BASIC_WIDTH },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sci]);

  // MenuBar entries (View > Basic / Scientific) toggle this mode.
  useAppMenuListener("calculator", (action) => {
    if (action.type === "view-basic") setSci(false);
    if (action.type === "view-scientific") setSci(true);
  });

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
      setDisplay("Error");
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
      {/* Display */}
      <div className="flex items-end justify-end gap-2 px-5 pb-3" style={{ backgroundColor: "#000", height: 100, flexShrink: 0, position: "relative" }}>
        {/* Sci toggle — top-right corner of the display area; small enough to
            not compete with the digit readout */}
        <button
          type="button"
          onClick={() => setSci((v) => !v)}
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: sci ? "rgba(31, 58, 95, 0.95)" : "rgba(255,255,255,0.10)",
            color: sci ? "white" : "rgba(255,255,255,0.65)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 6,
            padding: "2px 10px",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
          title={sci ? "Switch to Basic" : "Switch to Scientific"}
        >
          {sci ? "Sci" : "Sci"}
        </button>
        <span className="text-white font-light" style={{ fontSize: getFS(disp), lineHeight: 1 }}>
          {disp}
        </span>
      </div>

      {/* Buttons */}
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
    </div>
  );
}

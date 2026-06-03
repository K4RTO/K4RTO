"use client";

import { useState } from "react";
import type { AppComponentProps } from "@/apps/registry";

type Operation = "+" | "-" | "*" | "/" | null;
type BtnType = "digit" | "operator" | "function";

const BG: Record<BtnType, string> = {
  digit:    "#333333",
  operator: "#ff9500",
  function: "#636366",
};
const BG_HOVER: Record<BtnType, string> = {
  digit:    "#4a4a4a",
  operator: "#ffab30",
  function: "#7c7c80",
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

export default function Calculator(_props: AppComponentProps) {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Operation>(null);
  const [waiting, setWaiting] = useState(false);
  const [justCalc, setJustCalc] = useState(false);

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

  type Btn = { label: string; type: BtnType; wide?: boolean; fn: () => void };
  const btns: Btn[] = [
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

  const disp = formatDisplay(display);

  return (
    <div className="h-full flex flex-col select-none overflow-hidden" style={{ backgroundColor: "#1c1c1e", animation: "fadeIn 0.2s ease" }}>
      {/* Display */}
      <div className="flex items-end justify-end px-5 pb-3" style={{ backgroundColor: "#000", height: 100, flexShrink: 0 }}>
        <span className="text-white font-light" style={{ fontSize: getFS(disp), lineHeight: 1 }}>
          {disp}
        </span>
      </div>

      {/* Buttons */}
      <div className="p-4 flex-1" style={{ backgroundColor: "#1c1c1e" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, height: "100%" }}>
          {btns.map((btn, i) => {
            const bg = BG[btn.type];
            const hv = BG_HOVER[btn.type];
            return (
              <button key={i} onClick={btn.fn}
                style={{
                  gridColumn: btn.wide ? "span 2" : undefined,
                  borderRadius: 9999,
                  backgroundColor: bg,
                  color: "white",
                  fontSize: btn.label === "+/-" ? 18 : 24,
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

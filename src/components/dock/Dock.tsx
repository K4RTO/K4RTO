"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useProcesses } from "@/contexts/ProcessContext";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useT } from "@/contexts/SystemContext";
import { useFileSystemOptional } from "@/contexts/FileSystemContext";
import { ContextMenu, type MenuItem as CtxMenuItem } from "@/components/shared/ContextMenu";

const TRASH_DIR = "/Users/guest/.Trash";

// --- Dock Magnification Hook ---
function useDockMagnification(baseSize: number, maxSize: number, range: number) {
  const dockRef = useRef<HTMLDivElement>(null);
  const [scales, setScales] = useState<number[]>([]);
  const [isHovering, setIsHovering] = useState(false);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dockRef.current) return;
      const items = dockRef.current.querySelectorAll("[data-dock-item]");
      const newScales: number[] = [];
      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.left + rect.width / 2;
        const dist = Math.abs(e.clientX - itemCenter);
        if (dist > range) {
          newScales.push(1);
        } else {
          const scale = 1 + (maxSize / baseSize - 1) * Math.cos((dist / range) * (Math.PI / 2));
          newScales.push(scale);
        }
      });
      setScales(newScales);
    },
    [baseSize, maxSize, range]
  );

  const onMouseEnter = useCallback(() => setIsHovering(true), []);
  const onMouseLeave = useCallback(() => {
    setIsHovering(false);
    setScales([]);
  }, []);

  return { dockRef, scales, isHovering, onMouseMove, onMouseEnter, onMouseLeave };
}

// --- Dock Item ---
interface DockItemProps {
  name: string;
  icon?: string;
  svgIcon?: React.ReactNode;
  isRunning?: boolean;
  onClick?: () => void;
  onContextMenu?: (x: number, y: number) => void;
  scale?: number;
  baseSize: number;
}

// Space reserved at the bottom of each DockItem for the running indicator dot
const DOT_AREA = 14;

function DockItem({ name, icon, svgIcon, isRunning, onClick, onContextMenu, scale = 1, baseSize }: DockItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const size = baseSize * scale;
  const tr = scale === 1 ? "width 0.2s ease" : "none";

  return (
    <div
      data-dock-item
      className="relative flex-shrink-0 cursor-pointer"
      style={{ width: size, height: baseSize + DOT_AREA, transition: tr }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onContextMenu?.(e.clientX, e.clientY); }}
    >
      {showTooltip && (
        <div
          className="glass-surface glass-thin glass-radius-tooltip absolute px-3 py-1 text-xs font-medium whitespace-nowrap pointer-events-none"
          style={{ bottom: size + DOT_AREA + 6, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.95)", zIndex: 9999 }}
        >
          {name}
        </div>
      )}
      {/* Icon — sits above the dot area */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
        style={{ bottom: DOT_AREA, width: size, height: size, transition: tr }}
      >
        {icon ? (
          <Image
            src={`/System/Icons/96x96/${icon}`}
            alt={name}
            width={Math.round(size * 1.2)}
            height={Math.round(size * 1.2)}
            draggable={false}
            className="drop-shadow-lg"
            style={{ width: size * 1.2, height: size * 1.2, objectFit: "contain" }}
          />
        ) : (
          <div style={{ width: size * 0.8, height: size * 0.8 }}>{svgIcon}</div>
        )}
      </div>
      {/* Running dot — sits inside the dot area at the bottom */}
      {isRunning && (
        <div
          className="absolute w-1 h-1 rounded-full bg-white/80"
          style={{ bottom: 5, left: "50%", transform: "translateX(-50%)" }}
        />
      )}
    </div>
  );
}

function DockSeparator() {
  return <div className="w-px h-10 bg-white/30 mx-1 self-center" />;
}

// ─── Realistic SVG Icons ─────────────────────────────────────────────────────────────────────────────

// Pre-computed outside components to avoid SSR/CSR floating-point string mismatch
const _r = (n: number) => Math.round(n * 10000) / 10000;
const SAFARI_TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30 - 90) * Math.PI / 180;
  const isMaj = i % 3 === 0;
  const r1 = 33, r2 = isMaj ? 28 : 31;
  return { x1: _r(50 + r1 * Math.cos(a)), y1: _r(50 + r1 * Math.sin(a)), x2: _r(50 + r2 * Math.cos(a)), y2: _r(50 + r2 * Math.sin(a)), isMaj };
});
const CLOCK_HOUR_TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30 - 90) * Math.PI / 180;
  const isMaj = i % 3 === 0;
  const r1 = 35, r2 = isMaj ? 29 : 32;
  return { x1: _r(50 + r1 * Math.cos(a)), y1: _r(50 + r1 * Math.sin(a)), x2: _r(50 + r2 * Math.cos(a)), y2: _r(50 + r2 * Math.sin(a)), isMaj };
});

function SafariIcon() {
  const ticks = SAFARI_TICKS;
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "22%", overflow: "hidden", position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="sfBg" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#5ec5ff" />
            <stop offset="50%" stopColor="#007aff" />
            <stop offset="100%" stopColor="#003a9e" />
          </radialGradient>
          <radialGradient id="sfFace" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e8f4ff" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#sfBg)" />
        {/* Compass bezel ring */}
        <circle cx="50" cy="50" r="37" fill="rgba(0,0,0,0.15)" />
        <circle cx="50" cy="50" r="35" fill="url(#sfFace)" />
        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.isMaj ? "#2c2c2e" : "#8e8e93"} strokeWidth={t.isMaj ? 2 : 1} strokeLinecap="round" />
        ))}
        {/* Cardinal letters */}
        <text x="50" y="22" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1c1c1e">N</text>
        <text x="50" y="83" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1c1c1e">S</text>
        <text x="79" y="53" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1c1c1e">E</text>
        <text x="21" y="53" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1c1c1e">W</text>
        {/* Needle shadow */}
        <polygon points="50,19 47,50 53,50" fill="rgba(0,0,0,0.15)" transform="translate(1,1)" />
        {/* North needle (red) */}
        <polygon points="50,19 47,50 53,50" fill="#FF3B30" />
        {/* South needle (gray) */}
        <polygon points="50,81 47,50 53,50" fill="#8e8e93" />
        {/* Pivot */}
        <circle cx="50" cy="50" r="3.5" fill="#1c1c1e" />
        <circle cx="50" cy="50" r="1.5" fill="white" opacity="0.9" />
        {/* Gloss */}
        <ellipse cx="40" cy="34" rx="13" ry="8" fill="white" opacity="0.18" />
      </svg>
      {/* Glass highlight */}
      <div style={{ position: "absolute", top: "3%", left: "6%", width: "55%", height: "42%", background: "linear-gradient(145deg, rgba(255,255,255,0.3) 0%, transparent 100%)", borderRadius: "50%", pointerEvents: "none" }} />
    </div>
  );
}

function NotesIcon() {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "22%", overflow: "hidden", position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="notesHdr" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe066" />
            <stop offset="100%" stopColor="#f0c000" />
          </linearGradient>
          <linearGradient id="notesPaper" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fffef0" />
            <stop offset="100%" stopColor="#f8f4d8" />
          </linearGradient>
        </defs>
        {/* Paper background */}
        <rect width="100" height="100" fill="url(#notesPaper)" />
        {/* Yellow header */}
        <rect width="100" height="30" fill="url(#notesHdr)" />
        {/* Header highlight */}
        <rect width="100" height="4" fill="rgba(255,255,255,0.4)" />
        {/* Left margin red line */}
        <line x1="22" y1="30" x2="22" y2="100" stroke="#ff6b6b" strokeWidth="1.2" opacity="0.5" />
        {/* Ruled lines */}
        {[42, 54, 66, 78, 90].map((y, i) => (
          <line key={i} x1="28" y1={y} x2="88" y2={y} stroke="#c8c0a0" strokeWidth={i === 0 ? 1.5 : 1} opacity={i === 0 ? 0.8 : 0.5} />
        ))}
        {/* First line text simulation */}
        <rect x="28" y="38" width="42" height="3" rx="1.5" fill="#6b5b00" opacity="0.45" />
        {/* Other lines partial fill */}
        <rect x="28" y="50" width="55" height="2.5" rx="1.2" fill="#a09060" opacity="0.25" />
        <rect x="28" y="62" width="38" height="2.5" rx="1.2" fill="#a09060" opacity="0.25" />
        {/* Header shadow */}
        <rect y="28" width="100" height="3" fill="rgba(0,0,0,0.08)" />
        {/* Top gloss */}
        <rect width="100" height="14" fill="rgba(255,255,255,0.22)" />
      </svg>
    </div>
  );
}

function TextEditIcon() {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "22%", overflow: "hidden", position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="tePaper" x1="0%" y1="0%" x2="5%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f2f2f7" />
          </linearGradient>
          <linearGradient id="tePen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c8a020" />
            <stop offset="40%" stopColor="#f0c040" />
            <stop offset="100%" stopColor="#c07010" />
          </linearGradient>
        </defs>
        {/* Paper */}
        <rect width="100" height="100" fill="url(#tePaper)" />
        {/* Page shadow left edge */}
        <rect width="6" height="100" fill="rgba(0,0,0,0.04)" />
        {/* Top color bar */}
        <rect width="100" height="6" fill="#34C759" />
        <rect width="100" height="2" fill="rgba(255,255,255,0.4)" />
        {/* Text lines */}
        {[20, 30, 40, 50, 60, 70, 80].map((y, i) => {
          const w = [72, 55, 65, 48, 68, 52, 35][i];
          return <rect key={i} x="12" y={y} width={w} height="3" rx="1.5" fill={i === 0 ? "#1c1c1e" : "#8e8e93"} opacity={i === 0 ? 0.7 : 0.35} />;
        })}
        {/* Pencil */}
        <g transform="rotate(-35, 75, 72)">
          {/* Pencil body */}
          <rect x="65" y="55" width="8" height="32" rx="1" fill="url(#tePen)" />
          {/* Pencil tip */}
          <polygon points="65,87 73,87 69,96" fill="#f2e0b0" />
          <polygon points="67,90 71,90 69,96" fill="#1c1c1e" />
          {/* Pencil top eraser */}
          <rect x="65" y="52" width="8" height="4" rx="1" fill="#ff8080" />
          <rect x="65" y="55" width="8" height="1.5" fill="rgba(0,0,0,0.2)" />
          {/* Shine */}
          <rect x="66" y="56" width="2" height="26" rx="1" fill="rgba(255,255,255,0.4)" />
        </g>
        {/* Top gloss */}
        <rect width="100" height="18" fill="rgba(255,255,255,0.15)" />
      </svg>
    </div>
  );
}

function TerminalIcon() {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "22%", overflow: "hidden", position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="termBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a2332" />
            <stop offset="100%" stopColor="#0d1117" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#termBg)" />
        {/* Titlebar */}
        <rect width="100" height="18" fill="rgba(255,255,255,0.06)" />
        <circle cx="13" cy="9" r="4" fill="#FF5F57" />
        <circle cx="25" cy="9" r="4" fill="#FFBD2E" />
        <circle cx="37" cy="9" r="4" fill="#28C840" />
        {/* Terminal content */}
        {/* Prompt line 1 */}
        <text x="10" y="34" fontSize="7.5" fill="#28C840" fontFamily="monospace" opacity="0.9">$</text>
        <text x="18" y="34" fontSize="7.5" fill="#28C840" fontFamily="monospace" opacity="0.8">ls -la</text>
        {/* Output lines */}
        <text x="10" y="45" fontSize="6.5" fill="#8ec07c" fontFamily="monospace" opacity="0.65">drwxr-xr-x  Desktop/</text>
        <text x="10" y="54" fontSize="6.5" fill="#8ec07c" fontFamily="monospace" opacity="0.65">drwxr-xr-x  Documents/</text>
        <text x="10" y="63" fontSize="6.5" fill="#d3d7cf" fontFamily="monospace" opacity="0.5">-rw-r--r--  readme.md</text>
        {/* Prompt line 2 */}
        <text x="10" y="77" fontSize="7.5" fill="#28C840" fontFamily="monospace" opacity="0.9">$</text>
        {/* Blinking cursor */}
        <rect x="18" y="70" width="6" height="9" rx="1" fill="#28C840" opacity="0.85" />
        {/* Scanline overlay */}
        {[20,24,28,32,36,40,44,48,52,56,60,64,68,72,76,80,84,88,92,96].map((y, i) => (
          <rect key={i} x="0" y={y} width="100" height="1" fill="rgba(0,0,0,0.08)" />
        ))}
        {/* Top gloss */}
        <rect width="100" height="18" fill="rgba(255,255,255,0.04)" />
      </svg>
    </div>
  );
}

function SettingsIcon() {
  // Gear path - aluminum style
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "22%", overflow: "hidden", position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="settingsBg" x1="0%" y1="0%" x2="30%" y2="100%">
            <stop offset="0%" stopColor="#9a9a9e" />
            <stop offset="100%" stopColor="#5a5a60" />
          </linearGradient>
          <linearGradient id="gearGrad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="50%" stopColor="rgba(220,220,225,0.7)" />
            <stop offset="100%" stopColor="rgba(180,180,185,0.6)" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#settingsBg)" />
        {/* Simpler gear: use polygon + circle cutout */}
        {/* Outer gear teeth using small rects rotated */}
        {Array.from({ length: 8 }, (_, i) => {
          const angle = i * 45;
          return (
            <rect
              key={i}
              x="46" y="14"
              width="8" height="16"
              rx="3"
              fill="url(#gearGrad)"
              transform={`rotate(${angle}, 50, 50)`}
            />
          );
        })}
        {/* Gear body circle */}
        <circle cx="50" cy="50" r="26" fill="url(#gearGrad)" />
        {/* Center hole */}
        <circle cx="50" cy="50" r="11" fill="url(#settingsBg)" />
        <circle cx="50" cy="50" r="10" fill="rgba(0,0,0,0.25)" />
        {/* Inner ring highlight */}
        <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        {/* Top gloss */}
        <ellipse cx="44" cy="36" rx="18" ry="10" fill="rgba(255,255,255,0.2)" />
      </svg>
    </div>
  );
}

function CalculatorIcon() {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "22%", overflow: "hidden", position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="calcBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2c2c2e" />
            <stop offset="100%" stopColor="#1c1c1e" />
          </linearGradient>
          <linearGradient id="calcDisplay" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a1a0a" />
            <stop offset="100%" stopColor="#051005" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#calcBg)" />
        {/* Display */}
        <rect x="10" y="10" width="80" height="24" rx="4" fill="url(#calcDisplay)" />
        <rect x="10" y="10" width="80" height="4" rx="2" fill="rgba(255,255,255,0.05)" />
        <text x="84" y="27" textAnchor="end" fontSize="13" fill="#28C840" fontFamily="monospace" opacity="0.9">0</text>
        {/* Button grid: 4 cols x 4 rows */}
        {[
          ["AC","±","%","÷"],
          ["7","8","9","×"],
          ["4","5","6","−"],
          ["1","2","3","+"],
        ].map((row, ri) =>
          row.map((label, ci) => {
            const x = 10 + ci * 21;
            const y = 42 + ri * 15;
            const isOp = ci === 3;
            const isFn = ri === 0;
            const bg = isOp ? "#ff9500" : isFn ? "#636366" : "#3a3a3c";
            const fg = "white";
            return (
              <g key={`${ri}-${ci}`}>
                <rect x={x} y={y} width="18" height="12" rx="3" fill={bg} opacity="0.95" />
                <rect x={x} y={y} width="18" height="2" rx="1" fill="rgba(255,255,255,0.15)" />
                <text x={x + 9} y={y + 8.5} textAnchor="middle" fontSize="6.5" fill={fg} fontFamily="-apple-system,sans-serif" fontWeight="400">
                  {label}
                </text>
              </g>
            );
          })
        )}
        {/* Row 5 */}
        <rect x="10" y="102" width="39" height="12" rx="3" fill="#3a3a3c" opacity="0.95" />
        <rect x="10" y="102" width="39" height="2" rx="1" fill="rgba(255,255,255,0.15)" />
        <text x="24" y="110.5" textAnchor="middle" fontSize="6.5" fill="white" fontFamily="-apple-system,sans-serif">0</text>
        <rect x="52" y="102" width="18" height="12" rx="3" fill="#3a3a3c" opacity="0.95" />
        <rect x="52" y="102" width="18" height="2" rx="1" fill="rgba(255,255,255,0.15)" />
        <text x="61" y="110.5" textAnchor="middle" fontSize="6.5" fill="white" fontFamily="-apple-system,sans-serif">.</text>
        <rect x="73" y="102" width="18" height="12" rx="3" fill="#ff9500" opacity="0.95" />
        <rect x="73" y="102" width="18" height="2" rx="1" fill="rgba(255,255,255,0.15)" />
        <text x="82" y="110.5" textAnchor="middle" fontSize="6.5" fill="white" fontFamily="-apple-system,sans-serif">=</text>
        {/* Top gloss */}
        <rect width="100" height="18" fill="rgba(255,255,255,0.05)" />
      </svg>
    </div>
  );
}

function CalendarIcon() {
  const now = new Date();
  const day = now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const date = now.getDate();
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "22%", overflow: "hidden", position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="calBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f2f2f7" />
          </linearGradient>
          <linearGradient id="calHdr" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff453a" />
            <stop offset="100%" stopColor="#d70015" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#calBg)" />
        {/* Red header */}
        <rect width="100" height="34" fill="url(#calHdr)" />
        <rect width="100" height="3" fill="rgba(255,255,255,0.3)" />
        {/* Ring holes */}
        <rect x="28" y="0" width="6" height="10" rx="3" fill="rgba(0,0,0,0.35)" />
        <rect x="66" y="0" width="6" height="10" rx="3" fill="rgba(0,0,0,0.35)" />
        {/* Day name */}
        <text x="50" y="24" textAnchor="middle" fontSize="11" fontWeight="600" fill="white" fontFamily="-apple-system,sans-serif" opacity="0.95">
          {day}
        </text>
        {/* Grid lines */}
        <line x1="0" y1="54" x2="100" y2="54" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
        <line x1="0" y1="74" x2="100" y2="74" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
        {/* Date number */}
        <text x="50" y="74" textAnchor="middle" fontSize="40" fontWeight="200" fill="#1c1c1e" fontFamily="-apple-system,sans-serif">
          {date}
        </text>
        {/* Subtle shadow under header */}
        <rect y="32" width="100" height="3" fill="rgba(0,0,0,0.06)" />
        {/* Top gloss */}
        <rect width="100" height="16" fill="rgba(255,255,255,0.2)" />
      </svg>
    </div>
  );
}

function PreviewIcon() {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "22%", overflow: "hidden", position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="prevBg" x1="0%" y1="0%" x2="30%" y2="100%">
            <stop offset="0%" stopColor="#6ec6ff" />
            <stop offset="100%" stopColor="#1a8fe3" />
          </linearGradient>
          <linearGradient id="prevPaper" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f0f4ff" />
          </linearGradient>
          <linearGradient id="prevSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87ceeb" />
            <stop offset="100%" stopColor="#b8e4ff" />
          </linearGradient>
        </defs>
        {/* Background */}
        <rect width="100" height="100" fill="url(#prevBg)" />
        {/* Paper / document */}
        <rect x="14" y="10" width="72" height="80" rx="5" fill="url(#prevPaper)" />
        <rect x="14" y="10" width="72" height="3" rx="1.5" fill="rgba(255,255,255,0.6)" />
        {/* Image area inside paper */}
        <rect x="20" y="18" width="60" height="42" rx="3" fill="url(#prevSky)" />
        {/* Mountains */}
        <polygon points="20,60 38,36 56,60" fill="#4a9a40" opacity="0.85" />
        <polygon points="40,60 58,30 76,60" fill="#3d8535" opacity="0.9" />
        <polygon points="30,60 44,44 58,60" fill="#5ab44e" opacity="0.7" />
        {/* Sun */}
        <circle cx="68" cy="28" r="6" fill="#ffe566" opacity="0.95" />
        {/* Text lines below image */}
        <rect x="20" y="66" width="48" height="3" rx="1.5" fill="#1c1c1e" opacity="0.25" />
        <rect x="20" y="72" width="36" height="2.5" rx="1.2" fill="#1c1c1e" opacity="0.15" />
        <rect x="20" y="78" width="42" height="2.5" rx="1.2" fill="#1c1c1e" opacity="0.15" />
        {/* Top gloss */}
        <rect width="100" height="20" fill="rgba(255,255,255,0.18)" />
      </svg>
    </div>
  );
}

function VSCodeIcon() {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "22%", overflow: "hidden", position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="vsBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a5fc4" />
            <stop offset="100%" stopColor="#1a3a9e" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#vsBg)" />
        {/* VS Code logo — angular bracket shape */}
        {/* Left chevron < */}
        <polyline points="28,28 12,50 28,72" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
        {/* Right portion: top-right to bottom-left diagonal, connected */}
        <polyline points="72,18 38,50 72,82" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        {/* Connecting line top-right corner */}
        <line x1="72" y1="18" x2="88" y2="28" stroke="white" strokeWidth="9" strokeLinecap="round" opacity="0.85" />
        <line x1="72" y1="82" x2="88" y2="72" stroke="white" strokeWidth="9" strokeLinecap="round" opacity="0.85" />
        {/* Top gloss */}
        <rect width="100" height="20" fill="rgba(255,255,255,0.12)" />
      </svg>
    </div>
  );
}

function WordIcon() {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "22%", overflow: "hidden", position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="wordBg" x1="0%" y1="0%" x2="30%" y2="100%">
            <stop offset="0%" stopColor="#41a5ee" />
            <stop offset="100%" stopColor="#185abd" />
          </linearGradient>
          <linearGradient id="wordPaper" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e8f0fe" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#wordBg)" />
        {/* Paper sheet */}
        <rect x="42" y="14" width="46" height="58" rx="3" fill="url(#wordPaper)" opacity="0.95" />
        {/* Lines on paper */}
        {[28, 36, 44, 52, 60].map((y, i) => (
          <rect key={i} x="48" y={y} width={i % 2 === 0 ? 32 : 24} height="2.5" rx="1.2" fill="#2c5fa5" opacity="0.25" />
        ))}
        {/* Big "W" */}
        <text x="12" y="70" fontSize="56" fontWeight="900" fill="white" fontFamily="-apple-system, 'Helvetica Neue', Arial, sans-serif" opacity="0.97">W</text>
        {/* Top gloss */}
        <rect width="100" height="20" fill="rgba(255,255,255,0.15)" />
      </svg>
    </div>
  );
}

function LaunchpadIconDock() {
  // 4×4 grid of small rounded squares on a translucent silver background —
  // mirrors macOS's Launchpad icon (rocket-on-grid in older versions, plain
  // grid in modern). Keeping it grid-only sidesteps needing color art that
  // doesn't fit the system-tinted glass icons elsewhere.
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lp-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9ca3b0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#5e6573" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="40" height="40" rx="9" fill="url(#lp-bg)" />
      {[0, 1, 2, 3].flatMap((row) =>
        [0, 1, 2, 3].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={6 + col * 7.5}
            y={6 + row * 7.5}
            width="5"
            height="5"
            rx="1.2"
            fill="rgba(255,255,255,0.88)"
          />
        )),
      )}
    </svg>
  );
}

function SpotifyDockIcon() {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "22%", overflow: "hidden", position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="spotBg" cx="40%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#1ed760" />
            <stop offset="100%" stopColor="#158a3e" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#spotBg)" />
        {/* Spotify logo: circle + 3 arcs */}
        <circle cx="50" cy="50" r="34" fill="black" opacity="0.15" />
        <circle cx="50" cy="50" r="32" fill="black" opacity="0.08" />
        {/* Arc 1 — top, widest */}
        <path d="M 26 38 Q 50 26 74 36" fill="none" stroke="black" strokeWidth="6" strokeLinecap="round" opacity="0.75" />
        {/* Arc 2 — middle */}
        <path d="M 29 51 Q 50 40 71 49" fill="none" stroke="black" strokeWidth="5.5" strokeLinecap="round" opacity="0.75" />
        {/* Arc 3 — bottom, narrowest */}
        <path d="M 33 64 Q 50 55 67 62" fill="none" stroke="black" strokeWidth="4.5" strokeLinecap="round" opacity="0.75" />
        {/* Top gloss */}
        <ellipse cx="42" cy="34" rx="18" ry="10" fill="white" opacity="0.18" />
      </svg>
    </div>
  );
}

function ClockIcon() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  // Static fallback (10:10 — classic watch display angle) used during SSR / before hydration
  const h = now ? now.getHours() % 12 : 10;
  const m = now ? now.getMinutes() : 10;
  const s = now ? now.getSeconds() : 0;
  const hAngle = (h * 30 + m * 0.5) - 90;
  const mAngle = m * 6 - 90;
  const sAngle = s * 6 - 90;
  const toXY = (a: number, len: number) => ({ x: _r(50 + len * Math.cos(a * Math.PI / 180)), y: _r(50 + len * Math.sin(a * Math.PI / 180)) });
  const hEnd = toXY(hAngle, 26);
  const mEnd = toXY(mAngle, 33);
  const sEnd = toXY(sAngle, 35);
  const sTail = toXY(sAngle + 180, 9);
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "22%", overflow: "hidden", position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="clkBg" x1="0%" y1="0%" x2="30%" y2="100%">
            <stop offset="0%" stopColor="#2c2c2e" />
            <stop offset="100%" stopColor="#1a1a1c" />
          </linearGradient>
          <radialGradient id="clkFace" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f0f0f0" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#clkBg)" />
        {/* Bezel */}
        <circle cx="50" cy="50" r="43" fill="rgba(255,255,255,0.12)" />
        <circle cx="50" cy="50" r="41" fill="rgba(0,0,0,0.3)" />
        {/* Face */}
        <circle cx="50" cy="50" r="39" fill="url(#clkFace)" />
        {/* Hour markers */}
        {CLOCK_HOUR_TICKS.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#1c1c1e" strokeOpacity={t.isMaj ? 0.85 : 0.4} strokeWidth={t.isMaj ? 2.5 : 1.5} strokeLinecap="round" />
        ))}
        {/* Hour hand */}
        <line x1="50" y1="50" x2={hEnd.x} y2={hEnd.y} stroke="#1c1c1e" strokeWidth="4.5" strokeLinecap="round" />
        {/* Minute hand */}
        <line x1="50" y1="50" x2={mEnd.x} y2={mEnd.y} stroke="#1c1c1e" strokeWidth="3" strokeLinecap="round" />
        {/* Second hand */}
        <line x1={sTail.x} y1={sTail.y} x2={sEnd.x} y2={sEnd.y} stroke="#FF3B30" strokeWidth="1.5" strokeLinecap="round" />
        {/* Center */}
        <circle cx="50" cy="50" r="3.5" fill="#1c1c1e" />
        <circle cx="50" cy="50" r="1.8" fill="#FF3B30" />
        {/* Gloss */}
        <ellipse cx="40" cy="35" rx="14" ry="9" fill="white" opacity="0.22" />
      </svg>
      {/* Outer bezel highlight */}
      <div style={{ position: "absolute", inset: 0, borderRadius: "22%", boxShadow: "inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.5)", pointerEvents: "none" }} />
    </div>
  );
}

// --- Dock item definitions ---
export interface DockAppItem {
  nameKey: string;
  icon?: string;
  svgIcon?: React.ReactNode;
  appId: string;
}

// Exported so Launchpad can render the same set of apps without duplicating
// icon definitions. Read-only consumer contract.
export const dockAppItems: DockAppItem[] = [
  { nameKey: "dock.finder",     icon: "finder.webp",         appId: "finder" },
  { nameKey: "dock.safari",     svgIcon: <SafariIcon />,     appId: "safari" },
  { nameKey: "dock.notes",      svgIcon: <NotesIcon />,      appId: "notes" },
  { nameKey: "dock.textedit",   svgIcon: <TextEditIcon />,   appId: "textedit" },
  { nameKey: "dock.terminal",   svgIcon: <TerminalIcon />,   appId: "terminal" },
  { nameKey: "dock.calculator", svgIcon: <CalculatorIcon />, appId: "calculator" },
  { nameKey: "dock.calendar",   svgIcon: <CalendarIcon />,   appId: "calendar" },
  { nameKey: "dock.clock",      svgIcon: <ClockIcon />,      appId: "clock" },
  { nameKey: "dock.settings",   svgIcon: <SettingsIcon />,   appId: "settings" },
  { nameKey: "dock.preview",    svgIcon: <PreviewIcon />,    appId: "preview" },
  { nameKey: "dock.vscode",     svgIcon: <VSCodeIcon />,     appId: "vscode" },
  { nameKey: "dock.word",       svgIcon: <WordIcon />,       appId: "word" },
  { nameKey: "dock.music",      svgIcon: <SpotifyDockIcon />, appId: "music" },
];

const folderItemDefs = [
  { nameKey: "dock.downloads", icon: "downloads.webp" },
  { nameKey: "dock.trash",     icon: "trash.webp" },
] as const;

const BASE_SIZE = 56;
const MAX_SIZE = 76;
const MAG_RANGE = 160;

interface CtxMenuState { x: number; y: number; items: CtxMenuItem[] }

export function Dock({
  onLaunchApp,
  onShowLaunchpad,
}: {
  // Widened to accept meta — trash click passes initialPath so the new Finder
  // window opens directly at .Trash rather than the Downloads default.
  onLaunchApp?: (appId: string, meta?: Record<string, string>) => string | null;
  /** Open the full-screen Launchpad overlay. The Launchpad isn't a real app
   *  (no window / process), it's a system surface, so it lives outside the
   *  appId launch flow. */
  onShowLaunchpad?: () => void;
}) {
  const { dockRef, scales, onMouseMove, onMouseEnter, onMouseLeave } =
    useDockMagnification(BASE_SIZE, MAX_SIZE, MAG_RANGE);
  const { getProcessesByAppId, kill } = useProcesses();
  const { state: wmState, dispatch: wmDispatch, focusWindow } = useWindowManager();
  const fs = useFileSystemOptional();
  const t = useT();
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

  // Trash full/empty drives a corner badge on the trash icon. Re-derived from
  // fs state, so any moveToTrash / emptyTrash anywhere in the app updates the
  // dock indicator without a manual subscription.
  const trashEntryCount = fs ? fs.readDir(TRASH_DIR).length : 0;

  const minimizedWindows = Array.from(wmState.windows.values()).filter(
    (w) => w.status === "minimized"
  );

  const getDockItemDef = (appId: string) => dockAppItems.find((item) => item.appId === appId);

  const getScale = (index: number) => (scales.length > 0 ? scales[index] ?? 1 : 1);

  const openContextMenu = useCallback(
    (appId: string, x: number, y: number) => {
      const procs = getProcessesByAppId(appId);
      const isRunning = procs.length > 0;
      const windowsForApp = Array.from(wmState.windows.values()).filter(
        (w) => w.appId === appId
      );
      const items: CtxMenuItem[] = [
        {
          label: t("dock.ctx.newWindow"),
          action: () => onLaunchApp?.(appId),
        },
        { separator: true },
        {
          label: t("dock.ctx.showAllWindows"),
          disabled: windowsForApp.length === 0,
          action: () => {
            windowsForApp.forEach((w) => {
              if (w.status === "minimized") wmDispatch({ type: "RESTORE_WINDOW", id: w.id });
            });
            const top = windowsForApp[windowsForApp.length - 1];
            if (top) focusWindow(top.id);
          },
        },
        {
          label: t("dock.ctx.hide"),
          disabled: !isRunning,
          action: () => {
            windowsForApp.forEach((w) => {
              if (w.status !== "minimized") wmDispatch({ type: "MINIMIZE_WINDOW", id: w.id });
            });
          },
        },
        { separator: true },
        {
          label: t("dock.ctx.forceQuit"),
          disabled: !isRunning,
          action: () => procs.forEach((p) => kill(p.id)),
        },
      ];
      setCtxMenu({ x, y, items });
    },
    [getProcessesByAppId, kill, onLaunchApp, t, wmState, wmDispatch, focusWindow]
  );

  // Launchpad is a system-level overlay (not an app process), so it doesn't
  // count toward app items. It still occupies one slot in the dock for the
  // magnification scale calc.
  const launchpadSlot = onShowLaunchpad ? 1 : 0;
  const totalPermanentItems = dockAppItems.length + launchpadSlot + folderItemDefs.length;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9998]">
      <div
        ref={dockRef}
        className="glass-surface glass-radius-panel flex items-end gap-1 px-4 pb-2 pt-3"
        onMouseMove={onMouseMove}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {dockAppItems.map((item, i) => {
          const procs = getProcessesByAppId(item.appId);
          const windowsForApp = Array.from(wmState.windows.values()).filter(
            (w) => w.appId === item.appId
          );
          const allMinimized =
            windowsForApp.length > 0 && windowsForApp.every((w) => w.status === "minimized");
          return (
            <DockItem
              key={item.appId}
              name={t(item.nameKey)}
              icon={item.icon}
              svgIcon={item.svgIcon}
              isRunning={procs.length > 0}
              onClick={() => {
                if (procs.length > 0) {
                  if (allMinimized) {
                    wmDispatch({ type: "RESTORE_WINDOW", id: windowsForApp[0].id });
                    focusWindow(windowsForApp[0].id);
                  } else {
                    focusWindow(procs[0].windowId);
                  }
                } else {
                  onLaunchApp?.(item.appId);
                }
              }}
              onContextMenu={(x, y) => openContextMenu(item.appId, x, y)}
              scale={getScale(i)}
              baseSize={BASE_SIZE}
            />
          );
        })}
        {/* Launchpad — the rocket-on-grid system button. Sits at the end of
            the app strip, just before the folder separator, matching macOS. */}
        {onShowLaunchpad && (
          <DockItem
            name={t("dock.launchpad")}
            svgIcon={<LaunchpadIconDock />}
            onClick={() => onShowLaunchpad()}
            scale={getScale(dockAppItems.length)}
            baseSize={BASE_SIZE}
          />
        )}
        <DockSeparator />
        {folderItemDefs.map((item, i) => {
          const scale = getScale(dockAppItems.length + launchpadSlot + i);
          if (item.nameKey === "dock.trash") {
            const hasItems = trashEntryCount > 0;
            return (
              <div key={item.nameKey} style={{ position: "relative" }} data-dock-item>
                <DockItem
                  name={`${t(item.nameKey)}${hasItems ? ` (${trashEntryCount})` : ""}`}
                  icon={item.icon}
                  onClick={() => {
                    // Match macOS: clicking Trash in the dock with an existing
                    // Finder window pointed at .Trash focuses that window
                    // rather than spawning a fresh one. We look for any Finder
                    // already at TRASH_DIR (or its subdirs), focus the
                    // top-most one, and only launch a new Finder if none found.
                    const existing = Array.from(wmState.windows.values()).filter(
                      (w) =>
                        w.appId === "finder" &&
                        typeof w.meta?.initialPath === "string" &&
                        (w.meta.initialPath === TRASH_DIR ||
                          w.meta.initialPath.startsWith(`${TRASH_DIR}/`)),
                    );
                    if (existing.length > 0) {
                      const top = existing[existing.length - 1];
                      if (top.status === "minimized") {
                        wmDispatch({ type: "RESTORE_WINDOW", id: top.id });
                      }
                      focusWindow(top.id);
                      return;
                    }
                    onLaunchApp?.("finder", { initialPath: TRASH_DIR });
                  }}
                  scale={scale}
                  baseSize={BASE_SIZE}
                />
                {hasItems && (
                  // Red dot badge in the upper-right corner — same affordance
                  // macOS uses on a full trash. Positioned absolutely so it
                  // rides along during dock magnification scaling.
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 4,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#ff3b30",
                      border: "1.5px solid rgba(28,28,30,0.85)",
                      pointerEvents: "none",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                    }}
                  />
                )}
              </div>
            );
          }
          return (
            <DockItem
              key={item.nameKey}
              name={t(item.nameKey)}
              icon={item.icon}
              scale={scale}
              baseSize={BASE_SIZE}
            />
          );
        })}
        {minimizedWindows.length > 0 && (
          <>
            <DockSeparator />
            {minimizedWindows.map((win, i) => {
              const def = getDockItemDef(win.appId);
              return (
                <DockItem
                  key={win.id}
                  name={win.title}
                  icon={def?.icon}
                  svgIcon={def?.svgIcon}
                  isRunning
                  onClick={() => {
                    wmDispatch({ type: "RESTORE_WINDOW", id: win.id });
                    focusWindow(win.id);
                  }}
                  scale={getScale(totalPermanentItems + i)}
                  baseSize={BASE_SIZE}
                />
              );
            })}
          </>
        )}
      </div>
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenu.items}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

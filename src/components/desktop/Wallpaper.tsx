"use client";

import { useEffect, useState } from "react";
import { useSystem } from "@/contexts/SystemContext";

// ── Wallpaper palettes ──────────────────────────────────────────────────
// Aurora-style wallpaper: a base linear gradient + 4 large soft "light blobs"
// drifting slowly via CSS keyframes. This replaces the earlier canvas-based
// horizontal sine waves, which read as mechanical demo art rather than the
// organic "morning light through fog" look real macOS wallpapers carry from
// Big Sur onward.
//
// Why CSS not canvas:
//   - No per-frame JS work → smoother, lighter on battery.
//   - prefers-reduced-motion is one line away.
//   - Easier to tune palettes — every value is just CSS.

type Blob = {
  /** Center color of the radial gradient. The outer 65%+ fades to transparent. */
  color: string;
  /** Diameter as a % of vmax — 70 means the blob is ~70% of the longer screen side. */
  size: number;
  /** Anchor position (% of the wallpaper container). Centers the blob via translate(-50%,-50%). */
  x: number;
  y: number;
  /** Pick one of 4 named keyframes (defined in globals.css). Each takes a
   *  different lazy figure-eight so the blobs don't all drift in sync. */
  drift: 0 | 1 | 2 | 3;
  /** Negative delay (seconds) to start mid-cycle. Lets two blobs share the
   *  same drift keyframe but appear independent — multiplies apparent count
   *  without doubling the keyframe table. */
  delay?: number;
};

interface Palette {
  /** Base linear-gradient background — sets the deep tonal floor that blobs
   *  light up on top of. Steep vertical gradients echo the macOS look. */
  base: string;
  /** 4 large soft light blobs. Order doesn't matter for correctness, but later
   *  entries paint on top in normal blending — keeps render predictable. */
  blobs: Blob[];
  /** screen for dark palettes (additive light reads as glow), normal for
   *  light palettes (otherwise blobs blow out into pure white). */
  blend: "screen" | "normal";
}

const PALETTES: Record<string, Palette> = {
  // Deep cosmic navy with violet aurora — successor to the original "Monterey".
  // 6 blobs across 4 keyframes (using `delay` to offset the 2 reused tracks) —
  // gives the impression of more independent flowing color masses without
  // doubling the keyframe table.
  "monterey-dark": {
    base: "linear-gradient(180deg, #07061a 0%, #0e1140 35%, #1a1a6e 70%, #221a82 100%)",
    blend: "screen",
    blobs: [
      { color: "rgba(94, 60, 220, 0.55)",  size: 88, x: 12, y: 18, drift: 0 },
      { color: "rgba(140, 70, 230, 0.45)", size: 72, x: 70, y: 30, drift: 1 },
      { color: "rgba(60, 90, 200, 0.50)",  size: 86, x: 80, y: 80, drift: 2 },
      { color: "rgba(190, 110, 240, 0.38)", size: 64, x: 25, y: 80, drift: 3 },
      { color: "rgba(70, 50, 180, 0.42)",  size: 78, x: 45, y: 50, drift: 0, delay: 55 },
      { color: "rgba(160, 90, 220, 0.34)", size: 60, x: 90, y: 12, drift: 2, delay: 70 },
    ],
  },
  // Sequoia-style teal sunrise — cool blue-green with a warm seam.
  "sequoia-teal": {
    base: "linear-gradient(180deg, #03253a 0%, #064a5c 40%, #0e6e6e 75%, #1c8f7a 100%)",
    blend: "screen",
    blobs: [
      { color: "rgba(30, 200, 180, 0.50)",  size: 84, x: 15, y: 70, drift: 0 },
      { color: "rgba(80, 150, 200, 0.45)",  size: 72, x: 65, y: 20, drift: 1 },
      { color: "rgba(40, 130, 150, 0.55)",  size: 88, x: 50, y: 50, drift: 2 },
      { color: "rgba(150, 230, 220, 0.34)", size: 62, x: 80, y: 75, drift: 3 },
      { color: "rgba(60, 180, 200, 0.38)",  size: 76, x: 30, y: 30, drift: 1, delay: 55 },
      { color: "rgba(120, 220, 200, 0.30)", size: 58, x: 90, y: 50, drift: 3, delay: 70 },
    ],
  },
  // Ventura warm — sunset pinks and amber, the most colorful preset.
  "ventura-warm": {
    base: "linear-gradient(180deg, #2a0e3a 0%, #6e1a5a 35%, #c44060 70%, #ef9070 100%)",
    blend: "screen",
    blobs: [
      { color: "rgba(255, 120, 110, 0.55)", size: 86, x: 18, y: 65, drift: 0 },
      { color: "rgba(220, 80, 140, 0.50)",  size: 70, x: 65, y: 25, drift: 1 },
      { color: "rgba(255, 180, 100, 0.45)", size: 78, x: 40, y: 8,  drift: 2 },
      { color: "rgba(180, 50, 120, 0.44)",  size: 62, x: 82, y: 75, drift: 3 },
      { color: "rgba(255, 140, 90, 0.36)",  size: 80, x: 50, y: 90, drift: 0, delay: 55 },
      { color: "rgba(200, 60, 100, 0.32)",  size: 58, x: 85, y: 45, drift: 2, delay: 70 },
    ],
  },
  // Sonoma light — pastel sky, lower contrast, for light-mode taste.
  // Uses normal blending — screen would push the highlights to pure white.
  "sonoma-light": {
    base: "linear-gradient(180deg, #c0d8f0 0%, #d2c5ee 50%, #f0d4e0 100%)",
    blend: "normal",
    blobs: [
      { color: "rgba(180, 200, 255, 0.55)", size: 86, x: 18, y: 18, drift: 0 },
      { color: "rgba(220, 200, 255, 0.50)", size: 72, x: 70, y: 35, drift: 1 },
      { color: "rgba(255, 220, 240, 0.45)", size: 86, x: 35, y: 70, drift: 2 },
      { color: "rgba(200, 230, 255, 0.45)", size: 62, x: 82, y: 78, drift: 3 },
      { color: "rgba(240, 210, 250, 0.40)", size: 78, x: 50, y: 50, drift: 0, delay: 55 },
      { color: "rgba(210, 240, 255, 0.36)", size: 58, x: 88, y: 15, drift: 2, delay: 70 },
    ],
  },
};

const DEFAULT_PALETTE_KEY = "monterey-dark";

export function Wallpaper() {
  const { wallpaper } = useSystem();
  const palette = PALETTES[wallpaper] ?? PALETTES[DEFAULT_PALETTE_KEY];

  // Per-session randomization — each blob's position, size, and animation
  // phase get jittered so two visits never look identical. Lives in state
  // populated by useEffect rather than useMemo (Math.random() in render
  // would cause an SSR/CSR hydration mismatch — server gets one set of
  // values, client another, React warns and remounts). First-render uses
  // the deterministic palette.blobs so hydration matches; mount then swaps
  // in the jittered version a few ms later. Visually unnoticeable because
  // the wallpaper sits behind LoginScreen on initial load.
  const [randomized, setRandomized] = useState<Blob[]>(palette.blobs);
  useEffect(() => {
    setRandomized(palette.blobs.map(b => {
      const jitterX = (Math.random() - 0.5) * 20; // ±10% nudge
      const jitterY = (Math.random() - 0.5) * 20;
      const jitterSize = (Math.random() - 0.5) * 16; // ±8 vmax
      // Random animation start offset (added to any existing delay) so blobs
      // sharing a keyframe pick genuinely independent points in their cycles.
      const phaseOffset = Math.floor(Math.random() * 120); // 0..120s
      const baseDelay = b.delay ?? 0;
      return {
        ...b,
        x: Math.max(-5, Math.min(105, b.x + jitterX)),
        y: Math.max(-5, Math.min(105, b.y + jitterY)),
        size: Math.max(40, b.size + jitterSize),
        delay: baseDelay + phaseOffset,
      };
    }));
  }, [palette]);

  return (
    <div
      className="wp-stage absolute inset-0 overflow-hidden"
      style={{ background: palette.base }}
      aria-hidden
    >
      {randomized.map((b, i) => (
        <div
          key={i}
          className="wp-blob"
          style={{
            position: "absolute",
            left: `${b.x}%`,
            top: `${b.y}%`,
            // vmax keeps blobs proportional whether the user has a tall or wide window.
            width: `${b.size}vmax`,
            height: `${b.size}vmax`,
            // center-anchor + drift via translate (no transform-origin headaches)
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle at 50% 50%, ${b.color} 0%, transparent 62%)`,
            // Heavy blur smears the radial edge into a soft cloud — without this
            // you can see the discrete gradient stop and it looks like a planet.
            filter: "blur(36px)",
            mixBlendMode: palette.blend,
            // Each blob picks one of 4 keyframes so motion isn't perfectly synced.
            // 100-130s cycles feel like an ambient slow tide; the per-blob delay
            // (now jittered) lets blobs sharing a keyframe stay independent.
            animation: `wp-drift-${b.drift} ${100 + b.drift * 10}s ease-in-out infinite alternate`,
            animationDelay: b.delay ? `-${b.delay}s` : undefined,
            willChange: "transform",
            pointerEvents: "none",
          }}
        />
      ))}
      {/* Subtle vignette — pulls focus to center and adds depth without */}
      {/* darkening the whole frame. Sits above blobs so the corners feel cooler. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.22) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// Export palette keys so Settings can render a picker
export const WALLPAPER_PRESETS = [
  { id: "monterey-dark", labelKey: "wallpaper.montereyDark", swatch: "linear-gradient(135deg, #0a0a4a, #2b1664)" },
  { id: "sequoia-teal",  labelKey: "wallpaper.sequoiaTeal",  swatch: "linear-gradient(135deg, #06324b, #2c8a8c)" },
  { id: "ventura-warm",  labelKey: "wallpaper.venturaWarm",  swatch: "linear-gradient(135deg, #5e1a3f, #f0a07f)" },
  { id: "sonoma-light",  labelKey: "wallpaper.sonomaLight",  swatch: "linear-gradient(135deg, #a8c5e6, #d4c4f5)" },
];

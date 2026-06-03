"use client";

import { useEffect, useRef } from "react";
import { useSystem } from "@/contexts/SystemContext";

// ── Wallpaper palettes ──────────────────────────────────────────────────
// Each palette defines two gradient stops (cycle endpoints) and wave colors.
// The animation lerps between phaseA and phaseB over time.

type RGB = [number, number, number];

interface Palette {
  /** 4-stop vertical gradient — phase A */
  phaseA: [RGB, RGB, RGB, RGB];
  /** 4-stop vertical gradient — phase B */
  phaseB: [RGB, RGB, RGB, RGB];
  /** Wave top color (base RGB + delta-blue applied via blend) */
  waveBaseTop: RGB;
  /** Wave bottom color (constant) */
  waveBaseBot: RGB;
  /** Corner glow color */
  glow: RGB;
  /** Crest shimmer color (rgba prefix) */
  shimmer: string;
}

const PALETTES: Record<string, Palette> = {
  // Deep blue ↔ evening violet — the original
  "monterey-dark": {
    phaseA: [[8, 8, 55], [12, 25, 85], [14, 48, 125], [16, 68, 162]],
    phaseB: [[20, 4, 50], [55, 10, 90], [50, 15, 118], [28, 18, 100]],
    waveBaseTop: [35, 45, 130],
    waveBaseBot: [8, 10, 45],
    glow: [70, 30, 150],
    shimmer: "rgba(210, 190, 255",
  },
  // Cool teal sunset — Sequoia-ish
  "sequoia-teal": {
    phaseA: [[6, 30, 50], [10, 60, 95], [14, 95, 130], [18, 130, 160]],
    phaseB: [[20, 50, 70], [40, 100, 110], [55, 140, 130], [70, 170, 140]],
    waveBaseTop: [30, 110, 130],
    waveBaseBot: [10, 40, 55],
    glow: [40, 130, 150],
    shimmer: "rgba(190, 240, 230",
  },
  // Warm sunset — orange & rose
  "ventura-warm": {
    phaseA: [[40, 15, 70], [110, 35, 85], [180, 65, 95], [220, 100, 95]],
    phaseB: [[60, 25, 50], [150, 55, 70], [220, 110, 95], [240, 160, 130]],
    waveBaseTop: [180, 70, 120],
    waveBaseBot: [40, 15, 55],
    glow: [220, 90, 130],
    shimmer: "rgba(255, 220, 200",
  },
  // Light midday — for users who want light mode wallpaper
  "sonoma-light": {
    phaseA: [[160, 195, 230], [180, 215, 240], [195, 225, 245], [215, 235, 250]],
    phaseB: [[200, 175, 235], [220, 195, 245], [235, 215, 250], [245, 230, 252]],
    waveBaseTop: [180, 200, 235],
    waveBaseBot: [120, 150, 200],
    glow: [220, 200, 240],
    shimmer: "rgba(255, 255, 255",
  },
};

const DEFAULT_PALETTE_KEY = "monterey-dark";

export function Wallpaper() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { wallpaper } = useSystem();
  // Resolve palette (fall back to default for unknown ids)
  const palette = PALETTES[wallpaper] ?? PALETTES[DEFAULT_PALETTE_KEY];
  // Use a ref so the render loop reads the latest palette without restarting
  const paletteRef = useRef<Palette>(palette);
  paletteRef.current = palette;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;
    let colorPhase = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    function lerpRGB(a: RGB, b: RGB, k: number): string {
      const r = Math.round(a[0] + (b[0] - a[0]) * k);
      const g = Math.round(a[1] + (b[1] - a[1]) * k);
      const bl = Math.round(a[2] + (b[2] - a[2]) * k);
      return `rgb(${r},${g},${bl})`;
    }

    function drawWave(
      yCenter: number,
      amplitude: number,
      wavelength: number,
      phaseOffset: number,
      speed: number,
      h2Speed: number,
      h3Speed: number,
      colorTop: string,
      colorBot: string,
      shimmer: string,
    ) {
      const W = canvas!.width;
      const H = canvas!.height;
      const yC = yCenter * H;

      const profile = (x: number) => {
        const base = (x / wavelength) * Math.PI * 2;
        return (
          Math.sin(base             + t * speed              + phaseOffset      ) * 0.58 +
          Math.sin(base * 1.7       + t * speed * h2Speed    + phaseOffset * 1.3) * 0.27 +
          Math.sin(base * 2.8       + t * speed * h3Speed    + phaseOffset * 2.1) * 0.15
        ) * amplitude;
      };

      ctx!.beginPath();
      ctx!.moveTo(0, H);
      for (let x = 0; x <= W; x += 3) ctx!.lineTo(x, yC + profile(x));
      ctx!.lineTo(W, H);
      ctx!.closePath();

      const grad = ctx!.createLinearGradient(0, yC - amplitude, 0, H);
      grad.addColorStop(0, colorTop);
      grad.addColorStop(1, colorBot);
      ctx!.fillStyle = grad;
      ctx!.fill();

      ctx!.beginPath();
      for (let x = 0; x <= W; x += 3) {
        if (x === 0) ctx!.moveTo(x, yC + profile(x));
        else ctx!.lineTo(x, yC + profile(x));
      }
      ctx!.strokeStyle = `${shimmer}, ${0.07 + speed * 0.04})`;
      ctx!.lineWidth = 1.2;
      ctx!.stroke();
    }

    function render() {
      const W = canvas!.width;
      const H = canvas!.height;
      const p = paletteRef.current;
      const blend = (Math.sin(colorPhase) + 1) * 0.5;

      // Background gradient — lerp between phase A and B
      const bg = ctx!.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0,    lerpRGB(p.phaseA[0], p.phaseB[0], blend));
      bg.addColorStop(0.30, lerpRGB(p.phaseA[1], p.phaseB[1], blend));
      bg.addColorStop(0.65, lerpRGB(p.phaseA[2], p.phaseB[2], blend));
      bg.addColorStop(1,    lerpRGB(p.phaseA[3], p.phaseB[3], blend));
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, W, H);

      // Wave tops shift slightly with phase
      const [r, g, b] = p.waveBaseTop;
      const w1top = `rgba(${Math.round(r * 0.7 + blend * 15)}, ${Math.round(g * 0.78 + blend * 5)}, ${Math.round(b * 0.73 + blend * 20)}, 0.88)`;
      const w2top = `rgba(${Math.round(r * 1.00 + blend * 10)}, ${Math.round(g * 1.00 + blend * 5)}, ${Math.round(b * 1.00 + blend * 10)}, 0.75)`;
      const w3top = `rgba(${Math.round(r * 1.30)}, ${Math.round(g * 1.30)}, ${Math.round(b * 1.25)}, 0.58)`;
      const [br, bg2, bb] = p.waveBaseBot;
      const wBot1 = `rgba(${br}, ${bg2}, ${bb}, 0.55)`;
      const wBot2 = `rgba(${br + 4}, ${bg2 + 8}, ${bb + 20}, 0.42)`;
      const wBot3 = `rgba(${br + 10}, ${bg2 + 18}, ${bb + 40}, 0.28)`;

      drawWave(0.48, H * 0.18, W * 1.50, 0,               0.18, 1.05, 0.90, w1top, wBot1, p.shimmer);
      drawWave(0.62, H * 0.12, W * 1.05, Math.PI * 0.75,  0.55, 1.40, 0.55, w2top, wBot2, p.shimmer);
      drawWave(0.74, H * 0.07, W * 0.70, Math.PI * 1.40,  1.20, 2.20, 0.38, w3top, wBot3, p.shimmer);

      // Corner glow
      const [gr, gg, gb] = p.glow;
      const glow = ctx!.createRadialGradient(-W * 0.08, -H * 0.08, 0, -W * 0.08, -H * 0.08, W * 0.65);
      glow.addColorStop(0, `rgba(${gr}, ${gg}, ${gb}, 0.42)`);
      glow.addColorStop(1, `rgba(${gr}, ${gg}, ${gb}, 0)`);
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, W, H);

      t          += 0.0010;
      colorPhase += 0.0004;
      animId = requestAnimationFrame(render);
    }

    render();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(0.5px) saturate(1.3)",
          WebkitBackdropFilter: "blur(0.5px) saturate(1.3)",
          background: "rgba(255,255,255,0.025)",
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

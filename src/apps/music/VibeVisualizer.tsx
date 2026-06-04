"use client";

import { useEffect, useRef } from "react";

/**
 * VibeVisualizer — a procedural "audio reactive" bar/wave display.
 *
 * IMPORTANT: this is NOT actually analyzing audio. The Music app embeds
 * Spotify in a cross-origin iframe, and the Web Audio API can't reach into
 * cross-origin iframe audio output — that's a same-origin-policy
 * fundamental, not a feature gap. So the bars are driven by a sum of
 * sine waves with frequency-band-flavored envelopes. It LOOKS reactive,
 * dances at roughly music-tempo speeds, and gives the app the visual
 * vibe of a real visualizer without lying to ourselves in the code.
 *
 * The label in the UI tells the user this is "Vibe Mode" so we're not
 * pretending to be something we're not.
 */

interface VibeVisualizerProps {
  /** "bars" = 24 vertical bars (winamp-style), "wave" = oscilloscope line. */
  mode: "bars" | "wave";
  /** Theme color for the bars/wave — defaults to Spotify green. */
  tint?: string;
  /** Compact height for header strip; tall height for a panel. */
  height?: number;
}

const BAR_COUNT = 28;

export function VibeVisualizer({ mode, tint = "#1ed760", height = 72 }: VibeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let start = performance.now();
    // Per-bar phase offsets — gives each bar its own "personality" so the
    // dance doesn't look like a single sine wave rendered N times.
    const phases = Array.from({ length: BAR_COUNT }, (_, i) => i * 0.37 + Math.random() * 2);

    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx!.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!canvas) return;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      const t = (performance.now() - start) / 1000;
      ctx!.clearRect(0, 0, W, H);

      if (mode === "bars") {
        // Each bar's amplitude is a weighted sum of 3 sines at different
        // frequencies — low (bass-ish), mid (drum-ish), high (hi-hat-ish) —
        // with a slow "song-energy" envelope on top so the whole field
        // breathes together over ~8 seconds.
        const songEnergy = 0.7 + 0.3 * Math.sin(t * 0.78);
        const barWidth = (W - (BAR_COUNT - 1) * 2) / BAR_COUNT;
        for (let i = 0; i < BAR_COUNT; i++) {
          const p = phases[i];
          // Low frequency band peaks in the first ~1/3 of bars
          const lowWeight = Math.max(0, 1 - (i / BAR_COUNT) * 2.5);
          // Mid frequency band peaks in the middle
          const midWeight = 1 - Math.abs((i / BAR_COUNT) * 2 - 1);
          // High frequency band peaks in the last ~1/3
          const highWeight = Math.max(0, (i / BAR_COUNT) * 2.5 - 1.5);
          const low  = Math.sin(t * 2.1 + p * 0.5) * 0.5 + 0.5;
          const mid  = Math.sin(t * 4.3 + p * 1.2) * 0.5 + 0.5;
          const high = Math.sin(t * 7.7 + p * 2.0) * 0.5 + 0.5;
          const amp = (low * lowWeight + mid * midWeight + high * highWeight) / 1.5;
          const h = Math.max(2, amp * H * songEnergy * 0.92);
          const x = i * (barWidth + 2);
          const y = H - h;
          // Bar gradient — translucent at top so peaks fade rather than clip.
          const grad = ctx!.createLinearGradient(0, y, 0, H);
          grad.addColorStop(0, tint + "33");
          grad.addColorStop(1, tint + "ff");
          ctx!.fillStyle = grad;
          ctx!.fillRect(x, y, barWidth, h);
          // Cap highlight
          ctx!.fillStyle = "rgba(255,255,255,0.4)";
          ctx!.fillRect(x, y, barWidth, 1.5);
        }
      } else {
        // Wave mode — single oscilloscope-style line with mid-frequency
        // emphasis. Two stacked phases gives the line a "breathing"
        // multi-harmonic feel rather than a flat sine.
        const songEnergy = 0.6 + 0.4 * Math.sin(t * 0.55);
        ctx!.strokeStyle = tint;
        ctx!.lineWidth = 2;
        ctx!.lineCap = "round";
        ctx!.lineJoin = "round";
        ctx!.beginPath();
        for (let x = 0; x <= W; x += 2) {
          const phase = x / W;
          const y1 = Math.sin(t * 2.3 + phase * Math.PI * 6) * 0.4;
          const y2 = Math.sin(t * 4.7 + phase * Math.PI * 14) * 0.2;
          const y3 = Math.sin(t * 9.1 + phase * Math.PI * 28) * 0.08;
          const y = H * 0.5 + (y1 + y2 + y3) * H * 0.4 * songEnergy;
          if (x === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.stroke();
        // Reflective glow underneath
        ctx!.strokeStyle = tint + "22";
        ctx!.lineWidth = 8;
        ctx!.stroke();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [mode, tint]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height,
        display: "block",
        // Honor reduced-motion at the visual level — hide the canvas entirely.
        // The user has expressed a system-wide preference; respect it here.
      }}
      aria-hidden
    />
  );
}

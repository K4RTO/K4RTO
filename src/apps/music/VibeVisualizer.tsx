"use client";

import { useEffect, useRef } from "react";

/**
 * VibeVisualizer — bar/wave display with two source modes.
 *
 *   Procedural (default): sums of sine waves with frequency-band-flavored
 *     envelopes drive each bar. Looks alive at music tempo but isn't
 *     actually analysing anything. Used when no `analyser` is passed.
 *
 *   Live (when an AnalyserNode is passed): bars are driven by
 *     `getByteFrequencyData()`; waveform by `getByteTimeDomainData()`.
 *     Mounted by the Music app once the user authorises a tab-audio
 *     capture via `navigator.mediaDevices.getDisplayMedia({ audio:true })`.
 *     The analyser is fed from a `MediaStreamAudioSourceNode` over the
 *     captured stream — that's the only path that lets us read audio
 *     produced by a cross-origin Spotify iframe, because the browser
 *     mediates the share via a system-level capture prompt.
 *
 * Switching between sources is cheap: the rAF loop checks `analyserRef`
 * each frame, so unmounting the AnalyserNode just falls back to
 * procedural the very next frame without restarting the canvas.
 */

interface VibeVisualizerProps {
  /** "bars" = vertical bars (winamp-style), "wave" = oscilloscope line. */
  mode: "bars" | "wave";
  /** Theme color for the bars/wave — defaults to Spotify green. */
  tint?: string;
  /** Compact height for header strip; tall height for a panel. */
  height?: number;
  /** When provided, feeds real frequency / time-domain data into the
   *  visualiser instead of the procedural sine source. Null/undefined =
   *  procedural mode. */
  analyser?: AnalyserNode | null;
}

const BAR_COUNT = 28;

export function VibeVisualizer({ mode, tint = "#1ed760", height = 72, analyser }: VibeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Stash the latest analyser in a ref so the draw loop (which only spins up
  // once per mount) sees prop changes without restarting.
  const analyserRef = useRef<AnalyserNode | null>(analyser ?? null);
  useEffect(() => { analyserRef.current = analyser ?? null; }, [analyser]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();
    // Per-bar phase offsets used by procedural mode.
    const phases = Array.from({ length: BAR_COUNT }, (_, i) => i * 0.37 + Math.random() * 2);

    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx!.setTransform(1, 0, 0, 1, 0, 0); // reset before re-scaling on resize
      ctx!.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    /** Sum a chunk of frequency bins down to one bar value [0..1]. Log-scale
     *  the chunk boundaries because human pitch is logarithmic — without
     *  this, the visualiser is bass-heavy and the high bars never move. */
    function liveBars(an: AnalyserNode, out: Float32Array) {
      const buf = new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(buf);
      // Use a log scale across the spectrum so each bar covers a perceptually
      // even slice (low bins → narrow ranges, high bins → wide ranges).
      const minHz = 20;
      const maxHz = 16000;
      const sr = an.context.sampleRate;
      const nyq = sr / 2;
      const binFor = (hz: number) => Math.min(buf.length - 1, Math.floor(hz / nyq * buf.length));
      const logMin = Math.log(minHz);
      const logMax = Math.log(maxHz);
      for (let i = 0; i < BAR_COUNT; i++) {
        const f1 = Math.exp(logMin + (i     / BAR_COUNT) * (logMax - logMin));
        const f2 = Math.exp(logMin + ((i+1) / BAR_COUNT) * (logMax - logMin));
        const a = binFor(f1), b = Math.max(a + 1, binFor(f2));
        let sum = 0;
        for (let k = a; k < b; k++) sum += buf[k];
        out[i] = sum / (b - a) / 255; // 0..1
      }
    }

    /** Live waveform — getByteTimeDomainData returns samples centered at 128
     *  (silence). Subtract 128 and rescale to ±1 for canvas math. */
    function liveWave(an: AnalyserNode, out: Float32Array) {
      const buf = new Uint8Array(an.fftSize);
      an.getByteTimeDomainData(buf);
      // Downsample to canvas width's worth of points — out.length samples.
      const step = buf.length / out.length;
      for (let i = 0; i < out.length; i++) {
        out[i] = (buf[Math.floor(i * step)] - 128) / 128;
      }
    }

    const barsBuf = new Float32Array(BAR_COUNT);
    let waveBuf = new Float32Array(256); // resized in draw() based on canvas width

    function draw() {
      if (!canvas) return;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      const t = (performance.now() - start) / 1000;
      const an = analyserRef.current;
      ctx!.clearRect(0, 0, W, H);

      if (mode === "bars") {
        // Fill barsBuf from live analyser if available, else procedural.
        if (an) {
          liveBars(an, barsBuf);
        } else {
          const songEnergy = 0.7 + 0.3 * Math.sin(t * 0.78);
          for (let i = 0; i < BAR_COUNT; i++) {
            const p = phases[i];
            const lowWeight = Math.max(0, 1 - (i / BAR_COUNT) * 2.5);
            const midWeight = 1 - Math.abs((i / BAR_COUNT) * 2 - 1);
            const highWeight = Math.max(0, (i / BAR_COUNT) * 2.5 - 1.5);
            const low  = Math.sin(t * 2.1 + p * 0.5) * 0.5 + 0.5;
            const mid  = Math.sin(t * 4.3 + p * 1.2) * 0.5 + 0.5;
            const high = Math.sin(t * 7.7 + p * 2.0) * 0.5 + 0.5;
            barsBuf[i] = ((low * lowWeight + mid * midWeight + high * highWeight) / 1.5) * songEnergy;
          }
        }

        const barWidth = (W - (BAR_COUNT - 1) * 2) / BAR_COUNT;
        for (let i = 0; i < BAR_COUNT; i++) {
          const h = Math.max(2, barsBuf[i] * H * 0.92);
          const x = i * (barWidth + 2);
          const y = H - h;
          const grad = ctx!.createLinearGradient(0, y, 0, H);
          grad.addColorStop(0, tint + "33");
          grad.addColorStop(1, tint + "ff");
          ctx!.fillStyle = grad;
          ctx!.fillRect(x, y, barWidth, h);
          ctx!.fillStyle = "rgba(255,255,255,0.4)";
          ctx!.fillRect(x, y, barWidth, 1.5);
        }
      } else {
        // Wave mode
        const points = Math.max(64, Math.floor(W / 2));
        if (waveBuf.length !== points) waveBuf = new Float32Array(points);
        if (an) {
          liveWave(an, waveBuf);
        } else {
          const songEnergy = 0.6 + 0.4 * Math.sin(t * 0.55);
          for (let i = 0; i < points; i++) {
            const phase = i / points;
            const y1 = Math.sin(t * 2.3 + phase * Math.PI * 6) * 0.4;
            const y2 = Math.sin(t * 4.7 + phase * Math.PI * 14) * 0.2;
            const y3 = Math.sin(t * 9.1 + phase * Math.PI * 28) * 0.08;
            waveBuf[i] = (y1 + y2 + y3) * songEnergy;
          }
        }

        ctx!.strokeStyle = tint;
        ctx!.lineWidth = 2;
        ctx!.lineCap = "round";
        ctx!.lineJoin = "round";
        ctx!.beginPath();
        for (let i = 0; i < points; i++) {
          const x = (i / (points - 1)) * W;
          const y = H * 0.5 + waveBuf[i] * H * 0.4;
          if (i === 0) ctx!.moveTo(x, y);
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
      }}
      aria-hidden
    />
  );
}

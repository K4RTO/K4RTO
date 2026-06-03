"use client";

import { useEffect, useRef } from "react";

/**
 * 3-layer animated wallpaper.
 * Waves from back to front: slower / taller / gentler → faster / lower / more turbulent.
 * Background gradient cycles between deep blue and evening dusk blue-violet.
 */
export function Wallpaper() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    function lerpRGB(
      a: [number, number, number],
      b: [number, number, number],
      k: number
    ): string {
      const r = Math.round(a[0] + (b[0] - a[0]) * k);
      const g = Math.round(a[1] + (b[1] - a[1]) * k);
      const bl = Math.round(a[2] + (b[2] - a[2]) * k);
      return `rgb(${r},${g},${bl})`;
    }

    /**
     * Draw one wave layer using three harmonics.
     * Each harmonic advances at its own speed (h2Speed / h3Speed multipliers),
     * so the waveform continuously morphs — not just slides.
     */
    function drawWave(
      yCenter: number,
      amplitude: number,
      wavelength: number,
      phaseOffset: number,
      speed: number,
      h2Speed: number,
      h3Speed: number,
      colorTop: string,
      colorBot: string
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

      // Crest shimmer
      ctx!.beginPath();
      for (let x = 0; x <= W; x += 3) {
        if (x === 0) ctx!.moveTo(x, yC + profile(x));
        else ctx!.lineTo(x, yC + profile(x));
      }
      ctx!.strokeStyle = `rgba(210, 190, 255, ${0.07 + speed * 0.04})`;
      ctx!.lineWidth = 1.2;
      ctx!.stroke();
    }

    function render() {
      const W = canvas!.width;
      const H = canvas!.height;

      // Background: deep ocean blue ↔ evening dusk violet
      const blend = (Math.sin(colorPhase) + 1) * 0.5;

      const blue: Array<[number, number, number]> = [
        [8,   8,  55],
        [12,  25,  85],
        [14,  48, 125],
        [16,  68, 162],
      ];
      const dusk: Array<[number, number, number]> = [
        [20,  4,  50],
        [55, 10,  90],
        [50, 15, 118],
        [28, 18, 100],
      ];

      const bg = ctx!.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0,    lerpRGB(blue[0], dusk[0], blend));
      bg.addColorStop(0.30, lerpRGB(blue[1], dusk[1], blend));
      bg.addColorStop(0.65, lerpRGB(blue[2], dusk[2], blend));
      bg.addColorStop(1,    lerpRGB(blue[3], dusk[3], blend));
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, W, H);

      // Wave fill colors shift with dusk blend
      const w1top = `rgba(${Math.round(22 + blend * 30)}, ${Math.round(35 + blend * 5)},  ${Math.round(95  + blend * 30)}, 0.88)`;
      const w2top = `rgba(${Math.round(35 + blend * 35)}, ${Math.round(45 + blend * 8)},  ${Math.round(130 + blend * 20)}, 0.75)`;
      const w3top = `rgba(${Math.round(50 + blend * 40)}, ${Math.round(60 + blend * 10)}, ${Math.round(160 + blend * 15)}, 0.58)`;

      // Back → front: slow/tall/calm → fast/low/turbulent
      //             yCenter   amp        wavelength    phOff           spd   h2     h3    colorTop  colorBot
      drawWave(0.48, H * 0.18, W * 1.50, 0,               0.18, 1.05, 0.90, w1top, "rgba(8,10,45,0.55)");
      drawWave(0.62, H * 0.12, W * 1.05, Math.PI * 0.75,  0.55, 1.40, 0.55, w2top, "rgba(12,18,65,0.42)");
      drawWave(0.74, H * 0.07, W * 0.70, Math.PI * 1.40,  1.20, 2.20, 0.38, w3top, "rgba(18,28,85,0.28)");

      // Corner glow
      const gr = Math.round(70 + blend * 45);
      const gb = Math.round(150 + blend * 30);
      const glow = ctx!.createRadialGradient(-W * 0.08, -H * 0.08, 0, -W * 0.08, -H * 0.08, W * 0.65);
      glow.addColorStop(0, `rgba(${gr}, 30, ${gb}, 0.42)`);
      glow.addColorStop(1, `rgba(${gr}, 30, ${gb}, 0)`);
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

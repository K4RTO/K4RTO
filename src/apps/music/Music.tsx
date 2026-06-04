"use client";

import { useState } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useT } from "@/contexts/SystemContext";
import { VibeVisualizer } from "./VibeVisualizer";

// Replace with your Spotify playlist/album/artist ID
const DEFAULT_PLAYLIST_ID = "1koxgvj1npSj4a97JY91Y2";

type VizMode = "off" | "bars" | "wave";

export default function Music({ windowId }: AppComponentProps) {
  const { state } = useWindowManager();
  const t = useT();
  const windowMeta = state.windows.get(windowId)?.meta as Record<string, string> | undefined;
  const playlistId = windowMeta?.playlistId ?? DEFAULT_PLAYLIST_ID;

  // Vibe Mode toggle. localStorage-backed so the user's preference sticks.
  const [vizMode, setVizMode] = useState<VizMode>(() => {
    if (typeof window === "undefined") return "bars";
    try {
      const raw = localStorage.getItem("k4rto.music.viz") ?? '"bars"';
      const v = JSON.parse(raw);
      return v === "off" || v === "bars" || v === "wave" ? v : "bars";
    } catch { return "bars"; }
  });
  function setMode(m: VizMode) {
    setVizMode(m);
    try { localStorage.setItem("k4rto.music.viz", JSON.stringify(m)); } catch { /* ignore */ }
  }

  const embedUrl =
    `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`;

  return (
    <div className="flex flex-col w-full h-full bg-black overflow-hidden">
      <iframe
        src={embedUrl}
        className="flex-1"
        width="100%"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{ display: "block", border: "none", minHeight: 0 }}
      />
      {/* Vibe visualizer strip below the Spotify embed. Not actual audio
       *  analysis — Spotify's audio is in a cross-origin iframe and Web Audio
       *  can't reach it. The strip is a procedurally-animated bar/wave that
       *  matches the music feel without claiming otherwise (label says
       *  "Vibe Mode"). */}
      {vizMode !== "off" && (
        <div
          className="flex-shrink-0 relative"
          style={{
            backgroundColor: "#0a0a0a",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <VibeVisualizer mode={vizMode} height={vizMode === "wave" ? 56 : 72} />
          {/* Mode picker overlay — sits in the top-right corner of the viz strip. */}
          <div
            className="absolute flex items-center gap-0.5 px-1 py-0.5 rounded-md"
            style={{
              top: 4,
              right: 6,
              backgroundColor: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            {(["bars", "wave", "off"] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-2 h-5 rounded text-[10px]"
                style={{
                  color: vizMode === m ? "white" : "rgba(255,255,255,0.5)",
                  backgroundColor: vizMode === m ? "rgba(255,255,255,0.12)" : "transparent",
                }}
                title={t(`music.viz.${m}`)}
                aria-pressed={vizMode === m}
              >
                {t(`music.viz.${m}`)}
              </button>
            ))}
          </div>
          {/* Honesty label — bottom left, low-emphasis. */}
          <span
            className="absolute"
            style={{
              bottom: 4, left: 8,
              fontSize: 9,
              color: "rgba(255,255,255,0.3)",
              pointerEvents: "none",
              letterSpacing: "0.04em",
            }}
          >
            {t("music.viz.label")}
          </span>
        </div>
      )}
      {vizMode === "off" && (
        <button
          onClick={() => setMode("bars")}
          className="flex-shrink-0 text-[11px] py-1"
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.5)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
          title={t("music.viz.show")}
        >{t("music.viz.show")}</button>
      )}
    </div>
  );
}

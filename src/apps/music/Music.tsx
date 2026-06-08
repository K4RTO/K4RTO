"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  // Vibe Mode toggle (procedural visual style). localStorage-backed.
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

  // ── Live tab-audio capture ──────────────────────────────────────────────
  //
  // Spotify plays in a cross-origin iframe, so Web Audio can't touch its
  // audio output via MediaElementAudioSourceNode. The escape hatch is
  // getDisplayMedia({ audio: true }): the browser shows a system prompt
  // letting the user pick a tab + check "Share tab audio", at which point
  // we get a real MediaStream we can feed into an AnalyserNode.
  //
  // The user has to do this every time the app reloads (tab-audio capture
  // permission cannot be persisted — that's a deliberate browser-vendor
  // anti-abuse policy). It's worth it because the alternative — pretending
  // the procedural visualiser is reactive — is dishonest.

  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [captureState, setCaptureState] = useState<"idle" | "live" | "denied" | "unsupported">("idle");
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const stopCapture = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => { /* already closed */ });
    audioCtxRef.current = null;
    setAnalyser(null);
    setCaptureState("idle");
  }, []);

  const startCapture = useCallback(async () => {
    // Feature detect — Firefox stable lacks tab-audio capture; Safari only
    // gained it in 17. Tell the user instead of throwing.
    if (typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getDisplayMedia) {
      setCaptureState("unsupported");
      return;
    }
    try {
      // `video: true` is required by the API even though we only want audio —
      // we immediately stop the video track to avoid using camera/screen
      // resources. Some browsers reject `{ audio: true, video: false }`.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        // The user shared a tab but forgot to check "Share tab audio", or
        // the source has no audio. Stop everything and tell them.
        stream.getTracks().forEach(t => t.stop());
        setCaptureState("denied"); // re-uses the denied UI ("no audio in stream")
        return;
      }
      // Stop the video track — we don't paint it anywhere and it wastes
      // GPU + battery to keep encoding.
      stream.getVideoTracks().forEach(track => track.stop());

      // Wire up Web Audio. AudioContext stays alive until stopCapture().
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createAnalyser();
      node.fftSize = 2048;
      node.smoothingTimeConstant = 0.82;
      source.connect(node);
      // NOTE: we deliberately do NOT connect to ctx.destination — that would
      // play the captured audio back through the user's speakers (echoing
      // Spotify). The AnalyserNode reads samples regardless of destination.

      // If the user revokes share (e.g. clicks "Stop sharing" in Chrome's
      // bottom banner), the track ends → fall back to procedural cleanly.
      audioTracks[0].onended = () => stopCapture();

      streamRef.current = stream;
      audioCtxRef.current = ctx;
      setAnalyser(node);
      setCaptureState("live");
    } catch (e) {
      // User cancelled the share dialog OR browser blocked. Either way,
      // sit back at procedural.
      void e;
      setCaptureState("idle");
    }
  }, [stopCapture]);

  // Tear down on unmount — never leave a screen-capture track running.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      audioCtxRef.current?.close().catch(() => { /* ignore */ });
    };
  }, []);

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
      {/* Visualizer strip below the Spotify embed.
       *  When `analyser` is non-null we're rendering live frequency / time-
       *  domain data from the user-shared tab audio; otherwise procedural
       *  sine sums. The label and Capture button reflect the state. */}
      {vizMode !== "off" && (
        <div
          className="flex-shrink-0 relative"
          style={{
            backgroundColor: "#0a0a0a",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <VibeVisualizer mode={vizMode} height={vizMode === "wave" ? 56 : 72} analyser={analyser} />

          {/* Top-right cluster: mode picker + capture toggle. */}
          <div
            className="absolute flex items-center gap-1"
            style={{ top: 4, right: 6 }}
          >
            {/* Capture / Stop button. Color shifts to Spotify green when live. */}
            <button
              onClick={captureState === "live" ? stopCapture : startCapture}
              className="px-2 h-5 rounded text-[10px] font-medium"
              style={{
                backgroundColor: captureState === "live" ? "rgba(30,215,96,0.9)" : "rgba(0,0,0,0.55)",
                color: captureState === "live" ? "black" : "rgba(255,255,255,0.85)",
                border: `1px solid ${captureState === "live" ? "rgba(30,215,96,0.5)" : "rgba(255,255,255,0.12)"}`,
              }}
              title={captureState === "live" ? t("music.capture.stop") : t("music.capture.start")}
            >
              {captureState === "live" ? "● LIVE" : t("music.capture.btn")}
            </button>

            {/* Mode picker. */}
            <div
              className="flex items-center gap-0.5 px-1 py-0.5 rounded-md"
              style={{
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
          </div>

          {/* Bottom-left honesty label — flips to LIVE state when capturing. */}
          <span
            className="absolute"
            style={{
              bottom: 4, left: 8,
              fontSize: 9,
              color: captureState === "live" ? "rgba(30,215,96,0.85)" : "rgba(255,255,255,0.3)",
              pointerEvents: "none",
              letterSpacing: "0.04em",
            }}
          >
            {captureState === "live" ? t("music.capture.liveLabel") : t("music.viz.label")}
          </span>

          {/* One-time hint after the user clicks the share dialog but forgot
           *  to enable audio sharing — most common failure mode of this API. */}
          {captureState === "denied" && (
            <div
              className="absolute"
              style={{
                bottom: 22, left: 8,
                fontSize: 9.5,
                color: "rgba(255,180,80,0.95)",
                maxWidth: "55%",
                lineHeight: 1.35,
              }}
            >
              {t("music.capture.hintNoAudio")}
            </div>
          )}
          {captureState === "unsupported" && (
            <div
              className="absolute"
              style={{
                bottom: 22, left: 8,
                fontSize: 9.5,
                color: "rgba(255,120,120,0.95)",
                maxWidth: "55%",
                lineHeight: 1.35,
              }}
            >
              {t("music.capture.unsupported")}
            </div>
          )}
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

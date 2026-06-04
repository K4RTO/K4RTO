"use client";

import { useEffect, useState } from "react";
import { useSystem, useT } from "@/contexts/SystemContext";
import { Wallpaper } from "@/components/desktop/Wallpaper";
import { withBase } from "@/lib/paths";

interface LoginScreenProps {
  /** Called when the user dismisses the lock screen (login, ESC, or click-anywhere). */
  onUnlock: () => void;
}

/**
 * macOS Sonoma-style lock screen.
 *
 * Shown once per session (the session-storage guard lives in Desktop.tsx so this
 * component itself stays purely presentational). Visitor-friendly version: no
 * password input — clicking anywhere or pressing any key dismisses the lock.
 * This is brand theater, not access control.
 *
 * Layout follows real macOS: clock + date at the top, avatar / name / Enter
 * button stack centered below the vertical midline. The wallpaper underneath
 * is the same animated canvas the desktop uses, so the visual continuity sells
 * the "you just woke this Mac up" moment.
 */
export function LoginScreen({ onUnlock }: LoginScreenProps) {
  const { lang } = useSystem();
  const t = useT();
  const [closing, setClosing] = useState(false);

  // Live clock — updates each second.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());  // hydrate after mount to avoid SSR/CSR clock mismatch
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  function handleUnlock() {
    if (closing) return;
    setClosing(true);
    // Match the CSS fade duration so the desktop becomes interactive cleanly.
    setTimeout(onUnlock, 420);
  }

  // Any key (Esc, Enter, Space, letter) dismisses the lock. We listen on
  // window keydown rather than relying on focused inputs, because the visitor
  // hasn't touched anything yet and the natural reaction is "press any key".
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore modifier-only presses (Cmd, Shift, etc) — those are accidental
      // when the user is just resting fingers on the keyboard.
      // Modifier keys and Tab are excluded:
      //  - Modifiers fire while the user is "resting fingers" on the keyboard
      //  - Tab is the screen-reader navigation key; unlocking on it would make
      //    keyboard exploration of the lock surface impossible.
      if (["Shift", "Meta", "Control", "Alt", "CapsLock", "Tab"].includes(e.key)) return;
      if (!closing) handleUnlock();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  const timeStr = now
    ? now.toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US", {
        hour: "2-digit", minute: "2-digit", hour12: false,
      })
    : "--:--";
  const dateStr = now
    ? now.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
        weekday: "long", month: "long", day: "numeric",
      })
    : "";

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      // Any click anywhere on the screen also dismisses the lock — buttons
      // bubble up to here, but they call handleUnlock themselves, so the
      // guard inside handleUnlock prevents double-firing.
      onClick={handleUnlock}
      style={{
        // 100000 is one tier above ContextMenu / AboutThisMac (both 99999) so
        // the lock screen always wins the stacking order regardless of DOM order.
        zIndex: 100000,
        opacity: closing ? 0 : 1,
        transform: closing ? "scale(1.05)" : "scale(1)",
        transition: "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "pointer",
      }}
    >
      {/* Same animated wallpaper as the desktop — visual continuity */}
      <Wallpaper />

      {/* Subtle dim overlay so the foreground content reads clearly on bright palettes */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.10) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Top: clock + date */}
      <div
        className="absolute inset-x-0 flex flex-col items-center select-none"
        style={{ top: "12vh", color: "white", textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
      >
        <div
          style={{
            fontSize: "min(96px, 12vw)",
            fontWeight: 250,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",  // no width jitter between digits
          }}
        >
          {timeStr}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            marginTop: 8,
            opacity: 0.92,
          }}
        >
          {dateStr}
        </div>
      </div>

      {/* Center-low: avatar + name + Enter button.
          The container catches the click — anywhere outside the Enter button
          itself also dismisses the lock (full-screen catcher is on the root
          element below). top: 55vh sits this stack just below the vertical
          midline, leaving room for the clock at top: 12vh above. */}
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: "55vh" }}>
        {/* Avatar — uses the K4RTO mark from public/. Wrapped in a circular
            clip so the square JPG renders as a round avatar like macOS users. */}
        <button
          type="button"
          // stopPropagation prevents the root-div onClick from also firing
          // on the same synchronous tick — without it, the React state guard
          // in handleUnlock won't catch the second call (state updates are
          // async, so `closing` is still false during bubble).
          onClick={(e) => { e.stopPropagation(); handleUnlock(); }}
          className="flex items-center justify-center cursor-pointer"
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.35)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.30)",
            padding: 0,
            background: "transparent",
          }}
          aria-label={t("login.enter")}
          title={t("login.enter")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={withBase("/K4RTO/logo.jpg")}
            alt=""
            width={88}
            height={88}
            style={{ display: "block", objectFit: "cover" }}
            draggable={false}
          />
        </button>

        {/* Display name — brand only, no real name exposed */}
        <div
          className="select-none"
          style={{
            color: "white",
            fontSize: 17,
            fontWeight: 500,
            marginTop: 16,
            letterSpacing: "0.04em",
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}
        >
          K4RTO
        </div>

        {/* Enter button — the only interactive primitive needed when there's
            no password. Wide enough to feel like a CTA, not a small accent. */}
        <button
          type="button"
          // stopPropagation — see avatar button above.
          onClick={(e) => { e.stopPropagation(); handleUnlock(); }}
          style={{
            marginTop: 24,
            height: 34,
            padding: "0 24px",
            borderRadius: 17,
            background: "rgba(255,255,255,0.92)",
            color: "#111",
            fontSize: 13,
            fontWeight: 600,
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            cursor: "pointer",
            transition: "transform 0.15s ease-out, background 0.15s ease-out",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.92)";
          }}
          aria-label={t("login.enter")}
        >
          {t("login.enter")}
        </button>

        {/* Hint */}
        <div
          className="select-none"
          style={{
            marginTop: 28,
            color: "rgba(255,255,255,0.65)",
            fontSize: 12,
            textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }}
        >
          {t("login.hint")}
        </div>
      </div>

      {/* Bottom-right: power button-ish dot (decorative) */}
      <div
        className="absolute"
        style={{
          right: 32,
          bottom: 32,
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.5)",
          fontSize: 16,
        }}
        aria-hidden
        title="Power"
      >
        ⏻
      </div>

    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useSystem, useT } from "@/contexts/SystemContext";
import { Wallpaper } from "@/components/desktop/Wallpaper";

interface LoginScreenProps {
  /** Called when the user dismisses the lock screen (login, ESC, or click-anywhere). */
  onUnlock: () => void;
}

/**
 * macOS Sonoma-style lock screen.
 *
 * Shown once per session (the session-storage guard lives in Desktop.tsx so this
 * component itself stays purely presentational). The actual password is ignored —
 * any input (including empty) unlocks. ESC also unlocks. This is portfolio
 * theater, not access control.
 *
 * Layout follows real macOS: clock + date at the top, avatar / name / password
 * stack centered below the vertical midline. The wallpaper underneath is the
 * same animated canvas the desktop uses, so the visual continuity sells the
 * "you just woke this Mac up" moment.
 */
export function LoginScreen({ onUnlock }: LoginScreenProps) {
  const { lang } = useSystem();
  const t = useT();
  const [password, setPassword] = useState("");
  const [closing, setClosing] = useState(false);
  // shake = wrong-password feedback. We never actually reject, but a tiny shake
  // on a too-long input adds the right "I tried to log in" feel.
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live clock — updates each second.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());  // hydrate after mount to avoid SSR/CSR clock mismatch
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Focus the password input after the open animation settles.
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(id);
  }, []);

  // ESC bypasses the lock screen.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !closing) {
        handleUnlock();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  function handleUnlock() {
    if (closing) return;
    setClosing(true);
    // Match the CSS fade duration so the desktop becomes interactive cleanly.
    setTimeout(onUnlock, 420);
  }

  function trySubmit() {
    // While the shake animation is still running, ignore further submits — without
    // this, a user could type → submit → get shake → clear → submit empty during
    // the 420ms window, which would bypass the rejection theater.
    if (shake) return;
    // Anything 32 chars or shorter unlocks. Longer = "wrong password" theater.
    if (password.length > 32) {
      setShake(true);
      setTimeout(() => setShake(false), 420);
      setPassword("");
      return;
    }
    handleUnlock();
  }

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
      style={{
        // 100000 is one tier above ContextMenu / AboutThisMac (both 99999) so
        // the lock screen always wins the stacking order regardless of DOM order.
        zIndex: 100000,
        opacity: closing ? 0 : 1,
        transform: closing ? "scale(1.05)" : "scale(1)",
        transition: "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
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

      {/* Center-low: avatar + name + password */}
      <div
        className="absolute inset-x-0 flex flex-col items-center"
        style={{
          top: "58vh",
          transform: shake ? "translateX(0)" : undefined,
          animation: shake ? "lockShake 0.42s ease-in-out" : undefined,
        }}
      >
        {/* Avatar circle with initials */}
        <div
          className="flex items-center justify-center select-none"
          style={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.10) 100%)",
            border: "1px solid rgba(255,255,255,0.35)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.30)",
            color: "white",
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: "0.05em",
          }}
          aria-hidden
        >
          YH
        </div>

        {/* Display name */}
        <div
          className="select-none"
          style={{
            color: "white",
            fontSize: 17,
            fontWeight: 500,
            marginTop: 16,
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}
        >
          Yan Han
        </div>

        {/* Password input pill */}
        <form
          onSubmit={(e) => { e.preventDefault(); trySubmit(); }}
          style={{ marginTop: 16 }}
        >
          <div
            className="flex items-center"
            style={{
              width: 230,
              height: 34,
              borderRadius: 17,
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.25)",
              padding: "0 4px 0 14px",
            }}
          >
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("login.passwordPlaceholder")}
              className="flex-1 bg-transparent outline-none border-none"
              style={{
                color: "white",
                fontSize: 13,
                caretColor: "white",
              }}
              autoComplete="off"
              spellCheck={false}
              aria-label={t("login.passwordPlaceholder")}
            />
            <button
              type="submit"
              className="flex items-center justify-center"
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.95)",
                color: "#111",
                opacity: password.length > 0 ? 1 : 0.5,
                transition: "opacity 0.15s ease-out",
                cursor: "pointer",
                flexShrink: 0,
              }}
              aria-label={t("login.unlock")}
              title={t("login.unlock")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M13 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </form>

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

      <style>{`
        @keyframes lockShake {
          0%, 100% { transform: translateX(0); }
          15%  { transform: translateX(-8px); }
          30%  { transform: translateX(8px); }
          45%  { transform: translateX(-6px); }
          60%  { transform: translateX(6px); }
          75%  { transform: translateX(-3px); }
          90%  { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}

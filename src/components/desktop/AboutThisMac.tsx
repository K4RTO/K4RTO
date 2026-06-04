"use client";

import { useEffect, useRef } from "react";

// ── Brand Icons ───────────────────────────────────────────────────────────────

function SpotifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function SteamIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.492 1.009 2.448-.4.957-1.49 1.41-2.455 1.019zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  );
}

// ── Link rows config ───────────────────────────────────────────────────────────

const LINKS = [
  {
    id: "mail",
    label: "k4rtol@163.com",
    href: "mailto:k4rtol@163.com",
    iconBg: "#0072C6",
    iconColor: "#ffffff",
    Icon: MailIcon,
  },
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/K4RTO",
    iconBg: "rgba(255,255,255,0.08)",
    iconColor: "rgba(255,255,255,0.75)",
    iconBorder: "0.5px solid rgba(255,255,255,0.12)",
    Icon: GitHubIcon,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/K4RTO/",
    iconBg: "#0A66C2",
    iconColor: "#ffffff",
    Icon: LinkedInIcon,
  },
  {
    id: "spotify",
    label: "Spotify",
    href: "",
    iconBg: "#1DB954",
    iconColor: "#ffffff",
    Icon: SpotifyIcon,
  },
  {
    id: "steam",
    label: "Steam",
    href: "",
    iconBg: "rgba(255,255,255,0.08)",
    iconColor: "rgba(255,255,255,0.75)",
    iconBorder: "0.5px solid rgba(255,255,255,0.12)",
    Icon: SteamIcon,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AboutThisMac({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 99999,
        backgroundColor: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      onClick={e => { if (!modalRef.current?.contains(e.target as Node)) onClose(); }}
    >
      <div
        ref={modalRef}
        className="glass-surface glass-thick glass-shadow-lg glass-radius-panel relative overflow-hidden"
        style={{
          width: 380,
          animation: "aboutIn 0.22s var(--spring-bouncy)",
        }}
      >
        {/* Close button. zIndex:10 is mandatory — without it the following
            sibling header div (normal flow) paints on top of this absolute
            button in the same stacking context (DOM order = paint order
            when neither element opts into a z-index). Symptom was "click
            does nothing" because hits landed on the header text instead. */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center"
          style={{
            zIndex: 10,
            width: 26, height: 26, borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.07)",
            border: "0.5px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.4)",
            fontSize: 11, cursor: "pointer",
          }}
        >
          ✕
        </button>

        {/* ── Header ── */}
        <div
          className="flex flex-col items-center select-none"
          style={{
            padding: "36px 40px 24px",
            background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
          }}
        >
          <div
            style={{
              width: 80, height: 80, borderRadius: "50%", overflow: "hidden",
              border: "2px solid rgba(255,255,255,0.1)",
              boxShadow: "0 6px 28px rgba(0,0,0,0.6)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/K4RTO/cat.png"
              alt="K4RTO"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <h1
            style={{
              margin: "14px 0 0",
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "-0.3px",
            }}
          >
            K4RTO
          </h1>
        </div>

        {/* Divider */}
        <div style={{ height: "0.5px", backgroundColor: "rgba(255,255,255,0.08)", margin: "0 24px" }} />

        {/* ── Links ── */}
        <div style={{ padding: "12px 16px 16px" }}>
          {LINKS.map(({ id, label, href, iconBg, iconColor, iconBorder, Icon }) => (
            <a
              key={id}
              href={href || undefined}
              target={href ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl group"
              style={{
                padding: "10px 12px",
                textDecoration: "none",
                cursor: href ? "pointer" : "default",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {/* Icon */}
              <div
                style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  backgroundColor: iconBg,
                  border: iconBorder ?? "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: iconColor,
                }}
              >
                <Icon />
              </div>

              {/* Label */}
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.82)",
                }}
              >
                {label}
              </span>

              {/* Chevron */}
              <span style={{ color: href ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)" }}>
                <ChevronIcon />
              </span>
            </a>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes aboutIn {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
}

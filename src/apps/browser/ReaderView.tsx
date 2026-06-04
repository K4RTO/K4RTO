"use client";

import { useState, useEffect } from "react";

/** Parsed article shape (mirror of Readability's output, plus the source URL). */
export interface ReaderArticle {
  title: string;
  byline: string | null;
  excerpt: string | null;
  content: string;       // sanitized HTML
  textContent: string;
  length: number;
  siteName: string | null;
  url: string;
}

interface ReaderViewProps {
  article: ReaderArticle;
  onClose: () => void;
  /** Localized strings */
  t: (key: string) => string;
}

type ReaderTheme = "light" | "sepia" | "dark";

const THEMES: Record<ReaderTheme, { bg: string; fg: string; muted: string; rule: string; link: string }> = {
  light: { bg: "#ffffff", fg: "#1a1a1a", muted: "#666666", rule: "rgba(0,0,0,0.08)", link: "#0066cc" },
  sepia: { bg: "#f4ecd8", fg: "#3a2e1f", muted: "#7a6a4f", rule: "rgba(58,46,31,0.12)", link: "#7a3f1d" },
  dark:  { bg: "#1c1c1e", fg: "#e8e6e3", muted: "#999999", rule: "rgba(255,255,255,0.10)", link: "#5ec3ff" },
};

const FONT_SIZES = [15, 16, 18, 20, 22] as const;
const DEFAULT_FONT_IDX = 2; // 18px — comfortable reading default

/**
 * Reader Mode — a Safari-style distilled article view. Sits as a layer on top
 * of the iframe so closing brings the original page back without a reload.
 *
 * The HTML in `article.content` is already sanitized by the caller; we still
 * render it via dangerouslySetInnerHTML inside a class-namespaced container
 * so our typography rules cascade onto its h1/h2/p/blockquote/etc.
 */
export function ReaderView({ article, onClose, t }: ReaderViewProps) {
  const [theme, setTheme] = useState<ReaderTheme>("dark");
  const [fontIdx, setFontIdx] = useState<number>(DEFAULT_FONT_IDX);

  // Persist user prefs across sessions — readers tune these once and expect
  // them to stick.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("k4rto.reader");
      if (raw) {
        const v = JSON.parse(raw);
        if (v.theme === "light" || v.theme === "sepia" || v.theme === "dark") setTheme(v.theme);
        if (typeof v.fontIdx === "number" && v.fontIdx >= 0 && v.fontIdx < FONT_SIZES.length) {
          setFontIdx(v.fontIdx);
        }
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("k4rto.reader", JSON.stringify({ theme, fontIdx })); } catch { /* ignore */ }
  }, [theme, fontIdx]);

  const palette = THEMES[theme];
  const fontSize = FONT_SIZES[fontIdx];
  const host = (() => { try { return new URL(article.url).hostname.replace(/^www\./, ""); } catch { return ""; } })();

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ backgroundColor: palette.bg, color: palette.fg, animation: "fadeIn 0.2s ease" }}
    >
      {/* Reader toolbar — close + font size + theme switcher */}
      <div
        className="flex items-center justify-between flex-shrink-0 px-5"
        style={{
          height: 44,
          borderBottom: `1px solid ${palette.rule}`,
          backgroundColor: palette.bg,
        }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px]"
          style={{ color: palette.fg, backgroundColor: palette.rule }}
          title={t("browser.reader.exit")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>{t("browser.reader.exit")}</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Font size A- / A+ — smaller A is decrement, bigger A is increment. */}
          <div className="flex items-center gap-0.5 rounded-md overflow-hidden" style={{ border: `1px solid ${palette.rule}` }}>
            <button
              onClick={() => setFontIdx(i => Math.max(0, i - 1))}
              disabled={fontIdx === 0}
              className="w-7 h-7 flex items-center justify-center"
              style={{ color: palette.fg, fontSize: 11, opacity: fontIdx === 0 ? 0.35 : 1 }}
              title={t("browser.reader.fontSmaller")}
            >A−</button>
            <button
              onClick={() => setFontIdx(i => Math.min(FONT_SIZES.length - 1, i + 1))}
              disabled={fontIdx === FONT_SIZES.length - 1}
              className="w-7 h-7 flex items-center justify-center"
              style={{ color: palette.fg, fontSize: 14, opacity: fontIdx === FONT_SIZES.length - 1 ? 0.35 : 1 }}
              title={t("browser.reader.fontLarger")}
            >A+</button>
          </div>

          {/* Theme tri-state — light / sepia / dark. */}
          <div className="flex items-center gap-0.5 rounded-md overflow-hidden" style={{ border: `1px solid ${palette.rule}` }}>
            {(["light", "sepia", "dark"] as const).map(k => (
              <button
                key={k}
                onClick={() => setTheme(k)}
                className="w-7 h-7 flex items-center justify-center"
                style={{
                  backgroundColor: theme === k ? palette.rule : "transparent",
                  color: palette.fg,
                }}
                title={t(`browser.reader.theme.${k}`)}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    backgroundColor: THEMES[k].bg,
                    border: `1px solid ${palette.muted}`,
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Article body — scrollable, max-width centered for comfortable line length. */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: palette.bg }}>
        <article
          className="reader-article"
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "48px 28px 96px",
            fontFamily: "-apple-system, 'New York', 'Georgia', 'Times New Roman', serif",
            fontSize,
            lineHeight: 1.7,
            color: palette.fg,
          }}
        >
          <h1 style={{ fontSize: fontSize * 1.85, lineHeight: 1.2, marginBottom: 12, fontWeight: 700 }}>
            {article.title}
          </h1>
          {(article.byline || host) && (
            <div style={{ color: palette.muted, fontSize: fontSize * 0.85, marginBottom: 8 }}>
              {article.byline && <span>{article.byline}</span>}
              {article.byline && host && <span> · </span>}
              {host && <span>{host}</span>}
            </div>
          )}
          <hr style={{ border: 0, borderTop: `1px solid ${palette.rule}`, margin: "20px 0 28px" }} />
          {/* Sanitized HTML — caller guarantees DOMPurify already ran on this. */}
          <div
            className="reader-content"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>
      </div>

      {/* Inline scoped typography — keeps the article looking like a magazine
       *  page no matter what messy classes the source HTML used. */}
      <style jsx>{`
        .reader-content :global(p) { margin: 0 0 1em; }
        .reader-content :global(h1),
        .reader-content :global(h2),
        .reader-content :global(h3),
        .reader-content :global(h4) {
          margin: 1.4em 0 0.5em;
          font-weight: 700;
          line-height: 1.25;
        }
        .reader-content :global(h2) { font-size: 1.4em; }
        .reader-content :global(h3) { font-size: 1.2em; }
        .reader-content :global(h4) { font-size: 1.05em; }
        .reader-content :global(blockquote) {
          margin: 1em 0;
          padding-left: 1em;
          border-left: 3px solid ${palette.rule};
          color: ${palette.muted};
          font-style: italic;
        }
        .reader-content :global(a) {
          color: ${palette.link};
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 2px;
        }
        .reader-content :global(img) {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          margin: 1em 0;
          display: block;
        }
        .reader-content :global(figure) {
          margin: 1.5em 0;
        }
        .reader-content :global(figcaption) {
          font-size: 0.85em;
          color: ${palette.muted};
          margin-top: 0.5em;
          text-align: center;
        }
        .reader-content :global(pre),
        .reader-content :global(code) {
          font-family: ui-monospace, 'SF Mono', Menlo, monospace;
          background: ${palette.rule};
          border-radius: 4px;
        }
        .reader-content :global(code) { padding: 1px 5px; font-size: 0.9em; }
        .reader-content :global(pre) {
          padding: 12px 16px;
          overflow-x: auto;
          margin: 1em 0;
        }
        .reader-content :global(pre) :global(code) { padding: 0; background: transparent; }
        .reader-content :global(ul),
        .reader-content :global(ol) { margin: 0 0 1em; padding-left: 1.5em; }
        .reader-content :global(li) { margin: 0.3em 0; }
        .reader-content :global(table) {
          border-collapse: collapse;
          margin: 1em 0;
          width: 100%;
        }
        .reader-content :global(td),
        .reader-content :global(th) {
          border: 1px solid ${palette.rule};
          padding: 6px 10px;
          text-align: left;
        }
      `}</style>
    </div>
  );
}

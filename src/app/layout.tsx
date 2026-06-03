import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "K4RTO",
  description: "macOS Tahoe Desktop Environment",
};

/**
 * Anti-flash theme script — runs **synchronously before the first paint** to
 * apply the user's saved theme + accent. Without this, dark-mode users would
 * see a white flash while React hydrates and SystemContext reads localStorage.
 *
 * Strategy mirrors the canonical Next.js / Theme-UI pattern:
 *   1. Read `system_state_v1` from localStorage
 *   2. Resolve 'auto' against `prefers-color-scheme`
 *   3. Set `<html data-theme="...">` and `<html style="--accent: ...">`
 *
 * Anything that throws falls back to dark / default accent.
 */
const themeBootstrapScript = `(function(){
  try {
    var raw = localStorage.getItem('system_state_v1');
    var state = raw ? JSON.parse(raw) : {};
    var theme = state.theme || 'dark';
    if (theme === 'auto') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.dataset.theme = theme;
    var accent = state.accent || '#0058d0';
    document.documentElement.style.setProperty('--accent', accent);
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the inline theme-bootstrap script mutates
    // `data-theme` and the `--accent` CSS variable BEFORE hydration, so the
    // initial server HTML intentionally disagrees with what the client sees.
    // Without this, React would flag the mismatch and re-render the whole tree,
    // defeating the anti-flash strategy.
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        {/*
          Per Next.js docs, beforeInteractive scripts should be placed in
          <body> (Next.js still injects them into <head> internally, but the
          recommended source location is body).
        */}
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
        {children}
      </body>
    </html>
  );
}

"use client";

import { useEffect, useState } from "react";
import { highlight, type SupportedLang } from "./shiki";

interface CodeViewProps {
  code: string;
  lang: SupportedLang;
}

/**
 * Shiki-highlighted read-only code view.
 *
 * Safety: Shiki's `codeToHtml()` is itself a sanitizing primitive — the input
 * code is HTML-escaped and the output is only Shiki's own `<pre><code><span>`
 * markup with theme color styles. No path exists for user-supplied HTML to
 * survive intact. This is the canonical render pattern in Shiki's own docs.
 */
export default function CodeView({ code, lang }: CodeViewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    highlight(code, lang)
      .then(h => { if (!cancelled) setHtml(h); })
      .catch(err => { if (!cancelled) setError(String(err?.message ?? err)); });
    return () => { cancelled = true; };
  }, [code, lang]);

  if (error) {
    return (
      <div
        className="absolute inset-0 overflow-auto"
        style={{ backgroundColor: "#1e1e1e", color: "#f48771", padding: "16px 24px", fontFamily: "monospace", fontSize: 12 }}
      >
        Highlighter failed: {error}
      </div>
    );
  }

  if (html === null) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ backgroundColor: "#1e1e1e", color: "rgba(255,255,255,0.4)", fontSize: 12 }}
      >
        Highlighting…
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 overflow-auto code-view"
      style={{ backgroundColor: "#1e1e1e" }}
      // Shiki output is structurally safe — see component-level docstring above.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

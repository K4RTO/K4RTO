/**
 * Shiki singleton for the VSCode app.
 *
 * Why singleton: `createHighlighter` loads grammars + theme JSON; on a typical
 * Mac that's ~150ms cold. We want all open VSCode windows to share the same
 * instance and only pay that cost once per session.
 *
 * Why `engine: javascript`: Shiki defaults to a WASM regex engine (Oniguruma).
 * Next.js static export + Turbopack/webpack has historically tripped on WASM
 * loading from a non-default URL (the file ends up under /_next/static/wasm/
 * which gets remapped under basePath). The JS engine is ~30% slower but has
 * zero loader caveats. For a portfolio that highlights short snippets, the
 * speed difference is imperceptible.
 *
 * Themes / langs are deliberately small. Each additional lang adds ~5-15kb
 * gzipped to the lazy chunk. If we ever need more, add them here only.
 */
import type { HighlighterCore } from "shiki/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

export type SupportedLang =
  | "tsx" | "ts" | "jsx" | "js"
  | "json" | "md"
  | "css" | "html" | "bash" | "yaml";

// Aliases map user-friendly / file-extension names → the canonical lang id
// that Shiki was loaded with. Don't add a value to LANG_ALIASES that isn't
// already in SupportedLang — codeToHtml() throws on unregistered langs.
const LANG_ALIASES: Record<string, SupportedLang> = {
  typescript: "ts",
  javascript: "js",
  markdown: "md",
  shell: "bash",
  sh: "bash",
  yml: "yaml",
};

let highlighterPromise: Promise<HighlighterCore> | null = null;

/** Lazy-loaded singleton — first call kicks off loading, later calls reuse it. */
export function getHighlighter(): Promise<HighlighterCore> {
  if (highlighterPromise) return highlighterPromise;
  highlighterPromise = createHighlighterCore({
    themes: [
      import("@shikijs/themes/github-dark").then(m => m.default),
    ],
    langs: [
      import("@shikijs/langs/tsx").then(m => m.default),
      import("@shikijs/langs/ts").then(m => m.default),
      import("@shikijs/langs/jsx").then(m => m.default),
      import("@shikijs/langs/js").then(m => m.default),
      import("@shikijs/langs/json").then(m => m.default),
      import("@shikijs/langs/md").then(m => m.default),
      import("@shikijs/langs/css").then(m => m.default),
      import("@shikijs/langs/html").then(m => m.default),
      import("@shikijs/langs/bash").then(m => m.default),
      import("@shikijs/langs/yaml").then(m => m.default),
    ],
    engine: createJavaScriptRegexEngine(),
  }).catch(err => {
    // Reset on failure so a later retry can try again
    highlighterPromise = null;
    throw err;
  });
  return highlighterPromise;
}

/** Map a file extension to a Shiki-supported language id, or null if we don't highlight it. */
export function langFromExt(ext: string): SupportedLang | null {
  const lower = ext.toLowerCase();
  if (lower in LANG_ALIASES) return LANG_ALIASES[lower];
  const supported: SupportedLang[] = [
    "tsx", "ts", "jsx", "js", "json", "md",
    "css", "html", "bash", "yaml",
  ];
  return (supported as string[]).includes(lower) ? (lower as SupportedLang) : null;
}

/** Highlight `code` and return Shiki's HTML string. Safe to render via dangerouslySetInnerHTML —
 *  Shiki only emits its own structural markup; the input code is HTML-escaped. */
export async function highlight(code: string, lang: SupportedLang): Promise<string> {
  const hl = await getHighlighter();
  return hl.codeToHtml(code, {
    lang,
    theme: "github-dark",
  });
}

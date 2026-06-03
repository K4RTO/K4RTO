/**
 * Curated K4RTO portfolio source samples.
 *
 * These are excerpts of the *actual* code running in this app — not mockups.
 * Each file leads with a short prose annotation so a recruiter / reviewer
 * can grok the engineering decision in 30 seconds before reading the code.
 *
 * Picked for variety:
 *   - README.md            architectural overview
 *   - WindowManager.tsx    state reducer (frontend depth)
 *   - Browser.tsx          CF Worker proxy integration (full-stack)
 *   - worker.js            SSRF-protected proxy (security)
 *   - appMenu.ts           event-bus pattern (decoupling)
 *   - shiki.ts             this very highlighter (meta-level)
 *
 * Kept short on purpose — full source lives on GitHub. The goal here is
 * to make "look at the code" frictionless inside the portfolio itself.
 */
export interface PortfolioSource {
  /** Filename — also drives the syntax-highlighter language pick */
  name: string;
  /** Short prose annotation shown as a comment at the top of the file */
  annotation: string;
  /** The code excerpt */
  code: string;
}

export const PORTFOLIO_SOURCES: PortfolioSource[] = [
  {
    name: "README.md",
    annotation: "Project entry point — what it is, how it's built, and the trade-offs behind those choices.",
    code: `# K4RTO Portfolio

A macOS-style desktop running in the browser. Built as a job-hunt portfolio,
deployed at k4rto.com.

## Stack

- **Next.js 15** with \`output: "export"\` → static, runs on GitHub Pages
- **React 19 + TypeScript 5** → strict, no \`any\` outside narrow shims
- **Tailwind CSS 4** for utilities, scoped \`@layer components\` for glass primitives
- **Cloudflare Workers** as a thin proxy so the in-browser Safari can iframe
  third-party sites that set \`X-Frame-Options\` / \`frame-ancestors\`

## Why static export?

This site has no server. Every piece of state lives in \`localStorage\` or
\`IndexedDB\`. That's fast (CDN cache hits everywhere), free to host, and
forces a clean separation between *behavior* and *persistence* — useful
discipline for a portfolio that needs to feel alive without a backend.

## Why a CF Worker for the browser?

\`<iframe src="github.com">\` doesn't work — GitHub sets
\`Content-Security-Policy: frame-ancestors 'self'\`. A 30-line Worker strips
that header and a few siblings. SSRF protection (private-IP block,
manual-redirect re-validation, scheme allowlist) keeps it from being
weaponized as an open proxy.

## Decisions I'd revisit

- **localStorage for the VFS.** Fine for a portfolio, but read amplification
  on every render keeps me from showing 1k+ files smoothly. Next iteration:
  index in memory, snapshot to LS on debounced writes.
- **Shiki for highlighting.** Bundle cost is real (~80kb gzipped after lang
  trimming). At this point on the curve, prefer it over a hand-rolled
  highlighter — the depth of grammar coverage isn't reproducible cheaply.
`,
  },

  {
    name: "WindowManagerContext.tsx",
    annotation:
      "Window state lives in a single reducer. Every drag, resize, focus, minimize goes through one action set. Makes debugging predictable and lets Spotlight / Mission Control plug in without touching component internals.",
    code: `// Slimmed excerpt — full source on GitHub.
type WindowAction =
  | { type: "OPEN"; payload: OpenWindowPayload }
  | { type: "CLOSE"; id: string }
  | { type: "FOCUS"; id: string }
  | { type: "MOVE"; id: string; x: number; y: number }
  | { type: "RESIZE"; id: string; width: number; height: number }
  | { type: "MINIMIZE"; id: string }
  | { type: "RESTORE"; id: string }
  | { type: "MAXIMIZE"; id: string }
  | { type: "SET_TITLE"; id: string; title: string };

function reducer(state: WindowState, action: WindowAction): WindowState {
  switch (action.type) {
    case "OPEN": {
      const id = nextWindowId();
      const w: WindowInstance = {
        id,
        appId: action.payload.appId,
        title: action.payload.title,
        x: action.payload.x ?? cascadeOffset(state, "x"),
        y: action.payload.y ?? cascadeOffset(state, "y"),
        width: action.payload.width ?? 800,
        height: action.payload.height ?? 560,
        zIndex: state.topZ + 1,
        minimized: false,
        maximized: false,
        meta: action.payload.meta ?? {},
      };
      return {
        ...state,
        windows: new Map(state.windows).set(id, w),
        topZ: state.topZ + 1,
        focusedId: id,
      };
    }

    case "FOCUS": {
      const w = state.windows.get(action.id);
      if (!w) return state;
      const next = new Map(state.windows);
      next.set(action.id, { ...w, zIndex: state.topZ + 1, minimized: false });
      return { ...state, windows: next, topZ: state.topZ + 1, focusedId: action.id };
    }

    // …MOVE / RESIZE / MINIMIZE / RESTORE / MAXIMIZE / CLOSE / SET_TITLE
  }
}

// "Cascade" new windows like macOS: each one shifts 22px down-right
// from the last opened, wrapping back near the top-left at the edge.
function cascadeOffset(state: WindowState, axis: "x" | "y"): number {
  const base = axis === "x" ? 80 : 60;
  const step = 22;
  const i = state.windows.size % 12;
  return base + step * i;
}
`,
  },

  {
    name: "Browser.tsx",
    annotation:
      "The in-OS Safari. Two interesting bits: (1) `rewriteForEmbed()` swaps Google → Bing (Google refuses), youtube watch → /embed, etc. (2) Every navigation flows through `viaProxy()` so the CF Worker can strip iframe-blocking headers — except direct embeds (Wikipedia, MDN, Bing) which don't need the proxy.",
    code: `// Excerpt — full source on GitHub.
const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || "";

/** Rewrite a user-typed URL into one that's actually embeddable.
 *  Some sites have an "embed" subpath; others (Google) just refuse forever. */
function rewriteForEmbed(url: string): string {
  try {
    const u = new URL(url);

    // Google search doesn't allow framing under any circumstances → use Bing.
    if (/^(www\\.)?google\\./.test(u.hostname) && u.pathname === "/search") {
      const q = u.searchParams.get("q") ?? "";
      return \`https://www.bing.com/search?q=\${encodeURIComponent(q)}\`;
    }

    // YouTube watch links → embed player (allows framing)
    if (/youtube\\.com$/.test(u.hostname) && u.pathname === "/watch") {
      const v = u.searchParams.get("v");
      if (v) return \`https://www.youtube.com/embed/\${v}\`;
    }

    // Spotify open links → embed player
    if (u.hostname === "open.spotify.com" && !u.pathname.startsWith("/embed/")) {
      return \`https://open.spotify.com/embed\${u.pathname}\`;
    }

    return url;
  } catch {
    return url;
  }
}

/** Route through the Cloudflare Worker proxy so iframe-blocking headers are
 *  stripped. Sites that natively allow embedding (Wikipedia, MDN, Bing) are
 *  passed through directly — proxying them would just slow them down. */
function viaProxy(url: string): string {
  const direct = /(wikipedia\\.org|bing\\.com|developer\\.mozilla\\.org|youtube\\.com\\/embed|spotify\\.com\\/embed)/;
  if (direct.test(url) || !PROXY_URL) return url;
  return \`\${PROXY_URL}/?url=\${encodeURIComponent(url)}\`;
}

function navigate(rawUrl: string) {
  const embeddable = rewriteForEmbed(rawUrl);
  const finalUrl = viaProxy(embeddable);
  setTabs(prev => prev.map(t =>
    t.id === activeTabId
      ? { ...t, url: rawUrl, displayUrl: rawUrl, iframeSrc: finalUrl, loading: true }
      : t
  ));
  pushHistory(rawUrl);
}
`,
  },

  {
    name: "worker.js",
    annotation:
      "The Cloudflare Worker that backs the in-browser Safari. Three security primitives: (1) scheme allowlist (http/https only), (2) private-host block including IPv4/IPv6 ranges + cloud metadata IPs, (3) manual redirect handling that re-validates every hop — so a target can't redirect us to 169.254.169.254 to read AWS IMDS.",
    code: `const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const MAX_REDIRECTS = 5;

const STRIPPED_RESPONSE_HEADERS = [
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "cross-origin-opener-policy",
  "cross-origin-embedder-policy",
  "cross-origin-resource-policy",
  "set-cookie",  // don't leak third-party cookies
];

function isPrivateHost(hostname) {
  if (!hostname) return true;
  const h = hostname.toLowerCase();
  if (h === "localhost") return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^127\\./.test(h)) return true;
  if (/^10\\./.test(h)) return true;
  if (/^192\\.168\\./.test(h)) return true;
  if (/^172\\.(1[6-9]|2[0-9]|3[0-1])\\./.test(h)) return true;
  if (/^169\\.254\\./.test(h)) return true;        // link-local + AWS IMDS
  if (h === "0.0.0.0" || h === "::1") return true;
  if (h.startsWith("fe80:")) return true;          // IPv6 link-local
  if (h.startsWith("fc") || h.startsWith("fd")) return true;  // IPv6 ULA
  if (h === "metadata.google.internal") return true;
  if (h === "168.63.129.16") return true;          // Azure Wire Server
  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");
    if (!target) return jsonError(400, "Missing ?url= parameter");

    let targetUrl;
    try { targetUrl = new URL(target); }
    catch { return jsonError(400, "Invalid target URL"); }

    if (!ALLOWED_SCHEMES.has(targetUrl.protocol)) {
      return jsonError(400, "Scheme not allowed");
    }
    if (isPrivateHost(targetUrl.hostname)) {
      return jsonError(403, "Private address blocked (SSRF protection)");
    }

    // Manual redirects so every hop is re-validated against the privacy / SSRF rules.
    let currentUrl = targetUrl.toString();
    let hops = 0;
    let upstream;
    while (true) {
      const r = await fetch(currentUrl, { redirect: "manual" });
      if (r.status >= 300 && r.status < 400 && r.status !== 304) {
        if (++hops > MAX_REDIRECTS) return jsonError(508, "Too many redirects");
        const loc = r.headers.get("location");
        if (!loc) { upstream = r; break; }
        const nextUrl = new URL(loc, currentUrl);
        if (!ALLOWED_SCHEMES.has(nextUrl.protocol)) {
          return jsonError(403, "Redirect to disallowed scheme blocked");
        }
        if (isPrivateHost(nextUrl.hostname)) {
          return jsonError(403, "Redirect to private address blocked");
        }
        currentUrl = nextUrl.toString();
        continue;
      }
      upstream = r;
      break;
    }

    // Strip blocking headers; pass body through.
    const respHeaders = new Headers();
    for (const [k, v] of upstream.headers.entries()) {
      if (STRIPPED_RESPONSE_HEADERS.includes(k.toLowerCase())) continue;
      respHeaders.set(k, v);
    }
    return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
  },
};
`,
  },

  {
    name: "appMenu.ts",
    annotation:
      "MenuBar dispatches CustomEvents on `window`; apps subscribe with `useAppMenuListener(appId, handler)`. The MenuBar doesn't know what any app actually does, and apps don't know the MenuBar exists. Net result: adding a new app's menu items is one Record entry + one hook call — no central registration.",
    code: `import { useEffect, useRef } from "react";

export const APP_MENU_EVENT = "appMenuAction" as const;

export interface AppMenuActionDetail {
  appId: string;
  type: string;
  payload?: unknown;
}

export function dispatchAppMenuAction(
  appId: string,
  type: string,
  payload?: unknown,
): void {
  const event = new CustomEvent<AppMenuActionDetail>(APP_MENU_EVENT, {
    detail: { appId, type, payload },
  });
  window.dispatchEvent(event);
}

export function useAppMenuListener(
  appId: string,
  handler: (action: AppMenuActionDetail) => void,
): void {
  // Stable ref so consumers don't need to memoize their handler.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = (e: Event) => {
      const detail = (e as CustomEvent<AppMenuActionDetail>).detail;
      if (detail.appId === appId) handlerRef.current(detail);
    };
    window.addEventListener(APP_MENU_EVENT, listener);
    return () => window.removeEventListener(APP_MENU_EVENT, listener);
  }, [appId]);
}
`,
  },

  {
    name: "shiki.ts",
    annotation:
      "The very file rendering this code view. Singleton highlighter, lazy-loaded grammars, JavaScript regex engine instead of WASM — picked because Next.js static export + WASM loaders has historically been a coordination hazard. Slight perf hit, zero deployment risk.",
    code: `import type { HighlighterCore } from "shiki/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

let highlighterPromise: Promise<HighlighterCore> | null = null;

/** Lazy singleton — first call kicks off load, later calls reuse the result. */
export function getHighlighter(): Promise<HighlighterCore> {
  if (highlighterPromise) return highlighterPromise;
  highlighterPromise = createHighlighterCore({
    themes: [
      import("@shikijs/themes/github-dark").then(m => m.default),
    ],
    langs: [
      import("@shikijs/langs/tsx").then(m => m.default),
      import("@shikijs/langs/ts").then(m => m.default),
      import("@shikijs/langs/js").then(m => m.default),
      import("@shikijs/langs/json").then(m => m.default),
      import("@shikijs/langs/md").then(m => m.default),
      // …trimmed
    ],
    engine: createJavaScriptRegexEngine(),
  }).catch(err => {
    // Reset on failure so a retry can attempt again.
    highlighterPromise = null;
    throw err;
  });
  return highlighterPromise;
}

export async function highlight(code: string, lang: string): Promise<string> {
  const hl = await getHighlighter();
  return hl.codeToHtml(code, { lang, theme: "github-dark" });
}
`,
  },
];

/** Path under which all samples are seeded into the virtual file system. */
export const PORTFOLIO_SOURCE_ROOT = "/Users/guest/K4RTO/Source";

/** Build the on-disk content for a sample: prose annotation as a comment + the code itself. */
export function renderSource(s: PortfolioSource): string {
  const ext = s.name.split(".").pop()?.toLowerCase() ?? "";
  const annot = s.annotation.trim();
  if (ext === "md") {
    return `> ${annot.replace(/\n/g, "\n> ")}\n\n${s.code}`;
  }
  // For .ts/.tsx/.js/.jsx/.css/.html etc. — use a line-comment block header.
  const lines = annot.split(/\r?\n/);
  const header =
    `// ─────────────────────────────────────────────────────────────────\n` +
    lines.map(l => `// ${l}`).join("\n") + "\n" +
    `// ─────────────────────────────────────────────────────────────────\n\n`;
  return header + s.code;
}

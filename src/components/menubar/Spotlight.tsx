"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getAllApps } from "@/apps/registry";
import { useT, useSystem } from "@/contexts/SystemContext";
import { useFileSystemOptional } from "@/contexts/FileSystemContext";
import type { Lang } from "@/contexts/SystemContext";

// ── App display metadata ─────────────────────────────────────────────────────
// Emoji glyph + i18n key per dock app. Keep this in sync with src/apps/registry.ts.

const APP_ICONS: Record<string, string> = {
  finder: "🗂",  terminal: "⌨", safari: "🧭", notes: "📝",
  textedit: "📄", settings: "⚙", calculator: "🔢", calendar: "📅",
  clock: "🕐",  preview: "🖼️", vscode: "</>", word: "📘", music: "🎵",
  game2048: "🎮", minesweeper: "💣", snake: "🐍", tetris: "🧱",
};

const APP_NAME_KEYS: Record<string, string> = {
  finder: "dock.finder", safari: "dock.safari", notes: "dock.notes",
  textedit: "dock.textedit", terminal: "dock.terminal",
  calculator: "dock.calculator", calendar: "dock.calendar",
  settings: "dock.settings", clock: "dock.clock", preview: "dock.preview",
  vscode: "dock.vscode", word: "dock.word", music: "dock.music",
  game2048: "dock.game2048", minesweeper: "dock.minesweeper", snake: "dock.snake",
  tetris: "dock.tetris",
};

// ── Portfolio commands ───────────────────────────────────────────────────────
// Curated shortcuts that aren't "launch an app" — these answer questions a
// recruiter / visitor might think to type ("resume", "github", "email").

type PortfolioAction =
  | { type: "launch"; appId: string; meta?: Record<string, string> }
  | { type: "openExternal"; url: string };

interface PortfolioCommand {
  id: string;
  icon: string;
  label: { en: string; zh: string };
  subtitle: { en: string; zh: string };
  /** lowercase trigger words; matches when the user's query is a prefix of a keyword
   *  (e.g. query "res" matches keyword "resume"). Substring matching would over-fire
   *  on single-letter inputs and dump every command into the result list. */
  keywords: string[];
  action: PortfolioAction;
}

const PORTFOLIO_COMMANDS: PortfolioCommand[] = [
  {
    id: "resume",
    icon: "📄",
    label:    { en: "Resume",                                 zh: "简历" },
    subtitle: { en: "Open K4RTO's resume in Preview",         zh: "在预览中打开 K4RTO 简历（PDF）" },
    keywords: ["resume", "cv", "简历", "k4rto"],
    // filePath = the VFS entry (Preview detects "this is a resume" via the regex
    // /\/K4RTO\/Resume(\.|-)/i, then overrides publicPath internally based on the
    // current system language). Keep filePath/publicPath/fileName CONSISTENT here
    // even though Preview ignores publicPath for resumes — mismatched values
    // would mislead anyone reading meta in DevTools.
    action: {
      type: "launch",
      appId: "preview",
      meta: {
        filePath: "/Users/guest/K4RTO/Resume.pdf",
        publicPath: "/K4RTO/Resume.pdf",
        fileName: "Resume.pdf",
      },
    },
  },
  {
    id: "github",
    icon: "🐙",
    label:    { en: "GitHub Profile",     zh: "GitHub 主页" },
    subtitle: { en: "github.com/K4RTO",   zh: "github.com/K4RTO" },
    keywords: ["github", "git", "source", "repo", "项目"],
    action: { type: "openExternal", url: "https://github.com/K4RTO" },
  },
  {
    id: "linkedin",
    icon: "💼",
    label:    { en: "LinkedIn",                  zh: "LinkedIn" },
    subtitle: { en: "linkedin.com/in/K4RTO",     zh: "linkedin.com/in/K4RTO" },
    keywords: ["linkedin", "linked", "in"],
    action: { type: "openExternal", url: "https://www.linkedin.com/in/K4RTO/" },
  },
  {
    id: "email",
    icon: "📧",
    label:    { en: "Email K4RTO",        zh: "联系邮箱" },
    subtitle: { en: "k4rtol@163.com",     zh: "k4rtol@163.com" },
    keywords: ["email", "mail", "contact", "邮箱", "邮件", "联系"],
    action: { type: "openExternal", url: "mailto:k4rtol@163.com" },
  },
  {
    id: "source",
    icon: "</>",
    label:    { en: "Portfolio Source",                              zh: "项目源码" },
    subtitle: { en: "Showcase source files in VSCode",               zh: "在 VSCode 中查看作品源码" },
    keywords: ["source", "code", "vscode", "k4rto", "源码", "代码"],
    action: { type: "launch", appId: "vscode" },
  },
  {
    id: "music",
    icon: "🎵",
    label:    { en: "Music",                            zh: "音乐" },
    subtitle: { en: "K4RTO's playlist on Spotify",      zh: "K4RTO 的 Spotify 歌单" },
    keywords: ["music", "spotify", "playlist", "音乐", "歌单"],
    action: { type: "launch", appId: "music" },
  },
];

// ── Spotlight preview pane ────────────────────────────────────────────────────

interface FsLike {
  readFile: (path: string) => string | null;
}

/** Preview pane on the right of the Spotlight palette. Renders different
 *  views based on the currently-selected result kind:
 *    - file        → first ~30 non-blank lines of the file content
 *    - math        → big-typography result
 *    - app/command → icon + name card with "Press Return to open"
 *    - suggestion  → plain hint
 *  Width matches the wider Spotlight popover (820 - 460 results = 360). */
function SpotlightPreview({
  result, fs, t,
}: {
  result: SpotlightResult | undefined;
  fs: FsLike | null;
  t: (key: string) => string;
}) {
  const fileContent = useMemo(() => {
    if (!result || result.kind !== "file") return null;
    if (!fs) return null;
    return fs.readFile(result.filePath);
  }, [result, fs]);

  const previewLines = useMemo(() => {
    if (typeof fileContent !== "string") return null;
    // Keep the preview lightweight — first ~600 chars worth of lines is plenty
    // to convey "what kind of file is this" without loading huge sources.
    return fileContent.split("\n").slice(0, 30).join("\n");
  }, [fileContent]);

  // Helper — detect image extensions to render the file's bytes (if any) as an
  // <img> instead of as text. Our VFS stores text content only, so this falls
  // back to a placeholder card.
  function isImage(name: string): boolean {
    return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
  }

  // All branches must apply flex-1 to the root so the preview pane reliably
  // claims the remaining 360px in the Spotlight popover row. Without it,
  // branches that don't use flex-1 internally collapse to content width.
  const ROOT = "flex-1";
  if (!result) {
    return (
      <div className={`${ROOT} flex items-center justify-center text-[12px]`} style={{ color: "rgba(255,255,255,0.35)" }}>
        {t("spotlight.preview.empty")}
      </div>
    );
  }

  if (result.kind === "math") {
    return (
      <div className={`${ROOT} flex flex-col items-center justify-center px-6`}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {t("spotlight.preview.result")}
        </div>
        <div style={{ color: "white", fontSize: 38, fontWeight: 200, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {result.value}
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 14 }}>
          {t("spotlight.preview.copyHint")}
        </div>
      </div>
    );
  }

  if (result.kind === "app" || result.kind === "command") {
    return (
      <div className={`${ROOT} flex flex-col items-center justify-center px-6`}>
        <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 14 }}>{result.icon}</div>
        <div style={{ color: "rgba(255,255,255,0.92)", fontSize: 15, fontWeight: 600, textAlign: "center" }}>
          {result.label}
        </div>
        {result.subtitle && (
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 4, textAlign: "center" }}>
            {result.subtitle}
          </div>
        )}
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 18 }}>
          {t("spotlight.preview.openHint")}
        </div>
      </div>
    );
  }

  if (result.kind === "suggestion") {
    return (
      <div className={`${ROOT} flex items-center justify-center text-[12px] px-6 text-center`} style={{ color: "rgba(255,255,255,0.4)" }}>
        {t("spotlight.preview.suggestionHint")}
      </div>
    );
  }

  // file
  return (
    <div className={`${ROOT} flex flex-col`} style={{ overflow: "hidden" }}>
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 18 }}>{result.icon}</span>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="truncate" style={{ color: "rgba(255,255,255,0.95)", fontSize: 12, fontWeight: 600 }}>{result.fileName}</span>
          <span className="truncate" style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>{result.filePath}</span>
        </div>
      </div>
      {isImage(result.fileName) ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          {t("spotlight.preview.imageNotShown")}
        </div>
      ) : previewLines ? (
        <pre
          className="flex-1 overflow-hidden px-4 py-2"
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: 10.5,
            fontFamily: "'SF Mono', Menlo, Monaco, monospace",
            lineHeight: 1.5,
            whiteSpace: "pre",
            margin: 0,
          }}
        >
          {previewLines}
        </pre>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          {t("spotlight.preview.notReadable")}
        </div>
      )}
    </div>
  );
}

// ── Result types & matching ──────────────────────────────────────────────────

type SpotlightResult =
  | { kind: "command";    id: string; label: string; subtitle: string; icon: string; action: PortfolioAction }
  | { kind: "app";        id: string; label: string; subtitle: string; icon: string; appId: string }
  | { kind: "file";       id: string; label: string; subtitle: string; icon: string; filePath: string; fileName: string }
  | { kind: "math";       id: string; label: string; subtitle: string; value: string }
  | { kind: "suggestion"; id: string; label: string; subtitle: string };

/**
 * Safe math expression evaluator for Spotlight's calculator feature.
 *
 * Implements a small hand-written recursive-descent parser instead of using
 * `eval` or `new Function()` — even with whitelisting, building dynamic JS
 * from user input is a code-injection footgun. Parsing into a numeric value
 * via a closed grammar means an attacker has literally no payload to deliver.
 *
 * Grammar (lowest precedence first):
 *   expr   ::= term (('+' | '-') term)*
 *   term   ::= power (('*' | '/' | '%') power)*
 *   power  ::= unary ('^' unary)*           // right-associative
 *   unary  ::= ('+' | '-') unary | atom
 *   atom   ::= number | constant | '(' expr ')' | func '(' expr ')'
 *
 * Accepts: digits, decimals, parens, + - * / % ^, the constants π/pi/e, and
 * the function names sqrt sin cos tan asin acos atan log (=log10)
 * ln (=natural log) abs floor ceil round.
 *
 * Returns the numeric result, or null on any parse/eval error.
 */
type MathToken =
  | { type: "num"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "%" | "^" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "const"; value: number }
  | { type: "func"; name: string };

const MATH_FUNCS: Record<string, (x: number) => number> = {
  sqrt:  Math.sqrt,
  sin:   Math.sin,
  cos:   Math.cos,
  tan:   Math.tan,
  asin:  Math.asin,
  acos:  Math.acos,
  atan:  Math.atan,
  log:   Math.log10,    // base-10, matches calculator convention
  ln:    Math.log,      // natural log
  abs:   Math.abs,
  floor: Math.floor,
  ceil:  Math.ceil,
  round: Math.round,
};

function tokenizeMath(input: string): MathToken[] | null {
  const tokens: MathToken[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === " " || ch === "\t") { i++; continue; }
    // Number (digits, optional decimal point, optional more digits)
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let j = i;
      let sawDot = false;
      while (j < input.length) {
        const c = input[j];
        if (c >= "0" && c <= "9") j++;
        else if (c === "." && !sawDot) { sawDot = true; j++; }
        else break;
      }
      const n = parseFloat(input.slice(i, j));
      if (isNaN(n)) return null;
      tokens.push({ type: "num", value: n });
      i = j;
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "%" || ch === "^") {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    if (ch === "(") { tokens.push({ type: "lparen" }); i++; continue; }
    if (ch === ")") { tokens.push({ type: "rparen" }); i++; continue; }
    if (ch === "π") { tokens.push({ type: "const", value: Math.PI }); i++; continue; }
    // Identifier — function name or constant
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
      let j = i;
      while (j < input.length) {
        const c = input[j];
        if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")) j++;
        else break;
      }
      const name = input.slice(i, j).toLowerCase();
      if (name === "pi") tokens.push({ type: "const", value: Math.PI });
      else if (name === "e") tokens.push({ type: "const", value: Math.E });
      else if (name in MATH_FUNCS) tokens.push({ type: "func", name });
      else return null;
      i = j;
      continue;
    }
    return null;
  }
  return tokens;
}

function evalMath(raw: string): number | null {
  const s = raw.trim();
  // Require at least one digit so plain word queries like "github" don't
  // accidentally light up a math row.
  if (!s || !/[0-9]/.test(s)) return null;

  const tokens = tokenizeMath(s);
  if (!tokens || tokens.length === 0) return null;

  let pos = 0;
  function peek(): MathToken | undefined { return tokens![pos]; }
  function eat(): MathToken | undefined { return tokens![pos++]; }

  function parseExpr(): number {
    let left = parseTerm();
    while (peek()?.type === "op" && (peek() as { value: string }).value === "+") {
      eat();
      left = left + parseTerm();
    }
    while (true) {
      const p = peek();
      if (p?.type === "op" && (p.value === "+" || p.value === "-")) {
        eat();
        const right = parseTerm();
        left = p.value === "+" ? left + right : left - right;
      } else break;
    }
    return left;
  }
  function parseTerm(): number {
    let left = parsePower();
    while (true) {
      const p = peek();
      if (p?.type === "op" && (p.value === "*" || p.value === "/" || p.value === "%")) {
        eat();
        const right = parsePower();
        if (p.value === "*") left = left * right;
        else if (p.value === "/") left = left / right;
        else left = left % right;
      } else break;
    }
    return left;
  }
  function parsePower(): number {
    const base = parseUnary();
    const p = peek();
    if (p?.type === "op" && p.value === "^") {
      eat();
      return Math.pow(base, parsePower());   // right-associative
    }
    return base;
  }
  function parseUnary(): number {
    const p = peek();
    if (p?.type === "op" && (p.value === "+" || p.value === "-")) {
      eat();
      const v = parseUnary();
      return p.value === "-" ? -v : v;
    }
    return parseAtom();
  }
  function parseAtom(): number {
    const tok = eat();
    if (!tok) throw new Error("unexpected end");
    if (tok.type === "num" || tok.type === "const") return tok.value;
    if (tok.type === "lparen") {
      const v = parseExpr();
      const close = eat();
      if (close?.type !== "rparen") throw new Error("missing )");
      return v;
    }
    if (tok.type === "func") {
      const open = eat();
      if (open?.type !== "lparen") throw new Error("missing (");
      const arg = parseExpr();
      const close = eat();
      if (close?.type !== "rparen") throw new Error("missing )");
      return MATH_FUNCS[tok.name](arg);
    }
    throw new Error("unexpected token");
  }

  try {
    const result = parseExpr();
    if (pos !== tokens.length) return null;   // trailing junk
    if (typeof result !== "number" || !isFinite(result) || isNaN(result)) return null;
    return result;
  } catch {
    return null;
  }
}

/** Format a math result for the Spotlight row: integer if whole, else up to
 *  10 significant digits (trims trailing zeros). */
function formatMathResult(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return parseFloat(n.toPrecision(10)).toString();
}

const APP_ICON_FALLBACK = "📦";
const FILE_ICONS: Record<string, string> = {
  md: "📄", txt: "📄", pdf: "📕",
  png: "🖼️", jpg: "🖼️", jpeg: "🖼️", webp: "🖼️", gif: "🖼️",
  ts: "🟦", tsx: "🟦", js: "🟨", jsx: "🟨",
  json: "🟧", css: "🎨", html: "🌐",
  doc: "📘", docx: "📘",
};

/** Pick which app should open a given file based on its extension. */
function appForFile(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf", "png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "preview";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["ts", "tsx", "js", "jsx", "json", "css", "html", "md"].includes(ext)) return "vscode";
  return "textedit";
}

/** Render-side meta for a file launch (different apps want slightly different keys). */
function metaForFile(appId: string, filePath: string, fileName: string): Record<string, string> {
  // Preview can additionally read publicPath for asset-backed files (images / Resume).
  // For VFS-only files (Notes, source samples), publicPath is unused and harmless.
  if (appId === "preview") {
    const publicPath = filePath.replace("/Users/guest/", "/");
    return { filePath, publicPath, fileName };
  }
  return { filePath, fileName };
}

// ── Component ────────────────────────────────────────────────────────────────

interface SpotlightProps {
  onClose: () => void;
  /** Widened from `(appId)` so commands can pass meta (Resume → Preview, etc.). */
  onLaunchApp: (appId: string, meta?: Record<string, string>) => void;
}

export function Spotlight({ onClose, onLaunchApp }: SpotlightProps) {
  const t = useT();
  const { lang } = useSystem();
  const fs = useFileSystemOptional();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo<SpotlightResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: SpotlightResult[] = [];
    const langKey: Lang = lang === "zh" ? "zh" : "en";

    // 0. Math expression — top result when the input looks like one. Computed
    //    first so it sits above curated commands; a recruiter typing "2+2"
    //    sees the answer immediately, no extra clicks.
    const mathResult = evalMath(query);
    if (mathResult !== null) {
      const formatted = formatMathResult(mathResult);
      out.push({
        kind: "math",
        id: `math:${query}`,
        label: `= ${formatted}`,
        subtitle: t("spotlight.math.subtitle"),
        value: formatted,
      });
    }

    // 1. Portfolio commands — curated, highest signal.
    for (const cmd of PORTFOLIO_COMMANDS) {
      // Prefix-match keywords (so "res" → "resume" but "e" doesn't match every command).
      // Labels still allow substring match — labels are user-visible names so it's
      // intuitive that mid-word matches work there.
      const hit = cmd.keywords.some(k => k.startsWith(q)) ||
                  cmd.label[langKey].toLowerCase().includes(q) ||
                  cmd.label.en.toLowerCase().includes(q);
      if (hit) {
        out.push({
          kind: "command",
          id: `cmd:${cmd.id}`,
          label: cmd.label[langKey],
          subtitle: cmd.subtitle[langKey],
          icon: cmd.icon,
          action: cmd.action,
        });
      }
    }

    // 2. Apps by localized + English name.
    for (const app of getAllApps()) {
      const localized = APP_NAME_KEYS[app.id] ? t(APP_NAME_KEYS[app.id]) : app.name;
      if (localized.toLowerCase().includes(q) || app.name.toLowerCase().includes(q)) {
        out.push({
          kind: "app",
          id: `app:${app.id}`,
          label: localized,
          subtitle: t("spotlight.application"),
          icon: APP_ICONS[app.id] ?? APP_ICON_FALLBACK,
          appId: app.id,
        });
      }
    }

    // 3. VFS files — search by filename (cap at 8 to keep the list manageable).
    if (fs) {
      const FILE_CAP = 8;
      const seen = new Set<string>();
      let fileCount = 0;
      /** Returns true if the cap was hit — caller must propagate so the recursion
       *  unwinds instead of continuing into sibling directories and overshooting. */
      const collect = (dir: string): boolean => {
        if (seen.has(dir)) return false;
        seen.add(dir);
        for (const e of fs.readDir(dir)) {
          if (e.type === "dir") {
            if (e.name.startsWith(".") || e.name === "Applications") continue;
            if (collect(e.path)) return true;
          } else if (e.name.toLowerCase().includes(q)) {
            const ext = e.name.split(".").pop()?.toLowerCase() ?? "";
            out.push({
              kind: "file",
              id: `file:${e.path}`,
              label: e.name,
              subtitle: e.path,
              icon: FILE_ICONS[ext] ?? "📄",
              filePath: e.path,
              fileName: e.name,
            });
            if (++fileCount >= FILE_CAP) return true;
          }
        }
        return false;
      };
      collect("/Users/guest");
    }

    // 4. Web search fallback — always last so curated stuff wins.
    out.push({
      kind: "suggestion",
      id: "web",
      label: t("spotlight.searchWebFor", { q: query }),
      subtitle: t("spotlight.web"),
    });

    return out;
  }, [query, lang, t, fs]);

  // Clamp selection when results change.
  useEffect(() => {
    setSelected(s => Math.min(s, Math.max(0, results.length - 1)));
  }, [results.length]);

  const launch = useCallback((r: SpotlightResult) => {
    switch (r.kind) {
      case "command":
        if (r.action.type === "launch") {
          onLaunchApp(r.action.appId, r.action.meta);
        } else {
          // Open external URL (mailto / linkedin / github) in a real browser tab —
          // these sites either refuse iframing entirely (GitHub) or aren't worth
          // proxying for navigation (LinkedIn, mailto:).
          window.open(r.action.url, "_blank", "noopener,noreferrer");
        }
        onClose();
        return;
      case "app":
        onLaunchApp(r.appId);
        onClose();
        return;
      case "file": {
        const appId = appForFile(r.fileName);
        onLaunchApp(appId, metaForFile(appId, r.filePath, r.fileName));
        onClose();
        return;
      }
      case "math":
        // Copy the numeric result to the clipboard so the user can paste it
        // wherever they were heading. Fail silently if the API isn't
        // available (older browsers, insecure context) — the result is still
        // visible on screen so no information is lost.
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(r.value).catch(() => {});
        }
        onClose();
        return;
      case "suggestion":
        // Use Bing instead of Google — Google refuses iframe embedding so opening
        // it in the in-OS Safari would just show a blank page; Bing renders fine.
        window.open(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
        onClose();
        return;
    }
  }, [query, onLaunchApp, onClose]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) launch(results[selected]);
  }

  return (
    <div
      className="fixed inset-0 flex items-start justify-center"
      style={{ zIndex: 99990, backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", paddingTop: "18vh" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-surface glass-thick glass-shadow-lg glass-radius-popover"
        // Wider when we have results so the right-hand preview pane fits;
        // collapses back to 640 when there's nothing to preview (e.g. empty
        // query, search-the-web suggestion only). Matches real macOS Spotlight,
        // which also expands once results exist.
        style={{
          width: results.length > 0 ? 820 : 640,
          overflow: "hidden",
          transition: "width 0.18s ease",
        }}
      >
        {/* Search input — px-6 (24px) for the macOS Spotlight breathing room.
            px-5 (20px) was visibly cramped against the rounded corners. */}
        <div className="flex items-center gap-3 px-6" style={{ height: 58 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={onKeyDown}
            placeholder={t("spotlight.placeholder")}
            className="flex-1 bg-transparent outline-none border-none text-[18px]"
            style={{ color: "rgba(255,255,255,0.9)", caretColor: "#0058d0" }}
            spellCheck={false}
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ color: "rgba(255,255,255,0.3)", fontSize: 18, lineHeight: 1 }}
              aria-label={t("spotlight.clearQuery")}
            >×</button>
          )}
        </div>

        {/* Results + Preview pane — flex row when both columns are present.
            Left pane scrolls independently; right pane shows context for the
            currently-selected result (file content, app icon, math answer). */}
        {results.length > 0 && (
          <div
            className="flex"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)", maxHeight: 420 }}
          >
            <div
              style={{ width: 460, overflowY: "auto", borderRight: "1px solid rgba(255,255,255,0.06)" }}
            >
            {results.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-6 cursor-default"
                style={{
                  height: 48,
                  backgroundColor: i === selected ? "rgba(0,88,208,0.9)" : "transparent",
                }}
                onMouseEnter={() => setSelected(i)}
                onMouseDown={() => launch(r)}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 28, height: 28, fontSize: 18 }}
                >
                  {r.kind === "suggestion"
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    : r.kind === "math"
                      ? "="
                      : r.icon}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className="truncate"
                    style={{ color: i === selected ? "white" : "rgba(255,255,255,0.85)", fontSize: 14 }}
                  >
                    {r.label}
                  </span>
                  {r.subtitle && (
                    <span
                      className="truncate"
                      style={{ color: i === selected ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)", fontSize: 11 }}
                    >
                      {r.subtitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
            </div>
            <SpotlightPreview result={results[selected]} fs={fs} t={t} />
          </div>
        )}
      </div>
    </div>
  );
}

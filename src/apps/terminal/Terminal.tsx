"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useFileSystemOptional } from "@/contexts/FileSystemContext";
import { useSystem, useT } from "@/contexts/SystemContext";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useProcesses } from "@/contexts/ProcessContext";
import { useAppMenuListener } from "@/lib/menubar/appMenu";
import { findCommand, completeCommandName } from "./commands/registry";
import type { Line, Seg, CommandContext, TerminalFsCtx, TerminalFsEntry } from "./commands/types";
import { COLORS, plain } from "./commands/types";

// ── Fallback in-memory FS (when no SystemContext FS available) ───────────

const HOME = "/Users/guest";

type FallbackNode = { type: "file" | "dir"; content?: string };
const INIT: Record<string, FallbackNode> = {
  "/": { type: "dir" },
  "/Users": { type: "dir" },
  "/Users/guest": { type: "dir" },
  "/Users/guest/Desktop": { type: "dir" },
  "/Users/guest/Documents": { type: "dir" },
  "/Users/guest/Downloads": { type: "dir" },
  "/Applications": { type: "dir" },
};

function createFallback(): TerminalFsCtx {
  const store: Record<string, FallbackNode> = { ...INIT };
  function norm(p: string): string {
    const parts = p.split("/").filter(Boolean);
    const out: string[] = [];
    for (const seg of parts) { if (seg === "..") out.pop(); else if (seg !== ".") out.push(seg); }
    return "/" + out.join("/");
  }
  function children(path: string): TerminalFsEntry[] {
    const np = norm(path);
    const prefix = np === "/" ? "/" : np + "/";
    return Object.entries(store)
      .filter(([k]) => k !== np && k.startsWith(prefix) && !k.slice(prefix.length).includes("/"))
      .map(([k, v]) => {
        const name = k.split("/").pop() ?? k;
        const content = v.content ?? "";
        return { path: k, name, type: v.type, content, size: content.length, createdAt: 0, modifiedAt: 0 };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return {
    exists: p => norm(p) in store,
    getEntry: p => {
      const np = norm(p);
      const n = store[np];
      if (!n) return null;
      const c = n.content ?? "";
      return { path: np, name: np.split("/").pop() ?? np, type: n.type, content: c, size: c.length, createdAt: 0, modifiedAt: 0 };
    },
    readDir: children,
    readFile: p => { const n = store[norm(p)]; return n?.type === "file" ? (n.content ?? "") : null; },
    writeFile: (p, c) => { store[norm(p)] = { type: "file", content: c }; },
    mkdir: p => { store[norm(p)] = { type: "dir" }; },
    remove: p => { const np = norm(p); for (const k of Object.keys(store)) if (k === np || k.startsWith(np + "/")) delete store[k]; },
  };
}

// ── Path helpers ─────────────────────────────────────────────────────────

function resolve(cwd: string, input: string): string {
  if (!input) return cwd;
  if (input === "~") return HOME;
  if (input.startsWith("~/")) return HOME + input.slice(1);
  const parts = (input.startsWith("/") ? input : cwd + "/" + input).split("/").filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p !== ".") out.push(p);
  }
  return "/" + out.join("/");
}

function shorten(cwd: string): string {
  if (cwd === HOME) return "~";
  if (cwd.startsWith(HOME + "/")) {
    const rest = cwd.slice(HOME.length + 1).split("/");
    return "~/" + (rest.length > 2 ? rest.slice(-2).join("/") : rest.join("/"));
  }
  const parts = cwd.split("/").filter(Boolean);
  return parts.length > 2 ? "/" + parts.slice(-2).join("/") : cwd;
}

function promptSegs(cwd: string): Seg[] {
  return [
    { text: "guest@macos", color: COLORS.prompt },
    { text: " " + cwd + " % ", color: COLORS.text },
  ];
}

// ── Tab completion ───────────────────────────────────────────────────────

function completePath(cwd: string, prefix: string, fs: TerminalFsCtx): string[] {
  // Split prefix into dir + partial name
  const lastSlash = prefix.lastIndexOf("/");
  let dirPart = "";
  let namePart = prefix;
  if (lastSlash >= 0) {
    dirPart = prefix.slice(0, lastSlash + 1);
    namePart = prefix.slice(lastSlash + 1);
  }
  const dirAbs = dirPart ? resolve(cwd, dirPart) : cwd;
  const entry = fs.getEntry(dirAbs);
  if (!entry || entry.type !== "dir") return [];
  const entries = fs.readDir(dirAbs);
  return entries
    .filter(e => e.name.toLowerCase().startsWith(namePart.toLowerCase()))
    .map(e => dirPart + e.name + (e.type === "dir" ? "/" : ""));
}

/** Longest common prefix of a list of strings. */
function commonPrefix(strs: string[]): string {
  if (strs.length === 0) return "";
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (!strs[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (prefix === "") return "";
    }
  }
  return prefix;
}

// ── Main Component ───────────────────────────────────────────────────────

export default function Terminal({ windowId, processId: _pid }: AppComponentProps) {
  const vfs = useFileSystemOptional();
  const { lang } = useSystem();
  const t = useT();
  const wm = useWindowManager();
  const { launch } = useProcesses();
  const fsRef = useRef<TerminalFsCtx>(createFallback());

  useEffect(() => { if (vfs) fsRef.current = vfs as unknown as TerminalFsCtx; });

  const now = new Date();
  const loginStr = lang === "zh"
    ? `Last login: ${now.toDateString()} ${now.toTimeString().slice(0, 8)} on ttys000`
    : `Last login: ${now.toDateString()} ${now.toTimeString().slice(0, 8)} on ttys000`;
  const welcomeLine: Line = {
    segs: [
      { text: lang === "zh" ? "输入 'help' 看可用命令，'resume' 打开简历。" : "Type 'help' for commands, 'resume' to open the CV.", color: COLORS.dim },
    ],
  };

  const [lines, setLines] = useState<Line[]>([plain(loginStr), welcomeLine, plain("")]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState(HOME);
  const cwdRef = useRef(HOME);
  const [hist, setHist] = useState<string[]>([]);
  const [, setHistIdx] = useState(-1);
  const [busy, setBusy] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cap lines to prevent unbounded memory growth on long sessions
  const MAX_LINES = 2000;
  const appendLines = useCallback((toAppend: Line[]) => {
    setLines(prev => {
      const next = [...prev, ...toAppend];
      return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
    });
  }, []);

  // Auto-scroll to bottom whenever lines change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  // Build the command execution context. `cwd` is exposed as a live getter so
  // commands that call `ctx.setCwd(...)` then re-read `ctx.cwd` see the new value.
  const buildContext = useCallback((mutableCwd: { current: string }): CommandContext => {
    return {
      // Defined via Object.defineProperty below — TypeScript still sees a string field.
      get cwd() { return mutableCwd.current; },
      fs: fsRef.current,
      lang,
      history: hist,
      print: (line: Line) => { appendLines([line]); },
      println: (text: string, color?: string) => { appendLines([plain(text, color)]); },
      clearScreen: () => { setLines([]); },
      setCwd: (p: string) => { mutableCwd.current = p; setCwd(p); cwdRef.current = p; },
      launch: (appId: string, meta?: Record<string, string>) => { launch(appId, meta); },
      externalOpen: (url: string) => {
        // Protocol whitelist — defense in depth in case future commands forward
        // arbitrary user input here. mailto: is allowed for `mail` command.
        if (/^(https?:|mailto:)/i.test(url)) {
          window.open(url, "_blank", "noopener");
        }
      },
      exit: () => { wm.closeWindow(windowId); },
    } as CommandContext;
  }, [lang, hist, launch, wm, windowId, appendLines]);

  const runLine = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed) setHist(h => [trimmed, ...h]);
    setHistIdx(-1);

    // Echo the prompt + input as a transcript line
    const promptLine: Line = {
      segs: [...promptSegs(shorten(cwdRef.current)), { text: raw, color: COLORS.text }],
    };
    appendLines([promptLine]);

    if (!trimmed) { setInput(""); return; }

    const [name, ...args] = trimmed.split(/\s+/);
    const cmd = findCommand(name);

    if (!cmd) {
      appendLines([plain(`${t("terminal.commandNotFound")}${name}`, COLORS.err)]);
      setInput("");
      return;
    }

    setBusy(true);
    setInput("");
    const mutCwd = { current: cwdRef.current };
    const ctx = buildContext(mutCwd);
    try {
      await cmd.handler(args, ctx);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      appendLines([plain(`${t("terminal.error")}${msg}`, COLORS.err)]);
    } finally {
      setBusy(false);
    }
  }, [buildContext, appendLines]);

  const submit = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    void runLine(input);
  }, [input, runLine]);

  const handleTabComplete = useCallback(() => {
    const trimmed = input.trimStart();
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      // Command name completion
      const candidates = completeCommandName(parts[0]);
      if (candidates.length === 0) return;
      if (candidates.length === 1) {
        setInput(candidates[0] + " ");
        return;
      }
      const common = commonPrefix(candidates);
      if (common.length > parts[0].length) {
        setInput(common);
        return;
      }
      // Show candidate list
      appendLines([{
        segs: candidates.map((c, i) => i === 0
          ? { text: c, color: COLORS.success }
          : { text: "  " + c, color: COLORS.success }),
      }]);
    } else {
      // Path completion for the last argument
      const lastArg = parts[parts.length - 1];
      const matches = completePath(cwdRef.current, lastArg, fsRef.current);
      if (matches.length === 0) return;
      if (matches.length === 1) {
        const rest = parts.slice(0, -1).join(" ");
        setInput(rest + " " + matches[0]);
        return;
      }
      const common = commonPrefix(matches);
      if (common.length > lastArg.length) {
        const rest = parts.slice(0, -1).join(" ");
        setInput(rest + " " + common);
        return;
      }
      appendLines([{
        segs: matches.slice(0, 12).map((m, i) => i === 0
          ? { text: m, color: COLORS.dir }
          : { text: "  " + m, color: COLORS.dir }),
      }]);
    }
  }, [input, appendLines]);

  const keyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") { e.preventDefault(); handleTabComplete(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHistIdx(prev => {
        const next = Math.min(prev + 1, hist.length - 1);
        setInput(hist[next] ?? "");
        return next;
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHistIdx(prev => {
        const next = Math.max(prev - 1, -1);
        setInput(next === -1 ? "" : (hist[next] ?? ""));
        return next;
      });
    } else if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      const promptLine: Line = {
        segs: [...promptSegs(shorten(cwdRef.current)), { text: input + "^C", color: COLORS.text }],
      };
      appendLines([promptLine]);
      setInput("");
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  }, [hist, input, handleTabComplete, appendLines]);

  // ── MenuBar integration ───────────────────────────────────────────────

  useAppMenuListener("terminal", (detail) => {
    switch (detail.type) {
      case "clear": setLines([]); break;
      case "exit":  wm.closeWindow(windowId); break;
    }
  });

  return (
    <div
      className="h-full flex flex-col font-mono text-[13px] leading-5 cursor-text select-text"
      style={{ backgroundColor: COLORS.bg, color: COLORS.text, animation: "fadeIn 0.2s ease" }}
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap min-h-[1.25rem]">
            {line.segs.map((s, j) => <span key={j} style={{ color: s.color ?? COLORS.text }}>{s.text}</span>)}
          </div>
        ))}
        <form onSubmit={submit} className="flex items-center">
          {promptSegs(shorten(cwd)).map((s, i) => (
            <span key={i} style={{ color: s.color ?? COLORS.text }}>{s.text}</span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={keyDown}
            disabled={busy}
            className="flex-1 bg-transparent outline-none border-none text-[13px] font-mono"
            style={{ color: COLORS.text, caretColor: COLORS.prompt }}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            aria-label="Terminal input"
          />
        </form>
      </div>
    </div>
  );
}

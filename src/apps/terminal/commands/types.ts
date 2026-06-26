/**
 * Terminal command system — shared types.
 *
 * Each command is a self-contained module exporting a `Command` object. The
 * registry composes them into a single lookup table at construction time.
 *
 * Commands are sync OR async. Async is useful for animation effects (matrix
 * rain, cowsay typewriter) where output should arrive in batches over time.
 */

export interface TerminalFsCtx {
  readDir(p: string): TerminalFsEntry[];
  readFile(p: string): string | null;
  writeFile(p: string, content: string): void;
  mkdir(p: string): void;
  remove(p: string): void;
  exists(p: string): boolean;
  getEntry(p: string): TerminalFsEntry | null;
}

export interface TerminalFsEntry {
  path: string;
  name: string;
  type: "file" | "dir";
  content: string;
  size: number;
  createdAt: number;
  modifiedAt: number;
}

// ── Line representation (matches existing Terminal.tsx shape) ─────────────

export interface Seg { text: string; color?: string }
export interface Line { segs: Seg[] }

export const COLORS = {
  bg:        "#1c1c1e",
  text:      "#d4d4d4",
  prompt:    "#28C840",  // green
  dir:       "#4a9eff",  // blue (matches Finder accent)
  err:       "#ff5f57",  // red (traffic light red)
  success:   "#34c759",  // green
  warn:      "#ffbd2e",  // yellow
  info:      "#4a9eff",  // blue
  dim:       "#888",
  link:      "#00bcd4",  // cyan
  highlight: "#ffcc00",
} as const;

export function plain(t: string, color?: string): Line {
  return { segs: [{ text: t, color }] };
}
export function err(t: string): Line { return plain(t, COLORS.err); }
export function ok(t: string): Line { return plain(t, COLORS.success); }
export function dim(t: string): Line { return plain(t, COLORS.dim); }
export function info(t: string): Line { return plain(t, COLORS.info); }

// ── Command context — what the handler can do ────────────────────────────

export interface CommandContext {
  /** Current working directory (absolute) */
  cwd: string;
  /** Virtual filesystem accessor */
  fs: TerminalFsCtx;
  /** UI language ('en' | 'zh') */
  lang: "en" | "zh";
  /** Output a single line */
  print: (line: Line) => void;
  /** Output plain text shortcut */
  println: (text: string, color?: string) => void;
  /** Wipe the terminal */
  clearScreen: () => void;
  /** Change directory */
  setCwd: (path: string) => void;
  /** Launch another app (e.g. resume → preview) */
  launch: (appId: string, meta?: Record<string, string>) => void;
  /** Open a VFS path with the default app */
  openFile: (path: string) => boolean;
  /** Open external URL in new browser tab */
  externalOpen: (url: string) => void;
  /** Running frontend processes */
  listProcesses: () => Array<{ id: string; appId: string; appName: string; windowId: string; status: string; launchedAt: number }>;
  /** Kill a frontend process */
  killProcess: (id: string) => boolean;
  /** Installed applications */
  listApps: () => Array<{ id: string; name: string; bundleId: string; version: string; category: string }>;
  readSetting: (key: string) => string | null;
  writeSetting: (key: string, value: string) => boolean;
  systemProfile: Record<string, string | number>;
  /** Reference to command history (read-only) */
  history: ReadonlyArray<string>;
  /** Close the Terminal window */
  exit: () => void;
}

// ── Command handler ──────────────────────────────────────────────────────

export type CommandHandler = (args: string[], ctx: CommandContext) => void | Promise<void>;

export interface Command {
  /** Primary name (lowercase) */
  name: string;
  /** Short description shown by `help` */
  description: { en: string; zh: string };
  /** Optional usage string ("ls [path]") */
  usage?: string;
  /** Optional category for grouping in help output */
  category?: "system" | "portfolio" | "egg" | "navigation";
  /** Alternative names */
  aliases?: string[];
  /** Whether the command is hidden from `help` (eggs are hidden) */
  hidden?: boolean;
  /** The actual implementation */
  handler: CommandHandler;
}

/**
 * System / Unix-like commands. Ported from the original switch-based Terminal,
 * plus history / man / open / exit / theme / lang.
 */

import type { Command } from "./types";
import { COLORS, err } from "./types";

const HOME = "/Users/guest";

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

export const systemCommands: Command[] = [
  {
    name: "pwd",
    category: "system",
    description: { en: "Print working directory", zh: "显示当前目录" },
    handler: (_args, ctx) => { ctx.println(ctx.cwd); },
  },
  {
    name: "cd",
    category: "navigation",
    usage: "cd [path]",
    description: { en: "Change directory", zh: "切换目录" },
    handler: (args, ctx) => {
      const target = args[0] ? resolve(ctx.cwd, args[0]) : HOME;
      const e = ctx.fs.getEntry(target);
      if (!e) { ctx.print(err(`cd: no such file or directory: ${args[0] ?? "~"}`)); return; }
      if (e.type !== "dir") { ctx.print(err(`cd: not a directory: ${args[0]}`)); return; }
      ctx.setCwd(target);
    },
  },
  {
    name: "ls",
    category: "navigation",
    usage: "ls [-a] [path]",
    description: { en: "List directory contents", zh: "列出目录内容" },
    handler: (args, ctx) => {
      const showHidden = args.includes("-a") || args.includes("-la") || args.includes("-al");
      const pathArg = args.find(a => !a.startsWith("-"));
      const p = pathArg ? resolve(ctx.cwd, pathArg) : ctx.cwd;
      const e = ctx.fs.getEntry(p);
      if (!e) { ctx.print(err(`ls: ${pathArg ?? "."}: No such file or directory`)); return; }
      let entries = e.type === "file" ? [e] : ctx.fs.readDir(p);
      if (!showHidden) entries = entries.filter(en => !en.name.startsWith("."));
      if (entries.length === 0) return;
      const segs = [];
      for (let i = 0; i < entries.length; i++) {
        const ent = entries[i];
        if (ent.type === "dir") {
          segs.push({ text: ent.name + "/", color: COLORS.dir });
        } else {
          segs.push({ text: ent.name });
          const sz = ent.size < 1024 ? ent.size + "B" : (ent.size / 1024).toFixed(1) + "K";
          segs.push({ text: " (" + sz + ")", color: COLORS.dim });
        }
        if (i < entries.length - 1) segs.push({ text: "  " });
      }
      ctx.print({ segs });
    },
  },
  {
    name: "cat",
    category: "system",
    usage: "cat <file>",
    description: { en: "Print file contents", zh: "打印文件内容" },
    handler: (args, ctx) => {
      if (!args[0]) { ctx.print(err("cat: missing operand")); return; }
      const fp = resolve(ctx.cwd, args[0]);
      const content = ctx.fs.readFile(fp);
      if (content === null) {
        const e = ctx.fs.getEntry(fp);
        ctx.print(err(`cat: ${args[0]}: ${e?.type === "dir" ? "Is a directory" : "No such file or directory"}`));
        return;
      }
      content.split("\n").forEach(l => ctx.println(l));
    },
  },
  {
    name: "echo",
    category: "system",
    usage: "echo <text> [> file]",
    description: { en: "Print text (supports > redirection)", zh: "打印文本（支持 > 重定向）" },
    handler: (args, ctx) => {
      const raw = args.join(" ");
      const redir = raw.match(/^(.*?)\s*>\s*(\S+)\s*$/);
      if (redir) {
        const text = redir[1].replace(/^["']|["']$/g, "");
        const target = resolve(ctx.cwd, redir[2]);
        ctx.fs.writeFile(target, text + "\n");
        return;
      }
      ctx.println(raw);
    },
  },
  {
    name: "mkdir",
    category: "system",
    usage: "mkdir <dir>",
    description: { en: "Create directory", zh: "新建目录" },
    handler: (args, ctx) => {
      if (!args[0]) { ctx.print(err("mkdir: missing operand")); return; }
      const dp = resolve(ctx.cwd, args[0]);
      if (ctx.fs.exists(dp)) { ctx.print(err(`mkdir: ${args[0]}: File exists`)); return; }
      ctx.fs.mkdir(dp);
    },
  },
  {
    name: "touch",
    category: "system",
    usage: "touch <file>",
    description: { en: "Create empty file", zh: "创建空文件" },
    handler: (args, ctx) => {
      if (!args[0]) { ctx.print(err("touch: missing operand")); return; }
      const tp = resolve(ctx.cwd, args[0]);
      if (!ctx.fs.exists(tp)) ctx.fs.writeFile(tp, "");
    },
  },
  {
    name: "rm",
    category: "system",
    usage: "rm [-r] <path>",
    description: { en: "Remove file or directory", zh: "删除文件或目录" },
    handler: (args, ctx) => {
      const target = args.find(a => !a.startsWith("-"));
      if (!target) { ctx.print(err("rm: missing operand")); return; }
      const hasRecursive = args.some(a => a === "-r" || a === "-rf" || a === "-fr" || a === "-R");
      // Easter egg: rm -rf /  →  we are not insane
      if (hasRecursive && (target === "/" || target === "/*")) {
        ctx.print(err("rm: it is dangerous to operate recursively on '/'"));
        ctx.print(err("rm: use --no-preserve-root to override this failsafe"));
        ctx.println("(also, nope.)", COLORS.dim);
        return;
      }
      // Protect critical portfolio files
      const protectedPath = "/Users/guest/K4RTO";
      const rp = resolve(ctx.cwd, target);
      if (rp === protectedPath || rp.startsWith(protectedPath + "/")) {
        ctx.print(err("rm: " + target + ": Operation not permitted (K4RTO is protected)"));
        return;
      }
      if (!ctx.fs.exists(rp)) { ctx.print(err(`rm: ${target}: No such file or directory`)); return; }
      ctx.fs.remove(rp);
    },
  },
  {
    name: "clear",
    category: "system",
    aliases: ["cls"],
    description: { en: "Clear the screen", zh: "清屏" },
    handler: (_args, ctx) => { ctx.clearScreen(); },
  },
  {
    name: "whoami",
    category: "system",
    description: { en: "Print current user", zh: "显示当前用户" },
    handler: (_args, ctx) => { ctx.println("guest"); },
  },
  {
    name: "date",
    category: "system",
    description: { en: "Print current date and time", zh: "显示日期时间" },
    handler: (_args, ctx) => { ctx.println(new Date().toString()); },
  },
  {
    name: "uname",
    category: "system",
    description: { en: "Print system info", zh: "显示系统信息" },
    handler: (args, ctx) => {
      if (args.includes("-a")) {
        ctx.println("Darwin MacBook-Pro.local 24.0.0 Darwin Kernel Version 24.0.0 K4RTO Portfolio arm64");
      } else {
        ctx.println("Darwin");
      }
    },
  },
  {
    name: "history",
    category: "system",
    description: { en: "Show command history", zh: "显示命令历史" },
    handler: (_args, ctx) => {
      if (ctx.history.length === 0) { ctx.println("(no history yet)", COLORS.dim); return; }
      ctx.history.slice().reverse().forEach((line, i) => {
        const idx = (i + 1).toString().padStart(4, " ");
        ctx.print({ segs: [
          { text: idx + "  ", color: COLORS.dim },
          { text: line },
        ]});
      });
    },
  },
  {
    name: "man",
    category: "system",
    usage: "man <command>",
    description: { en: "Show command manual", zh: "显示命令手册" },
    handler: async (args, ctx) => {
      if (!args[0]) { ctx.print(err("What manual page do you want?")); return; }
      const { findCommand } = await import("./registry");
      const cmd = findCommand(args[0]);
      if (!cmd) { ctx.print(err(`No manual entry for ${args[0]}`)); return; }
      ctx.println("");
      ctx.println(`NAME`, COLORS.warn);
      ctx.println(`    ${cmd.name} — ${cmd.description[ctx.lang]}`);
      ctx.println("");
      ctx.println("USAGE", COLORS.warn);
      ctx.println(`    ${cmd.usage ?? cmd.name}`);
      if (cmd.aliases?.length) {
        ctx.println("");
        ctx.println("ALIASES", COLORS.warn);
        ctx.println(`    ${cmd.aliases.join(", ")}`);
      }
      ctx.println("");
    },
  },
  {
    name: "exit",
    category: "system",
    aliases: ["quit"],
    description: { en: "Close the terminal window", zh: "关闭终端窗口" },
    handler: (_args, ctx) => { ctx.exit(); },
  },
  {
    name: "open",
    category: "system",
    usage: "open <file>",
    description: { en: "Open file or URL with default app", zh: "用默认应用打开文件或 URL" },
    handler: (args, ctx) => {
      if (!args[0]) { ctx.print(err("open: missing operand")); return; }
      const target = args[0];
      // External URL
      if (/^https?:\/\//.test(target)) { ctx.externalOpen(target); ctx.println(`Opening ${target} in browser...`, COLORS.info); return; }
      const fp = resolve(ctx.cwd, target);
      const e = ctx.fs.getEntry(fp);
      if (!e) { ctx.print(err(`open: ${target}: No such file or directory`)); return; }
      const ext = e.name.split(".").pop()?.toLowerCase() ?? "";
      const publicPath = fp.replace("/Users/guest/", "/");
      const meta = { filePath: fp, publicPath, fileName: e.name };
      if (["pdf", "png", "jpg", "jpeg", "webp", "gif"].includes(ext)) ctx.launch("preview", meta);
      else if (["md", "ts", "tsx", "js", "jsx", "json", "txt"].includes(ext)) ctx.launch("vscode", meta);
      else if (["doc", "docx"].includes(ext)) ctx.launch("word", meta);
      else if (ext === "app") {
        const content = ctx.fs.readFile(fp) ?? "";
        const m = /^__app:(.+)$/.exec(content);
        if (m) ctx.launch(m[1]);
      } else { ctx.print(err(`open: no application knows how to open ${target}`)); return; }
      ctx.println(`Opened ${target}`, COLORS.success);
    },
  },
  {
    name: "help",
    category: "system",
    description: { en: "Show available commands", zh: "显示可用命令" },
    handler: async (_args, ctx) => {
      const { commandsByCategory } = await import("./registry");
      const groups = commandsByCategory();
      const headers: Record<string, { en: string; zh: string }> = {
        portfolio:  { en: "PORTFOLIO",  zh: "求职专属" },
        system:     { en: "SYSTEM",     zh: "系统命令" },
        navigation: { en: "NAVIGATION", zh: "导航" },
        egg:        { en: "EASTER",     zh: "彩蛋" },
        other:      { en: "OTHER",      zh: "其他" },
      };
      ctx.println("");
      ctx.println("Available commands (type 'man <cmd>' for details):", COLORS.dim);
      const order: Array<keyof typeof headers> = ["portfolio", "navigation", "system", "egg", "other"];
      for (const cat of order) {
        const list = groups[cat];
        if (!list || list.length === 0) continue;
        ctx.println("");
        ctx.println(headers[cat][ctx.lang], COLORS.warn);
        for (const cmd of list) {
          const name = cmd.name.padEnd(12, " ");
          ctx.print({ segs: [
            { text: "  " },
            { text: name, color: COLORS.success },
            { text: " " + cmd.description[ctx.lang] },
          ]});
        }
      }
      ctx.println("");
    },
  },
];

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
      if (!ctx.openFile(fp)) { ctx.print(err(`open: ${target}: No application can open this path`)); return; }
      ctx.println(`Opened ${target}`, COLORS.success);
    },
  },
  {
    name: "cp",
    category: "system",
    usage: "cp <source> <dest>",
    description: { en: "Copy a file", zh: "复制文件" },
    handler: (args, ctx) => {
      if (args.length < 2) { ctx.print(err("cp: missing file operand")); return; }
      const src = resolve(ctx.cwd, args[0]);
      const dstRaw = resolve(ctx.cwd, args[1]);
      const source = ctx.fs.getEntry(src);
      if (!source) { ctx.print(err(`cp: ${args[0]}: No such file or directory`)); return; }
      if (source.type === "dir") { ctx.print(err(`cp: ${args[0]}: is a directory`)); return; }
      const dstEntry = ctx.fs.getEntry(dstRaw);
      const dst = dstEntry?.type === "dir" ? `${dstRaw}/${source.name}` : dstRaw;
      ctx.fs.writeFile(dst, ctx.fs.readFile(src) ?? "");
    },
  },
  {
    name: "mv",
    category: "system",
    usage: "mv <source> <dest>",
    description: { en: "Move or rename a file", zh: "移动或重命名文件" },
    handler: (args, ctx) => {
      if (args.length < 2) { ctx.print(err("mv: missing file operand")); return; }
      const src = resolve(ctx.cwd, args[0]);
      const dstRaw = resolve(ctx.cwd, args[1]);
      const source = ctx.fs.getEntry(src);
      if (!source) { ctx.print(err(`mv: ${args[0]}: No such file or directory`)); return; }
      if (source.type === "dir") { ctx.print(err(`mv: ${args[0]}: is a directory`)); return; }
      const dstEntry = ctx.fs.getEntry(dstRaw);
      const dst = dstEntry?.type === "dir" ? `${dstRaw}/${source.name}` : dstRaw;
      const content = ctx.fs.readFile(src) ?? "";
      ctx.fs.writeFile(dst, content);
      ctx.fs.remove(src);
    },
  },
  {
    name: "ps",
    category: "system",
    description: { en: "List running frontend processes", zh: "列出正在运行的前端进程" },
    handler: (_args, ctx) => {
      const rows = ctx.listProcesses();
      ctx.println("PID                         APP          STATUS      WINDOW", COLORS.warn);
      if (rows.length === 0) { ctx.println("(no user processes)", COLORS.dim); return; }
      for (const p of rows) {
        ctx.println(`${p.id.padEnd(27)} ${p.appName.padEnd(12)} ${p.status.padEnd(11)} ${p.windowId}`, COLORS.text);
      }
    },
  },
  {
    name: "kill",
    category: "system",
    usage: "kill <pid>",
    description: { en: "Terminate a frontend process", zh: "结束前端进程" },
    handler: (args, ctx) => {
      if (!args[0]) { ctx.print(err("kill: missing pid")); return; }
      if (!ctx.killProcess(args[0])) { ctx.print(err(`kill: ${args[0]}: no such process`)); return; }
      ctx.println(`terminated ${args[0]}`, COLORS.success);
    },
  },
  {
    name: "apps",
    category: "system",
    description: { en: "List installed applications", zh: "列出已安装应用" },
    handler: (_args, ctx) => {
      for (const app of ctx.listApps()) {
        ctx.println(`${app.name.padEnd(16)} ${app.category.padEnd(12)} ${app.bundleId}`, COLORS.text);
      }
    },
  },
  {
    name: "sw_vers",
    category: "system",
    description: { en: "Print frontend OS version", zh: "显示前端系统版本" },
    handler: (_args, ctx) => {
      ctx.println(`ProductName:\t${ctx.systemProfile.productName}`);
      ctx.println(`ProductVersion:\t${ctx.systemProfile.productVersion}`);
      ctx.println(`BuildVersion:\t${ctx.systemProfile.buildVersion}`);
    },
  },
  {
    name: "system_profiler",
    category: "system",
    description: { en: "Show portfolio system profile", zh: "显示作品集系统信息" },
    handler: (_args, ctx) => {
      for (const [key, value] of Object.entries(ctx.systemProfile)) {
        ctx.println(`${key}: ${value}`);
      }
    },
  },
  {
    name: "defaults",
    category: "system",
    usage: "defaults read <key> | defaults write <key> <value>",
    description: { en: "Read or write simulated system defaults", zh: "读写模拟系统设置" },
    handler: (args, ctx) => {
      const [mode, key, value] = args;
      if (mode === "read" && key) {
        const out = ctx.readSetting(key);
        if (out === null) ctx.print(err(`defaults: ${key}: does not exist`));
        else ctx.println(out);
        return;
      }
      if (mode === "write" && key && value) {
        if (!ctx.writeSetting(key, value)) ctx.print(err(`defaults: cannot write ${key}=${value}`));
        return;
      }
      ctx.print(err("usage: defaults read <key> | defaults write <key> <value>"));
    },
  },
  {
    name: "diskutil",
    category: "system",
    usage: "diskutil list",
    description: { en: "List virtual volumes", zh: "列出虚拟卷" },
    handler: (args, ctx) => {
      if (args[0] !== "list") { ctx.print(err("usage: diskutil list")); return; }
      ctx.println("/dev/browser0 (virtual):", COLORS.warn);
      ctx.println("   #: TYPE NAME              SIZE       IDENTIFIER");
      ctx.println("   0: APFS Macintosh HD      dynamic    browser0s1");
      ctx.println("   1: VFS  User Data         local      browser0s2");
    },
  },
  {
    name: "launchctl",
    category: "system",
    usage: "launchctl list",
    description: { en: "List simulated system services", zh: "列出模拟系统服务" },
    handler: (args, ctx) => {
      if (args[0] !== "list") { ctx.print(err("usage: launchctl list")); return; }
      ["app-manager", "spotlight", "file-index", "settings", "power", "windowserver"].forEach((name, i) => {
        ctx.println(`${(100 + i).toString().padEnd(6)} 0\tcom.k4rto.${name}`);
      });
    },
  },
  {
    name: "say",
    category: "system",
    usage: "say <text>",
    description: { en: "Speak text through the browser", zh: "通过浏览器朗读文本" },
    handler: (args, ctx) => {
      const text = args.join(" ");
      if (!text) { ctx.print(err("say: missing text")); return; }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
      }
      ctx.println(text, COLORS.dim);
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

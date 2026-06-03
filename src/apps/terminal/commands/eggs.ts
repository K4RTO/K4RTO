/**
 * Easter eggs — hidden commands. Not shown by `help` but discoverable via `man`
 * or by guessing classic Unix folklore.
 */

import type { Command } from "./types";
import { COLORS } from "./types";

function sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }

export const eggCommands: Command[] = [
  {
    name: "sudo",
    category: "egg",
    hidden: true,
    description: { en: "Become root", zh: "变成 root" },
    handler: (args, ctx) => {
      const joined = args.join(" ");
      if (joined === "make me a sandwich" || joined === "make-me-a-sandwich") {
        ctx.println("ok.", COLORS.success);
        ctx.println("  __________________", COLORS.dim);
        ctx.println(" / 🥬🍅🧀🥩🥖       \\", COLORS.dim);
        ctx.println("/____________________\\", COLORS.dim);
        return;
      }
      if (joined.startsWith("rm")) {
        ctx.println("guest is not in the sudoers file. This incident will be reported.", COLORS.err);
        return;
      }
      ctx.println("sudo: a password is required", COLORS.err);
      ctx.println("(hint: try `sudo make me a sandwich`)", COLORS.dim);
    },
  },
  {
    name: "vim",
    category: "egg",
    hidden: true,
    aliases: ["nano", "emacs"],
    description: { en: "The editor wars", zh: "编辑器圣战" },
    handler: (_args, ctx) => {
      ctx.println("vim is a god, but you can't escape it here either.", COLORS.warn);
      ctx.println("(Try :q. Or just `exit`.)", COLORS.dim);
    },
  },
  {
    name: "cowsay",
    category: "egg",
    hidden: true,
    usage: "cowsay <text>",
    description: { en: "An ASCII cow says hello", zh: "ASCII 小牛说话" },
    handler: (args, ctx) => {
      const msg = args.join(" ") || "moo";
      const top = " " + "_".repeat(msg.length + 2);
      const mid = `< ${msg} >`;
      const bot = " " + "-".repeat(msg.length + 2);
      ctx.println(top);
      ctx.println(mid);
      ctx.println(bot);
      ctx.println("        \\   ^__^");
      ctx.println("         \\  (oo)\\_______");
      ctx.println("            (__)\\       )\\/\\");
      ctx.println("                ||----w |");
      ctx.println("                ||     ||");
    },
  },
  {
    name: "matrix",
    category: "egg",
    hidden: true,
    description: { en: "Wake up, Neo...", zh: "醒醒, Neo..." },
    handler: async (_args, ctx) => {
      const chars = "01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿｸｱﾗ";
      const width = 60;
      for (let i = 0; i < 12; i++) {
        let line = "";
        for (let j = 0; j < width; j++) {
          line += chars[Math.floor((j * 17 + i * 23) % chars.length)];
        }
        ctx.println(line, COLORS.success);
        await sleep(80);
      }
      ctx.println("");
      ctx.println("Knock knock, Neo.", COLORS.warn);
      ctx.println("");
    },
  },
  {
    name: "coffee",
    category: "egg",
    hidden: true,
    aliases: ["espresso"],
    description: { en: "Brew a coffee", zh: "煮杯咖啡" },
    handler: (_args, ctx) => {
      ctx.println("    ( (", COLORS.dim);
      ctx.println("     ) )", COLORS.dim);
      ctx.println("  ........", COLORS.text);
      ctx.println("  |      |]", COLORS.text);
      ctx.println("  \\      /", COLORS.text);
      ctx.println("   `----'", COLORS.text);
      ctx.println("");
      ctx.println("Coffee deployed. Productivity +20%.", COLORS.success);
    },
  },
  {
    name: "konami",
    category: "egg",
    hidden: true,
    description: { en: "Up, Up, Down, Down...", zh: "上, 上, 下, 下..." },
    handler: (_args, ctx) => {
      ctx.println("↑ ↑ ↓ ↓ ← → ← → B A", COLORS.warn);
      ctx.println("");
      ctx.println("30 lives unlocked. Now go ship something.", COLORS.success);
    },
  },
];

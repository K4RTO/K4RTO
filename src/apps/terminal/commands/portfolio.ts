/**
 * Portfolio-specific Terminal commands.
 *
 * Trimmed to a single command: `resume` opens the PDF in Preview.
 *
 * Earlier versions of this file exposed BIO / EDUCATION / SKILLS /
 * REAL_PROJECTS / WHY_HIRE arrays plus a half-dozen "about me" commands
 * (`whoami`, `edu`, `projects`, `contact`, `skills`, `why`, etc). Those
 * were removed on request: in this project, the *only* public surface
 * carrying personal information is the downloadable Resume PDF and the
 * GitHub profile README. Everything else stays anonymous.
 */

import type { Command } from "./types";
import { COLORS } from "./types";

export const portfolioCommands: Command[] = [
  {
    name: "resume",
    category: "portfolio",
    aliases: ["cv"],
    description: { en: "Open my resume in Preview", zh: "在 Preview 中打开简历" },
    handler: (_args, ctx) => {
      const publicPath = ctx.lang === "zh" ? "/K4RTO/Resume-CN.pdf" : "/K4RTO/Resume-EN.pdf";
      ctx.println(ctx.lang === "zh" ? "正在 Preview 中打开简历..." : "Opening resume in Preview...", COLORS.info);
      ctx.launch("preview", {
        publicPath,
        filePath: "/Users/guest/K4RTO/Resume.pdf",
        fileName: "Resume.pdf",
      });
    },
  },
];

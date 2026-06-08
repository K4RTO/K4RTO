/**
 * Portfolio-specific commands — the differentiator that makes recruiters
 * remember the Terminal. All command output is bilingual via ctx.lang.
 *
 * Content sourced from K4RTO's resume (public/K4RTO/Resume.pdf).
 */

import type { Command } from "./types";
import { COLORS } from "./types";

// ── Static content (from Resume) ──────────────────────────────────────────

// Personal identifiers (real name, phone, wechat) deliberately omitted from
// the public portfolio — visitors are introduced as "K4RTO" only, with email
// as the only direct contact channel. The downloadable resume PDF has the
// full details for anyone who clicks through and is genuinely interested.
const BIO = {
  name: "K4RTO",
  title: {
    en: "ML / AI Agent Researcher · C++ Game Engine",
    zh: "机器学习 / AI Agent 研究员 · C++ 游戏引擎",
  },
  location: { en: "Shanghai · ANU Master of Computing", zh: "上海 · 澳国立 (ANU) 计算机硕士" },
  email: "k4rtol@163.com",
  website: "https://k4rto.com/",
  github: "https://github.com/K4RTO",
  linkedin: "https://www.linkedin.com/in/K4RTO/",
  tagline: {
    en: "Researcher building enterprise AI agents and customs OCR systems; also writes Vulkan / C++ graphics for game engines.",
    zh: "在做企业级 AI Agent 平台和报关单 OCR 系统；业余写 Vulkan / C++ 游戏引擎渲染。",
  },
};

const EDUCATION = [
  {
    school: { en: "Australian National University (ANU)", zh: "澳大利亚国立大学 (ANU)" },
    degree: { en: "Master of Computing · QS #34", zh: "计算机硕士 · QS 第 34" },
    detail: { en: "Computer Vision, Graphics, Game Dev, ML, Advanced Algorithms, SQL", zh: "计算机视觉、图形学、游戏开发、机器学习、高级算法、SQL 数据库" },
  },
  {
    school: { en: "Donghua University (Project 211)", zh: "东华大学 (211)" },
    degree: { en: "B.S. Functional Materials", zh: "本科 · 功能材料" },
    detail: { en: "", zh: "" },
  },
];

const SKILLS: Array<{ category: { en: string; zh: string }; items: string[] }> = [
  { category: { en: "Languages",       zh: "语言" },       items: ["Python", "C++", "TypeScript", "JavaScript"] },
  { category: { en: "ML / AI Agents",  zh: "机器学习 / AI Agent" }, items: ["vLLM", "Vision-LLM (qwen-vl)", "RAG", "Fine-tuning", "MLflow", "DAG orchestration"] },
  { category: { en: "Computer Vision", zh: "计算机视觉" }, items: ["YOLOv7", "Keypoint detection", "Pose analysis", "OCR pipelines", "Real-time inference"] },
  { category: { en: "Graphics / GPU",  zh: "图形 / GPU" }, items: ["Vulkan", "GLSL", "Piccolo engine", "LUT color grading", "Bezier curves", "Frustum culling"] },
  { category: { en: "Backend / Infra", zh: "后端 / 基础设施" }, items: ["FastAPI", "PostgreSQL", "SQLAlchemy 2.0", "Redis", "Docker", "Alembic"] },
  { category: { en: "Web",             zh: "Web" },         items: ["SvelteKit 5", "Next.js 15", "React 19", "Tailwind 4"] },
];

// Two anchor case studies — what I'm actually doing now (Hichains / Lenovo)
// and what proves the graphics side (ANU capstone). Anything older was
// trimmed per K4RTO's request — focus over breadth.
const WHY_HIRE = [
  {
    en: "I'm building enterprise AI agents and a Vision-LLM customs OCR system in production.",
    zh: "我正在做企业级多智能体平台和落地中的报关单 OCR 系统。",
    detail: {
      en: "At Hichains (2025.04 – present): two flagship systems. AURA, an enterprise multi-agent collaboration platform with a visual DAG blueprint engine, on-prem RAG, and built-in fine-tuning pipelines — data never leaves the customer's perimeter. Smart OCR Hub, a Vision-LLM customs declaration pipeline serving Lenovo, with multi-GPU scheduling, MLOps audit trails, and human-review loops.",
      zh: "海晨股份（2025.04 至今）：两个旗舰系统。AURA — 企业级多智能体协作平台，可视化 DAG 蓝图引擎 + 私有 RAG + 内置微调流水线，数据不出企业边界。智能识别中枢 — 服务联想集团的 Vision-LLM 报关单 OCR 流水线，多 GPU 调度 + 全链路 MLOps + 人工复核闭环。",
    },
  },
  {
    en: "I built a real-time fall-detection CV system that ANU showcased.",
    zh: "我做了 ANU 拿出去展示的实时跌倒检测系统。",
    detail: {
      en: "ANU Techlauncher capstone (2024.02 – 2024.11): custom YOLOv7 for keypoint detection + pose analysis in Python. Real-time inference for elderly fall alerts. Partnership with a Western Australia firm. Featured at the ANU Techlauncher showcase. PM-ed the team via Jira.",
      zh: "澳国立 Techlauncher 在校项目（2024.02 – 2024.11）：定制 YOLOv7 做人体关键点 + 跌倒姿态分析，Python 实时推理。与西澳公司合作的老年人跌倒预警系统。受邀 ANU Techlauncher 活动展示。用 Jira 管理团队任务。",
    },
  },
];

// Real projects — kept aligned with the slimmed-down resume.
const REAL_PROJECTS = [
  {
    name: "Smart OCR Hub",
    tag: "ML · Vision-LLM · vLLM · FastAPI",
    desc: { en: "Lenovo customs-declaration OCR. Dual-path: Vision-LLM primary + on-prem CV fallback. Multi-GPU scheduling, end-to-end MLOps loop.", zh: "联想集团报关单 OCR。双路径：视觉语言模型主路径 + 本地 CV 兜底。多 GPU 调度，全链路 MLOps。" },
  },
  {
    name: "AURA Multi-Agent Platform",
    tag: "AI Agent · DAG · RAG · CRDT",
    desc: { en: "Enterprise multi-agent collaboration. Visual DAG blueprint engine, on-prem RAG, fine-tuning pipeline, WebSocket+CRDT real-time co-edit.", zh: "企业级多智能体协作平台。可视化 DAG 蓝图引擎 + 本地 RAG + 微调流水线 + WebSocket+CRDT 协同编辑。" },
  },
  {
    name: "CAM_FALL",
    tag: "Computer Vision · Python · YOLOv7",
    desc: { en: "Real-time fall detection + audio alert. Partnership w/ WA firm. ANU Techlauncher showcase.", zh: "实时跌倒检测 + 声音预警。与西澳公司合作。澳国立 Techlauncher 展示。" },
  },
  {
    name: "K4RTO Portfolio",
    tag: "Web · Next.js 15 · React 19 · TS · Tailwind 4",
    desc: { en: "This site — a macOS-style portfolio (the page you're looking at right now).", zh: "你现在看的这个页面 — 仿 macOS 桌面的 portfolio。" },
  },
];

// ── ASCII banner ──────────────────────────────────────────────────────────

const ASCII_BANNER = [
  " _  ___  _   ___  _____ ___  ",
  "| |/ / || | / _ \\(_   _/ _ \\ ",
  "| ' /| || |_| (_) | | || (_) |",
  "|_|\\_\\|_|\\__/\\___/  |_| \\___/ ",
];

// ── Helpers ────────────────────────────────────────────────────────────────

function printTable(ctx: import("./types").CommandContext, rows: Array<[string, string]>, colWidth = 14): void {
  for (const [k, v] of rows) {
    ctx.print({ segs: [
      { text: "  " + k.padEnd(colWidth, " "), color: COLORS.dim },
      { text: v },
    ]});
  }
}

// ── Commands ──────────────────────────────────────────────────────────────

export const portfolioCommands: Command[] = [
  {
    name: "whoami",
    category: "portfolio",
    description: { en: "About K4RTO", zh: "介绍 K4RTO" },
    aliases: ["about"],
    handler: (_args, ctx) => {
      ctx.println("");
      ASCII_BANNER.forEach(l => ctx.println(l, COLORS.success));
      ctx.println("");
      ctx.println(`${BIO.name} — ${BIO.title[ctx.lang]}`, COLORS.warn);
      ctx.println(BIO.tagline[ctx.lang]);
      ctx.println("");
      printTable(ctx, [
        [ctx.lang === "zh" ? "邮箱" : "Email",     BIO.email],
        [ctx.lang === "zh" ? "位置" : "Location",  BIO.location[ctx.lang]],
        ["GitHub",                                 BIO.github],
        ["LinkedIn",                               BIO.linkedin],
        ["Website",                                BIO.website],
      ]);
      ctx.println("");
      ctx.println(ctx.lang === "zh"
        ? "→ 输入 'edu' 看学历、'skills' 看技术栈、'projects' 看作品、'resume' 打开简历、'why' 看雇我的理由"
        : "→ Try 'edu', 'skills', 'projects', 'resume', 'why', or 'contact'.", COLORS.dim);
      ctx.println("");
    },
  },
  {
    name: "edu",
    category: "portfolio",
    aliases: ["education"],
    description: { en: "Education background", zh: "教育背景" },
    handler: (_args, ctx) => {
      ctx.println("");
      ctx.println(ctx.lang === "zh" ? "教育背景：" : "Education:", COLORS.warn);
      ctx.println("");
      for (const e of EDUCATION) {
        ctx.print({ segs: [
          { text: "  • ", color: COLORS.dim },
          { text: e.school[ctx.lang], color: COLORS.success },
        ]});
        ctx.println("    " + e.degree[ctx.lang], COLORS.text);
        if (e.detail[ctx.lang]) ctx.println("    " + e.detail[ctx.lang], COLORS.dim);
        ctx.println("");
      }
    },
  },
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
  {
    name: "projects",
    category: "portfolio",
    aliases: ["proj"],
    description: { en: "List portfolio projects", zh: "列出作品集项目" },
    handler: (_args, ctx) => {
      ctx.println("");
      ctx.println(`${REAL_PROJECTS.length} ${ctx.lang === "zh" ? "个项目：" : "projects:"}`, COLORS.warn);
      ctx.println("");
      for (const p of REAL_PROJECTS) {
        ctx.print({ segs: [
          { text: "  • ", color: COLORS.dim },
          { text: p.name.padEnd(28, " "), color: COLORS.success },
          { text: p.tag, color: COLORS.dim },
        ]});
        ctx.println("      " + p.desc[ctx.lang]);
        ctx.println("");
      }
      ctx.println(ctx.lang === "zh"
        ? "→ 输入 'github' 看完整代码，'resume' 看完整简历"
        : "→ Type 'github' for full source, 'resume' for the full CV.", COLORS.dim);
      ctx.println("");
    },
  },
  {
    name: "contact",
    category: "portfolio",
    description: { en: "How to reach me", zh: "联系方式" },
    handler: (_args, ctx) => {
      ctx.println("");
      ctx.println(ctx.lang === "zh" ? "联系方式：" : "Contact:", COLORS.warn);
      ctx.println("");
      printTable(ctx, [
        ["Email",     BIO.email],
        ["GitHub",    BIO.github],
        ["LinkedIn",  BIO.linkedin],
        ["Website",   BIO.website],
      ]);
      ctx.println("");
      ctx.println(ctx.lang === "zh"
        ? "→ 输入 'github' / 'linkedin' / 'mail' 直接打开"
        : "→ Use 'github', 'linkedin', or 'mail' to open directly.", COLORS.dim);
      ctx.println("");
    },
  },
  {
    name: "github",
    category: "portfolio",
    description: { en: "Open my GitHub", zh: "打开我的 GitHub" },
    handler: (_args, ctx) => { ctx.println(`→ ${BIO.github}`, COLORS.link); ctx.externalOpen(BIO.github); },
  },
  {
    name: "linkedin",
    category: "portfolio",
    description: { en: "Open my LinkedIn", zh: "打开我的 LinkedIn" },
    handler: (_args, ctx) => { ctx.println(`→ ${BIO.linkedin}`, COLORS.link); ctx.externalOpen(BIO.linkedin); },
  },
  {
    name: "site",
    category: "portfolio",
    aliases: ["website"],
    description: { en: "Open my personal site", zh: "打开个人网站" },
    handler: (_args, ctx) => { ctx.println(`→ ${BIO.website}`, COLORS.link); ctx.externalOpen(BIO.website); },
  },
  {
    name: "mail",
    category: "portfolio",
    aliases: ["email"],
    description: { en: "Compose an email to me", zh: "给我发邮件" },
    handler: (_args, ctx) => {
      const url = `mailto:${BIO.email}?subject=${encodeURIComponent("Hi from your portfolio")}`;
      ctx.println(`→ ${BIO.email}`, COLORS.link);
      ctx.externalOpen(url);
    },
  },
  {
    name: "skills",
    category: "portfolio",
    aliases: ["stack"],
    description: { en: "Show my tech stack", zh: "显示技术栈" },
    handler: (_args, ctx) => {
      ctx.println("");
      ctx.println(ctx.lang === "zh" ? "技术栈：" : "Tech Stack:", COLORS.warn);
      ctx.println("");
      for (const group of SKILLS) {
        ctx.print({ segs: [
          { text: "  " + group.category[ctx.lang].padEnd(18, " "), color: COLORS.success },
          { text: group.items.join(", "), color: COLORS.text },
        ]});
      }
      ctx.println("");
    },
  },
  {
    name: "why",
    category: "portfolio",
    aliases: ["hire-me", "hire", "whyhire"],
    description: { en: "Why hire me", zh: "为什么雇我" },
    handler: (_args, ctx) => {
      ctx.println("");
      ctx.println(ctx.lang === "zh" ? "为什么雇我：" : "Why hire me:", COLORS.warn);
      ctx.println("");
      for (let i = 0; i < WHY_HIRE.length; i++) {
        const item = WHY_HIRE[i];
        ctx.print({ segs: [
          { text: "  " + (i + 1) + ". ", color: COLORS.dim },
          { text: item[ctx.lang], color: COLORS.success },
        ]});
        item.detail[ctx.lang].split("\n").forEach(line => {
          ctx.println("     " + line, COLORS.dim);
        });
        ctx.println("");
      }
      ctx.println(ctx.lang === "zh" ? "→ 想了解某条细节，回邮件 " + BIO.email : "→ Want the full story? Email " + BIO.email, COLORS.dim);
      ctx.println("");
    },
  },
];

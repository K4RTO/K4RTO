/**
 * Portfolio-specific commands — the differentiator that makes recruiters
 * remember the Terminal. All command output is bilingual via ctx.lang.
 *
 * Content sourced from K4RTO's resume (public/K4RTO/Resume.pdf).
 */

import type { Command } from "./types";
import { COLORS } from "./types";

// ── Static content (from Resume) ──────────────────────────────────────────

const BIO = {
  name: "K4RTO",
  realName: "严晗 / Yan Han",
  title: {
    en: "Graphics / Game Engine Engineer · Computer Vision · Product",
    zh: "图形 / 游戏引擎工程师 · 计算机视觉 · 产品经理",
  },
  location: { en: "Shanghai · ANU Master of Computing", zh: "上海 · 澳国立 (ANU) 计算机硕士" },
  email: "k4rtol@163.com",
  phone: "+86 180-1923-9175",
  wechat: "K4RTOL",
  website: "https://k4rto.com/",
  github: "https://github.com/K4RTO",
  linkedin: "https://www.linkedin.com/in/K4RTO/",
  tagline: {
    en: "Game-engine + CV engineer who shipped a metaverse event to 20K+ users.",
    zh: "游戏引擎 + 计算机视觉工程师，做过国内首个元宇宙大型活动。",
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
  { category: { en: "Languages",       zh: "语言" },       items: ["C++", "Python", "Java", "JavaScript", "TypeScript"] },
  { category: { en: "Graphics / GPU",  zh: "图形 / GPU" },  items: ["Vulkan", "GLSL", "LUT color grading", "Bezier curves", "Frustum culling"] },
  { category: { en: "Game Engines",    zh: "游戏引擎" },    items: ["Piccolo (reflection)", "Cocos Creator", "Unity (basics)"] },
  { category: { en: "Computer Vision", zh: "计算机视觉" }, items: ["YOLOv7", "Keypoint detection", "Pose analysis", "Real-time inference"] },
  { category: { en: "Mobile / Web",    zh: "移动 / Web" },  items: ["Android", "Firebase Firestore", "Next.js 15", "React 19", "Tailwind 4"] },
  { category: { en: "Product / PM",    zh: "产品 / 运营" }, items: ["Jira", "Retention analytics", "AR design", "Prototype docs", "PRD writing"] },
];

// Real case studies from resume — pick the most quantified ones
const WHY_HIRE = [
  {
    en: "I shipped the first major metaverse event in China.",
    zh: "我做过国内第一个元宇宙大型活动。",
    detail: {
      en: "Lingjing Oasis × Baidu Xirang × Fengyuzhu — \"Metaverse Spring Festival\" event. Led product design, prototype, and dev schedule. 20K+ pre-registered users in 2 days; 3-day event ran with a ¥1M prize pool. Featured as Baidu Xirang's official showcase case.",
      zh: "灵境绿洲 × 百度希壤 × 风雨筑 —《元宇宙过大年》。负责产品原型设计、PRD 撰写、研发进度管理。预热 2 天预约 2W+，三天活动累计奖池 100W。成为百度希壤元宇宙官方优秀案例。",
    },
  },
  {
    en: "I moved a game's 30-day retention from 15% → 27% (+80%).",
    zh: "我把一款游戏的 30 日留存从 15% 拉到 27%（+80%）。",
    detail: {
      en: "《Save the Town》 — WeChat mini-game data ops at Lingdong Interactive. Iterated user flow + onboarding + loop design over 3 months. 3M total users via WeChat optimization, ¥500K cumulative revenue.",
      zh: "《救世小镇》— 灵动互娱微信小游戏数据运营。3 个月迭代新手引导 + 主循环 + 留存钩子。通过微信优选累计 300W 用户，三月合计营收 50W。",
    },
  },
  {
    en: "I built a real-time fall-detection CV system that ANU showcased.",
    zh: "我做了 ANU 拿出去展示的实时跌倒检测系统。",
    detail: {
      en: "Custom YOLOv7 for keypoint detection + pose analysis in Python. Real-time inference for elderly fall alerts. Partnership with a Western Australia firm. Featured at ANU Techlauncher showcase. PM-ed the team via Jira.",
      zh: "定制 YOLOv7 做人体关键点 + 跌倒姿态分析，Python 实现实时推理。与西澳公司合作的老年人跌倒预警系统。受邀澳国立 Techlauncher 活动展示。用 Jira 管理团队任务。",
    },
  },
];

// Real projects from resume — for `projects` command
const REAL_PROJECTS = [
  {
    name: "CAM_FALL",
    tag: "Computer Vision · Python · YOLOv7",
    desc: { en: "Real-time fall detection + audio alert. Partnership w/ WA firm. ANU Techlauncher showcase.", zh: "实时跌倒检测 + 声音预警。与西澳公司合作。澳国立 Techlauncher 展示。" },
  },
  {
    name: "Game Engine Extensions",
    tag: "Graphics · C++ · Piccolo Engine",
    desc: { en: "Color-grading LUT in fragment shader; air-control jump + wall collision; reflection-driven editor properties.", zh: "Fragment shader 里 LUT 色彩调整；跳跃空中控制 + 墙壁碰撞；基于反射系统的属性编辑器。" },
  },
  {
    name: "Vulkan Grass Renderer",
    tag: "Graphics · C++ · Vulkan",
    desc: { en: "Bezier-curve grass blades with physics restoration; helicopter / natural / strong wind sim; distance + frustum culling.", zh: "贝塞尔曲线草叶 + 受力恢复物理；直升机风 / 自然风 / 强风模拟；距离剔除 + 视锥剔除优化。" },
  },
  {
    name: "GoodGame",
    tag: "Android · Java · Firebase",
    desc: { en: "Social app with Firestore-backed real-time sync, multi-field search, custom card UI.", zh: "社交媒体 app。Firestore 实时数据同步 + 多字段搜索 + 自定义卡片 UI 组件。" },
  },
  {
    name: "Metaverse Spring Festival",
    tag: "Product · AR · Metaverse",
    desc: { en: "Lingjing Oasis × Baidu Xirang × Fengyuzhu. 20K+ pre-reg in 2 days. ¥1M prize. Baidu official showcase.", zh: "灵境绿洲 × 百度希壤 × 风雨筑。预热 2 天预约 2W+，三天奖池 100W。百度希壤官方优秀案例。" },
  },
  {
    name: "Aliyun Yunqi AR",
    tag: "Product · AR · Mini-game",
    desc: { en: "Aliyun Yunqi Conference AR navigation + Yunxiaobao match-3 mini-game. Product design + docs.", zh: "阿里云栖大会 AR 导航 + 云小宝消消乐小游戏。产品设计 + PRD。" },
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
    description: { en: "About K4RTO (Yan Han)", zh: "介绍 K4RTO（严晗）" },
    aliases: ["about"],
    handler: (_args, ctx) => {
      ctx.println("");
      ASCII_BANNER.forEach(l => ctx.println(l, COLORS.success));
      ctx.println("");
      ctx.println(`${BIO.realName} — ${BIO.title[ctx.lang]}`, COLORS.warn);
      ctx.println(BIO.tagline[ctx.lang]);
      ctx.println("");
      printTable(ctx, [
        [ctx.lang === "zh" ? "邮箱" : "Email",     BIO.email],
        [ctx.lang === "zh" ? "微信" : "WeChat",    BIO.wechat],
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
        [ctx.lang === "zh" ? "手机" : "Phone", BIO.phone],
        ["WeChat",    BIO.wechat],
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

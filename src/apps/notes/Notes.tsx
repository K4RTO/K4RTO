"use client";

import { useState, useEffect, useCallback } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useFileSystemOptional } from "@/contexts/FileSystemContext";
import { useT, useSystem } from "@/contexts/SystemContext";
import { useAppMenuListener } from "@/lib/menubar/appMenu";

// ── Types ──────────────────────────────────────────────────────────────────
// title/content can be either a plain string (user-created notes) or a
// bilingual record (preset portfolio notes). `readLang()` resolves to the
// active language at render time.

type LangText = string | { en: string; zh: string };

interface Note {
  id: string;
  title: LangText;
  content: LangText;
  modifiedAt: number;
  /** True for preset portfolio notes — locked editable fields update the current lang only. */
  pinned?: boolean;
}

function readLang(text: LangText, lang: "en" | "zh"): string {
  if (typeof text === "string") return text;
  return text[lang] ?? text.en ?? "";
}

function writeLang(prev: LangText, lang: "en" | "zh", value: string): LangText {
  if (typeof prev === "string") return value;            // single-lang note: replace
  return { ...prev, [lang]: value };                     // bilingual: update only this lang
}

// ── Portfolio sample notes — sourced from K4RTO's Resume ──────────────────

const NOW = Date.now();
const DAY = 86400000;

const SAMPLES: Note[] = [
  {
    id: "about-me",
    pinned: true,
    modifiedAt: NOW - 60_000,
    title: { en: "About Me", zh: "关于我" },
    content: {
      en: `K4RTO

Graphics / game-engine engineer with a Master of Computing from the Australian National University (QS #34) and a Bachelor's in Functional Materials from Donghua University (Project 211).

What I actually do:
• Build real-time computer vision systems (custom YOLOv7 keypoint detection)
• Write game-engine code in C++ (Vulkan grass renderer, Piccolo engine extensions)
• Ship metaverse / AR products at scale (Baidu Xirang × Lingjing Oasis Spring Festival event — 20K+ pre-registered, Baidu official showcase)
• Operate WeChat mini-game data (Save the Town: 3M users, retention 15% → 27%)

What I value:
A mix of low-level engineering rigor and product instinct. I like problems where shaders meet user retention.

How to reach me:
Email   k4rtol@163.com
WeChat  K4RTOL
GitHub  https://github.com/K4RTO
LinkedIn https://www.linkedin.com/in/K4RTO/

Try Terminal → 'whoami' for a faster version.`,
      zh: `K4RTO

澳大利亚国立大学计算机硕士（QS 第 34），东华大学 211 本科功能材料。

我做什么：
• 实时计算机视觉系统（定制 YOLOv7 人体关键点检测）
• C++ 游戏引擎开发（Vulkan 草地物理渲染、Piccolo 引擎反射系统扩展）
• 元宇宙 / AR 产品（百度希壤 × 灵境绿洲《元宇宙过大年》，2W+ 预约，百度官方优秀案例）
• 微信小游戏数据运营（《救世小镇》300W 用户，留存 15% → 27%）

我看重什么：
低层工程能力 + 产品直觉的结合。我喜欢"shader 碰到留存率"这种问题。

联系方式：
邮箱     k4rtol@163.com
微信     K4RTOL
GitHub   https://github.com/K4RTO
LinkedIn https://www.linkedin.com/in/K4RTO/

打开 Terminal 输入 'whoami' 看更快的版本。`,
    },
  },

  {
    id: "tech-stack",
    pinned: true,
    modifiedAt: NOW - 2 * 60_000,
    title: { en: "Tech Stack", zh: "技术栈" },
    content: {
      en: `My toolbelt, grouped by use:

LANGUAGES (daily)
  C++ · Python · TypeScript · Java · JavaScript

GRAPHICS / GPU
  Vulkan · GLSL shaders · LUT color grading
  Bezier-curve geometry · Frustum / distance culling

GAME ENGINES
  Piccolo (reflection-driven editor)
  Cocos Creator (WeChat mini-games)
  Unity (basics)

COMPUTER VISION
  YOLOv7 (custom training)
  Keypoint detection · Pose analysis
  Real-time inference pipelines

MOBILE / WEB
  Android · Firebase Firestore
  Next.js 15 · React 19 · Tailwind 4

PRODUCT / OPS
  Jira · Retention analytics
  AR design · Prototype / PRD writing
  Metaverse event production

Honesty note:
"Daily" means I've shipped production code in it. Less-frequent stacks (Rust / Go / Unreal / WebGPU) are open to learn for the right role.`,
      zh: `按用途分组的工具箱：

语言（日用）
  C++ · Python · TypeScript · Java · JavaScript

图形 / GPU
  Vulkan · GLSL 着色器 · LUT 色彩调整
  贝塞尔曲线几何 · 视锥剔除 / 距离剔除

游戏引擎
  Piccolo（反射驱动编辑器）
  Cocos Creator（微信小游戏）
  Unity（基础）

计算机视觉
  YOLOv7（定制训练）
  人体关键点检测 · 姿态分析
  实时推理 pipeline

移动 / Web
  Android · Firebase Firestore
  Next.js 15 · React 19 · Tailwind 4

产品 / 运营
  Jira · 留存数据分析
  AR 设计 · 产品原型 / PRD 撰写
  元宇宙活动策划

诚实说明：
"日用"是指我上过生产代码。其他栈（Rust / Go / Unreal / WebGPU）对的岗位都愿意现学。`,
    },
  },

  {
    id: "working-style",
    pinned: true,
    modifiedAt: NOW - 3 * 60_000,
    title: { en: "Working Style", zh: "工作风格" },
    content: {
      en: `Collaboration
  • Async by default — written specs over impromptu calls
  • Sync for ambiguity / debugging / kickoffs
  • Comfort zone is small focused teams (3–6 people)

Code reviews
  • I give them seriously. Expect line-level comments.
  • Same for receiving — I want the reviewer to catch what I missed,
    not nod through.

Ownership
  • From spec writing → shipping → on-call.
  • I dislike "thrown over the wall" handoffs.

Learning
  • I read source code more than tutorials.
  • Best learning happens during real shipping pressure.

What I don't do well
  • Meetings without an agenda.
  • Sprawling MVPs that never ship.

When I'm at my best
  • A specific problem, clear constraints, freedom on implementation.`,
      zh: `协作
  • 默认 async — 文档化的 spec 优于临时拉会
  • 模糊 / 调试 / 启动期改用 sync
  • 最舒适的是 3-6 人小而专注的团队

代码审查
  • 给的认真，会有行级评论
  • 收的也是 — 想让 reviewer 抓到我漏的，而不是过水流程

负责制
  • 从写 spec → 上线 → on-call 全包
  • 不喜欢"扔过墙"式交接

学习
  • 读源码比读教程多
  • 真正学到东西的时候都是上线压力下

我做不好的
  • 没 agenda 的会议
  • 一直 MVP 不上线的项目

我状态最好的时候
  • 具体的问题 + 明确的约束 + 实现自由`,
    },
  },

  {
    id: "why-hire-me",
    pinned: true,
    modifiedAt: NOW - 4 * 60_000,
    title: { en: "Why Hire Me", zh: "为什么雇我" },
    content: {
      en: `Three concrete reasons:

1. I shipped the first major metaverse event in China.
   Lingjing Oasis × Baidu Xirang × Fengyuzhu — "Metaverse Spring Festival".
   Led product design, prototype, and dev schedule.
   20K+ pre-registered users in 2 days.
   3-day event with a ¥1M prize pool.
   Featured as Baidu Xirang's official showcase case.

2. I moved a game's 30-day retention from 15% → 27% (+80%).
   《Save the Town》 at Lingdong Interactive.
   Iterated user flow + onboarding + retention hooks over 3 months.
   3M total users via WeChat optimization channel.
   ¥500K cumulative revenue.

3. I built a real-time fall-detection CV system that ANU showcased.
   Custom YOLOv7 for keypoint + pose analysis in Python.
   Partnership with a Western Australia firm.
   Featured at the ANU Techlauncher event.
   PM-ed the team via Jira while writing the model code.

Pattern across these:
  Multi-disciplinary — graphics, ML, product, ops.
  Quantified outcomes — not "I worked on X".
  Stuff people actually saw — Baidu showcase, ANU showcase, 3M users.

Want the full story? Email k4rtol@163.com.`,
      zh: `三条具体理由：

1. 我做过国内第一个元宇宙大型活动。
   灵境绿洲 × 百度希壤 × 风雨筑《元宇宙过大年》。
   负责产品原型设计、PRD 撰写、研发进度管理。
   预热 2 天预约 2W+ 用户。
   三天活动，奖池累计 100W。
   成为百度希壤元宇宙官方优秀案例。

2. 我把一款游戏 30 日留存从 15% 拉到 27%（+80%）。
   灵动互娱《救世小镇》。
   3 个月迭代新手引导 + 主循环 + 留存钩子。
   通过微信优选累计 300W 用户。
   三月营收 50W。

3. 我做了 ANU 拿出去展示的实时跌倒检测系统。
   Python 定制 YOLOv7 做人体关键点 + 姿态分析。
   与西澳公司合作。
   受邀澳国立 Techlauncher 活动展示。
   一边写模型，一边用 Jira 管团队。

这三件事的共同点：
  跨学科 — 图形、ML、产品、运营。
  可量化的结果 — 不是"参与过 X"。
  外人看得见 — 百度展示、ANU 展示、300W 用户。

想了解细节？发邮件 k4rtol@163.com。`,
    },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(ts: number, lang: "en" | "zh"): string {
  const diff = Date.now() - ts;
  if (diff < DAY) return lang === "zh" ? "今天" : "Today";
  if (diff < 2 * DAY) return lang === "zh" ? "昨天" : "Yesterday";
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  return new Date(ts).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

const VFS_BASE = "/Users/guest/Documents/Notes";

// ── Component ──────────────────────────────────────────────────────────────

export default function Notes(_props: AppComponentProps) {
  const fs = useFileSystemOptional();
  const t = useT();
  const { lang } = useSystem();
  const [notes, setNotes] = useState<Note[]>(SAMPLES);
  const [selId, setSelId] = useState<string | null>("about-me");

  useEffect(() => {
    if (!fs) return;
    if (!fs.exists(VFS_BASE)) {
      fs.mkdir(VFS_BASE);
      SAMPLES.forEach(n => fs.writeFile(`${VFS_BASE}/${n.id}.json`, JSON.stringify(n)));
      return;
    }
    // Remove legacy v1 samples (welcome / shopping / meeting) for returning visitors.
    const LEGACY_SAMPLE_IDS = new Set(["welcome", "shopping", "meeting"]);
    for (const lid of LEGACY_SAMPLE_IDS) {
      const path = `${VFS_BASE}/${lid}.json`;
      if (fs.exists(path)) fs.remove(path);
    }
    // Filter legacy ids in-memory too — React state updates are async, so readDir()
    // may still see the just-removed entries within this same effect tick.
    const entries = fs.readDir(VFS_BASE).filter(e =>
      e.name.endsWith(".json") && !LEGACY_SAMPLE_IDS.has(e.name.replace(/\.json$/, ""))
    );
    // Always reseed the bilingual pinned samples in case the user's vfs predates them.
    // We only re-write the sample ids; user-created notes are preserved.
    const sampleIds = new Set(SAMPLES.map(n => n.id));
    const existingIds = new Set(entries.map(e => e.name.replace(/\.json$/, "")));
    for (const sample of SAMPLES) {
      if (!existingIds.has(sample.id)) {
        fs.writeFile(`${VFS_BASE}/${sample.id}.json`, JSON.stringify(sample));
      }
    }
    const loaded: Note[] = [];
    entries.forEach(e => { try { const r = fs.readFile(e.path); if (r) loaded.push(JSON.parse(r) as Note); } catch {} });
    // Merge: replace stale sample notes with the latest hard-coded version
    const merged = loaded.map(n => sampleIds.has(n.id) ? (SAMPLES.find(s => s.id === n.id) ?? n) : n);
    // Add samples that weren't on disk
    for (const sample of SAMPLES) if (!merged.find(n => n.id === sample.id)) merged.push(sample);
    if (merged.length > 0) { merged.sort((a, b) => b.modifiedAt - a.modifiedAt); setNotes(merged); setSelId(merged[0].id); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((n: Note) => {
    if (!fs) return;
    if (!fs.exists(VFS_BASE)) fs.mkdir(VFS_BASE);
    fs.writeFile(`${VFS_BASE}/${n.id}.json`, JSON.stringify(n));
  }, [fs]);

  const updateNote = useCallback((field: "title" | "content", val: string) => {
    if (!selId) return;
    setNotes(prev => prev.map(n => {
      if (n.id !== selId) return n;
      const upd: Note = { ...n, [field]: writeLang(n[field], lang, val), modifiedAt: Date.now() };
      persist(upd);
      return upd;
    }).sort((a, b) => b.modifiedAt - a.modifiedAt));
  }, [selId, persist, lang]);

  const createNote = useCallback(() => {
    const n: Note = { id: `note-${Date.now()}`, title: t("notes.newNote"), content: "", modifiedAt: Date.now() };
    setNotes(prev => [n, ...prev]);
    setSelId(n.id);
    persist(n);
  }, [persist, t]);

  const deleteCurrentNote = useCallback(() => {
    // Snapshot selId at call time so the fs.remove path and the setNotes
    // callback both operate on the same id, even if selId changes mid-update.
    const id = selId;
    if (!id) return;
    // Pinned portfolio samples can't be deleted — surface a brief alert so the
    // user understands why the menu action looked like it did nothing.
    const note = notes.find(n => n.id === id);
    if (note?.pinned) {
      if (typeof window !== "undefined") {
        window.alert(
          lang === "zh"
            ? "Portfolio 笔记受保护，无法删除。你可以创建新笔记后再删除自己的。"
            : "Portfolio notes are protected and can't be deleted. Create your own note first, then delete that."
        );
      }
      return;
    }
    if (fs) fs.remove(`${VFS_BASE}/${id}.json`);
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id);
      setSelId(next[0]?.id ?? null);
      return next;
    });
  }, [selId, fs, notes, lang]);

  useAppMenuListener("notes", (detail) => {
    switch (detail.type) {
      case "new-note":    createNote(); break;
      case "delete-note": deleteCurrentNote(); break;
      case "find":        /* TODO: open search */ break;
    }
  });

  const sorted = [...notes].sort((a, b) => b.modifiedAt - a.modifiedAt);
  const sel = notes.find(n => n.id === selId) ?? null;

  const dim = { color: "rgba(255,255,255,0.4)" } as React.CSSProperties;
  const normal = { color: "rgba(255,255,255,0.85)" } as React.CSSProperties;

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", animation: "fadeIn 0.2s ease" }}>
      {/* Sidebar */}
      <div className="flex-shrink-0 flex flex-col overflow-y-auto" style={{ width: 175, backgroundColor: "#1c1c1e" }}>
        <div className="pt-3 pb-2">
          <div className="px-4 pt-2 pb-1" style={{ ...dim, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("notes.iCloud")}</div>
          {[{ key: "notes-item", label: t("notes.notes"), id: "notes" }, { key: "deleted-item", label: t("notes.recentlyDeleted"), id: "deleted" }].map(item => (
            <button key={item.key} className="w-full flex items-center gap-2 py-1.5 text-left rounded"
              style={{ ...normal, fontSize: 13, paddingLeft: 16, paddingRight: 8, backgroundColor: item.id === "notes" ? "rgba(255,255,255,0.1)" : "transparent", width: "calc(100% - 8px)", margin: "1px 4px" }}>
              {item.label}
            </button>
          ))}
          <div className="h-px my-2 mx-4" style={{ backgroundColor: "rgba(255,255,255,0.07)" }} />
          <div className="px-4 pt-1 pb-1" style={{ ...dim, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("notes.onMyMac")}</div>
          <button className="w-full flex items-center gap-2 py-1.5 text-left rounded"
            style={{ ...dim, fontSize: 13, paddingLeft: 16, paddingRight: 8, backgroundColor: "transparent", width: "calc(100% - 8px)", margin: "1px 4px" }}>
            {t("notes.allMyMac")}
          </button>
        </div>
      </div>

      {/* Note list */}
      <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: 245, backgroundColor: "#242424", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ ...normal, fontSize: 14, fontWeight: 600 }}>{t("notes.title")}</span>
          <button onClick={createNote} className="flex items-center justify-center w-7 h-7 rounded" style={dim} title={t("notes.newNote")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sorted.map(note => {
            const title = readLang(note.title, lang);
            const content = readLang(note.content, lang);
            return (
              <button key={note.id} onClick={() => setSelId(note.id)} className="w-full text-left px-4 py-2"
                style={{ backgroundColor: note.id === selId ? "rgba(255,255,255,0.08)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="truncate" style={{ ...normal, fontSize: 13, fontWeight: 600 }}>
                    {note.pinned && <span style={{ color: "var(--accent)", marginRight: 4 }}>●</span>}
                    {title || t("notes.newNote")}
                  </span>
                  <span className="flex-shrink-0" style={{ ...dim, fontSize: 11 }}>{fmtDate(note.modifiedAt, lang)}</span>
                </div>
                <div style={{ ...dim, fontSize: 11, lineHeight: "1.4", marginTop: 2, overflow: "hidden", maxHeight: "2.8em" }}>
                  {content.replace(/\n/g, " ").trim() || t("notes.noAdditionalText")}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
        {sel ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {[["B", "bold"], ["I", "italic"], ["U", "underline"]].map(([l]) => (
                <button key={l} className="flex items-center justify-center px-2 py-1 rounded hover:bg-white/5" style={{ ...dim, fontSize: 13 }}>{l}</button>
              ))}
              <div className="w-px h-4 mx-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
              <button className="flex items-center justify-center px-2 py-1 rounded hover:bg-white/5" style={dim}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              </button>
              {sel.pinned && (
                <span style={{ ...dim, fontSize: 11, marginLeft: 8 }}>
                  {lang === "zh" ? "Portfolio · 受保护" : "Portfolio · protected"}
                </span>
              )}
            </div>
            {/* Title */}
            <div className="px-6 pt-5 pb-1 flex-shrink-0">
              <input type="text" value={readLang(sel.title, lang)} onChange={e => updateNote("title", e.target.value)}
                readOnly={!!sel.pinned}
                className="w-full bg-transparent outline-none border-none" style={{ ...normal, fontSize: 22, fontWeight: 700, lineHeight: "1.2", cursor: sel.pinned ? "default" : "text" }} placeholder="Title" />
            </div>
            <div className="px-6 pb-3 flex-shrink-0">
              <span style={{ ...dim, fontSize: 12 }}>
                {new Date(sel.modifiedAt).toLocaleDateString(
                  lang === "zh" ? "zh-CN" : "en-US",
                  { weekday: "long", year: "numeric", month: "long", day: "numeric" }
                )}
              </span>
            </div>
            <textarea value={readLang(sel.content, lang)} onChange={e => updateNote("content", e.target.value)}
              readOnly={!!sel.pinned}
              className="flex-1 px-6 pb-6 bg-transparent outline-none border-none resize-none"
              style={{ ...normal, fontSize: 14, lineHeight: "1.6", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", cursor: sel.pinned ? "default" : "text" }}
              placeholder="Note content..." spellCheck={false} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center"><span style={{ ...dim, fontSize: 14 }}>{t("notes.selectNote")}</span></div>
        )}
      </div>
    </div>
  );
}

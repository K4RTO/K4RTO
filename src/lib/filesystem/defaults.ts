import type { FsEntry, FsState } from "@/lib/filesystem/types";
import apps from "@/apps/registry";
import { PORTFOLIO_SOURCES, PORTFOLIO_SOURCE_ROOT, renderSource } from "@/apps/vscode/portfolioSources";
import { appFileContent, appFileName, getDefaultAppForFile } from "@/services/app-manager";
import { fileKindForName } from "@/services/file-index";

function makeDir(path: string, metadata: FsEntry["metadata"] = {}): FsEntry {
  const now = Date.now();
  const name = path === "/" ? "/" : path.split("/").filter(Boolean).pop() ?? "";
  return {
    path,
    name,
    type: "dir",
    content: "",
    size: 0,
    createdAt: now,
    modifiedAt: now,
    metadata,
  };
}

function guessMime(name: string): string | undefined {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "md" || ext === "txt") return "text/plain";
  if (ext === "json") return "application/json";
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (["ts", "tsx", "js", "jsx", "css", "html"].includes(ext)) return "text/plain";
  return undefined;
}

function makeFile(path: string, content: string, metadata: FsEntry["metadata"] = {}): FsEntry {
  const now = Date.now();
  const name = path.split("/").filter(Boolean).pop() ?? "";
  const kind = metadata.kind ?? fileKindForName(name);
  return {
    path,
    name,
    type: "file",
    content,
    size: content.length,
    createdAt: now,
    modifiedAt: now,
    metadata: {
      kind,
      mime: guessMime(name),
      defaultAppId: getDefaultAppForFile(name),
      ...metadata,
    },
  };
}

export function buildDefaults(): FsState {
  const state: FsState = {};

  // Default directories
  const dirs = [
    "/",
    "/System",
    "/System/Applications",
    "/System/Library",
    "/System/Library/CoreServices",
    "/System/Volumes",
    "/Users",
    "/Users/guest",
    "/Users/guest/Desktop",
    "/Users/guest/Documents",
    "/Users/guest/Downloads",
    "/Users/guest/Pictures",
    "/Users/guest/Music",
    "/Users/guest/.Trash",
    "/Applications",
    "/Volumes",
    "/Volumes/Macintosh HD",
    "/Users/guest/Documents/Notes",
    "/Users/guest/K4RTO",
    PORTFOLIO_SOURCE_ROOT,
  ];

  for (const dir of dirs) {
    const system = dir === "/System" || dir.startsWith("/System/") || dir === "/Applications" || dir === "/Volumes";
    state[dir] = makeDir(dir, system ? { system: true, readonly: true } : {});
  }

  // Seed K4RTO portfolio source samples — readable from VSCode app.
  // Each sample's annotation becomes a comment header so the prose ships with the file.
  for (const sample of PORTFOLIO_SOURCES) {
    const path = `${PORTFOLIO_SOURCE_ROOT}/${sample.name}`;
    state[path] = makeFile(path, renderSource(sample), {
      tags: ["source", "portfolio", "code"],
      readonly: true,
    });
  }

  // Default files
  const files: Array<[string, string]> = [
    [
      "/Users/guest/Documents/Welcome.txt",
      "Welcome to macOS!\nThis is a virtual file system.\n",
    ],
    [
      "/Users/guest/Documents/README.md",
      "# macOS Virtual Desktop\n\nBuilt with Next.js 15 + React 19.\n",
    ],
    // Desktop entries — these are what the user sees the moment the lock
    // screen lifts. Keep them few and concrete: a real resume, a short
    // welcome, and one obvious next click.
    [
      "/Users/guest/Desktop/Resume.pdf",
      "__public:K4RTO/Resume.pdf",
    ],
    [
      "/Users/guest/Desktop/Welcome.md",
      `# Hi — welcome to K4RTO

This is a macOS-style desktop running entirely in your browser. Everything
you see is React + Tailwind + a tiny IndexedDB-backed file system.

A few things worth a click:

- **Resume.pdf** (right here on the desktop) — opens in Preview, EN/中 toggle in the top bar.
- **Code** in the Dock — VSCode with Shiki-highlighted snippets of the actual source running this site.
- **Safari** — Bing/Wikipedia/GitHub work; routed through a Cloudflare Worker that strips iframe headers.
- **⌘ + Space** for Spotlight — try "resume", "github", or any filename.
- **F4** to open Launchpad — every app in one grid.

Use the **中 / EN** toggle at the top-right of the menu bar to switch the
whole UI to Chinese — including this file (see Welcome.zh.md next door).

Have a poke around. Nothing on this desktop will break if you click it.
`,
    ],
    [
      "/Users/guest/Desktop/Welcome.zh.md",
      `# 你好，欢迎来到 K4RTO

这是一个完全跑在浏览器里的 macOS 风格桌面。你看到的所有东西都是
React + Tailwind + 一套基于 IndexedDB 的迷你文件系统。

几个值得点点的地方：

- **Resume.pdf**（桌面上这个）—— 在"预览"中打开，顶部可切英文 / 中文版。
- **Dock 里的 Code** —— VSCode，里面用 Shiki 高亮显示了本站真实运行代码的片段。
- **Safari** —— Bing / Wikipedia / GitHub 都能开，通过 Cloudflare Worker 代理剥掉 iframe 限制头。
- **⌘ + 空格** 开 Spotlight —— 试试 "简历"、"github" 或任意文件名。
- **F4** 开启 Launchpad —— 所有应用一次看完。

用菜单栏右上角的 **中 / EN** 切换可以把整个界面切到英文（参考隔壁的 Welcome.md）。

随便点点，桌面上不会有东西因为被你点了就坏掉。
`,
    ],
    ["/Users/guest/Documents/Notes/Hello.txt", "Hello, World!\n"],
    ["/Users/guest/K4RTO/Resume.pdf", "__public:K4RTO/Resume.pdf"],
    ["/Users/guest/K4RTO/cat.png",    "__public:K4RTO/cat.png"],
    ["/Users/guest/K4RTO/logo.jpg",   "__public:K4RTO/logo.jpg"],
  ];

  for (const [path, content] of files) {
    state[path] = makeFile(path, content, {
      tags: path.includes("Welcome") ? ["welcome", "guide", "portfolio"] : undefined,
      readonly: path.includes("/K4RTO/") || path.includes("/Desktop/Resume.pdf"),
    });
  }

  // Virtual .app entries in /Applications — content marker tells Finder which app to launch
  for (const appId of Object.keys(apps)) {
    const app = apps[appId];
    const path = `/Applications/${appFileName(app)}`;
    state[path] = makeFile(path, appFileContent(appId), {
      kind: "Application",
      mime: "application/x-k4rto-app",
      readonly: true,
      system: true,
      bundleId: app.bundleId,
      defaultAppId: appId,
      tags: [app.category, app.name.toLowerCase()],
    });
  }

  return state;
}

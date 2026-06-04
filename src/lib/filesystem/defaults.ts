import type { FsEntry, FsState } from "@/lib/filesystem/types";
import apps from "@/apps/registry";
import { PORTFOLIO_SOURCES, PORTFOLIO_SOURCE_ROOT, renderSource } from "@/apps/vscode/portfolioSources";

function makeDir(path: string): FsEntry {
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
  };
}

function makeFile(path: string, content: string): FsEntry {
  const now = Date.now();
  const name = path.split("/").filter(Boolean).pop() ?? "";
  return {
    path,
    name,
    type: "file",
    content,
    size: content.length,
    createdAt: now,
    modifiedAt: now,
  };
}

export function buildDefaults(): FsState {
  const state: FsState = {};

  // Default directories
  const dirs = [
    "/",
    "/Users",
    "/Users/guest",
    "/Users/guest/Desktop",
    "/Users/guest/Documents",
    "/Users/guest/Downloads",
    "/Users/guest/Pictures",
    "/Users/guest/Music",
    "/Users/guest/.Trash",
    "/Applications",
    "/Users/guest/Documents/Notes",
    "/Users/guest/K4RTO",
    PORTFOLIO_SOURCE_ROOT,
  ];

  for (const dir of dirs) {
    state[dir] = makeDir(dir);
  }

  // Seed K4RTO portfolio source samples — readable from VSCode app.
  // Each sample's annotation becomes a comment header so the prose ships with the file.
  for (const sample of PORTFOLIO_SOURCES) {
    const path = `${PORTFOLIO_SOURCE_ROOT}/${sample.name}`;
    state[path] = makeFile(path, renderSource(sample));
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

Have a poke around. Nothing on this desktop will break if you click it.
`,
    ],
    ["/Users/guest/Documents/Notes/Hello.txt", "Hello, World!\n"],
    ["/Users/guest/K4RTO/Resume.pdf", "__public:K4RTO/Resume.pdf"],
    ["/Users/guest/K4RTO/cat.png",    "__public:K4RTO/cat.png"],
    ["/Users/guest/K4RTO/logo.jpg",   "__public:K4RTO/logo.jpg"],
  ];

  for (const [path, content] of files) {
    state[path] = makeFile(path, content);
  }

  // Virtual .app entries in /Applications — content marker tells Finder which app to launch
  for (const appId of Object.keys(apps)) {
    const app = apps[appId];
    const path = `/Applications/${app.name}.app`;
    state[path] = makeFile(path, `__app:${appId}`);
  }

  return state;
}

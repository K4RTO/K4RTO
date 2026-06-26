import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { AppCategory } from "@/services/app-manager";

export interface AppComponentProps {
  windowId: string;
  processId: string;
  meta?: Record<string, string>;
}

export interface AppDefinition {
  id: string;
  name: string;
  icon: string | null; // webp filename in /System/Icons/96x96/ or null for SVG icon
  component: LazyExoticComponent<ComponentType<AppComponentProps>>;
  defaultRect: { x: number; y: number; width: number; height: number };
  minSize: { width: number; height: number };
  resizable?: boolean;
  singleInstance?: boolean;
  bundleId: string;
  version: string;
  category: AppCategory;
  supportedFileTypes?: string[];
  defaultOpenFor?: string[];
  permissions?: string[];
}

const apps: Record<string, AppDefinition> = {
  finder: {
    id: "finder",
    name: "Finder",
    icon: "finder.webp",
    component: lazy(() => import("./finder/Finder")),
    defaultRect: { x: 100, y: 60, width: 1050, height: 648 },
    minSize: { width: 400, height: 300 },
    singleInstance: false,
    bundleId: "com.k4rto.finder",
    version: "1.0.0",
    category: "system",
    permissions: ["filesystem"],
  },
  terminal: {
    id: "terminal",
    name: "Terminal",
    icon: null,
    component: lazy(() => import("./terminal/Terminal")),
    defaultRect: { x: 150, y: 100, width: 600, height: 400 },
    minSize: { width: 400, height: 250 },
    bundleId: "com.k4rto.terminal",
    version: "1.0.0",
    category: "developer",
    permissions: ["filesystem", "processes", "settings"],
  },
  safari: {
    id: "safari",
    name: "Safari",
    icon: null,
    component: lazy(() => import("./browser/Browser")),
    defaultRect: { x: 80, y: 40, width: 900, height: 600 },
    minSize: { width: 500, height: 350 },
    bundleId: "com.k4rto.safari",
    version: "1.0.0",
    category: "system",
    permissions: ["network"],
  },
  notes: {
    id: "notes",
    name: "Notes",
    icon: null,
    component: lazy(() => import("./notes/Notes")),
    defaultRect: { x: 200, y: 80, width: 650, height: 500 },
    minSize: { width: 400, height: 300 },
    bundleId: "com.k4rto.notes",
    version: "1.0.0",
    category: "productivity",
    supportedFileTypes: ["txt", "md"],
  },
  textedit: {
    id: "textedit",
    name: "TextEdit",
    icon: null,
    component: lazy(() => import("./textedit/TextEdit")),
    defaultRect: { x: 180, y: 70, width: 600, height: 450 },
    minSize: { width: 300, height: 200 },
    bundleId: "com.k4rto.textedit",
    version: "1.0.0",
    category: "productivity",
    supportedFileTypes: ["txt", "md"],
    defaultOpenFor: ["txt"],
  },
  settings: {
    id: "settings",
    name: "System Settings",
    icon: null,
    component: lazy(() => import("./settings/Settings")),
    defaultRect: { x: 200, y: 60, width: 700, height: 500 },
    minSize: { width: 600, height: 400 },
    singleInstance: true,
    bundleId: "com.k4rto.settings",
    version: "1.0.0",
    category: "system",
    permissions: ["settings"],
  },
  calculator: {
    id: "calculator",
    name: "Calculator",
    icon: null,
    component: lazy(() => import("./calculator/Calculator")),
    defaultRect: { x: 300, y: 100, width: 240, height: 420 },
    minSize: { width: 240, height: 420 },
    resizable: false,
    singleInstance: true,
    bundleId: "com.k4rto.calculator",
    version: "1.0.0",
    category: "utility",
  },
  calendar: {
    id: "calendar",
    name: "Calendar",
    icon: null,
    component: lazy(() => import("./calendar/Calendar")),
    defaultRect: { x: 150, y: 60, width: 750, height: 550 },
    minSize: { width: 500, height: 400 },
    singleInstance: true,
    bundleId: "com.k4rto.calendar",
    version: "1.0.0",
    category: "productivity",
  },
  clock: {
    id: "clock",
    name: "Clock",
    icon: null,
    component: lazy(() => import("./clock/Clock")),
    defaultRect: { x: 160, y: 60, width: 780, height: 520 },
    minSize: { width: 500, height: 380 },
    singleInstance: true,
    bundleId: "com.k4rto.clock",
    version: "1.0.0",
    category: "utility",
  },
  preview: {
    id: "preview",
    name: "Preview",
    icon: null,
    component: lazy(() => import("./preview/Preview")),
    defaultRect: { x: 120, y: 60, width: 860, height: 620 },
    minSize: { width: 400, height: 300 },
    bundleId: "com.k4rto.preview",
    version: "1.0.0",
    category: "productivity",
    supportedFileTypes: ["pdf", "png", "jpg", "jpeg", "webp", "gif"],
    defaultOpenFor: ["pdf", "png", "jpg", "jpeg", "webp", "gif"],
  },
  vscode: {
    id: "vscode",
    name: "Code",
    icon: null,
    component: lazy(() => import("./vscode/VSCode")),
    defaultRect: { x: 80, y: 50, width: 900, height: 600 },
    minSize: { width: 500, height: 350 },
    bundleId: "com.k4rto.code",
    version: "1.0.0",
    category: "developer",
    supportedFileTypes: ["ts", "tsx", "js", "jsx", "json", "css", "html", "md"],
    defaultOpenFor: ["ts", "tsx", "js", "jsx", "json", "css", "html", "md"],
  },
  word: {
    id: "word",
    name: "Word",
    icon: null,
    component: lazy(() => import("./word/Word")),
    defaultRect: { x: 100, y: 60, width: 780, height: 580 },
    minSize: { width: 400, height: 300 },
    bundleId: "com.k4rto.word",
    version: "1.0.0",
    category: "productivity",
    supportedFileTypes: ["doc", "docx"],
    defaultOpenFor: ["doc", "docx"],
  },
  music: {
    id: "music",
    name: "Music",
    icon: "music.webp",
    component: lazy(() => import("./music/Music")),
    defaultRect: { x: 220, y: 80, width: 380, height: 520 },
    minSize: { width: 300, height: 400 },
    singleInstance: true,
    bundleId: "com.k4rto.music",
    version: "1.0.0",
    category: "media",
    permissions: ["network", "audio"],
  },
  game2048: {
    id: "game2048",
    name: "2048",
    icon: null,
    component: lazy(() => import("./game2048/Game2048")),
    defaultRect: { x: 260, y: 70, width: 420, height: 560 },
    minSize: { width: 360, height: 480 },
    singleInstance: true,
    bundleId: "com.k4rto.game2048",
    version: "1.0.0",
    category: "game",
  },
  minesweeper: {
    id: "minesweeper",
    name: "Minesweeper",
    icon: null,
    component: lazy(() => import("./minesweeper/Minesweeper")),
    defaultRect: { x: 200, y: 50, width: 760, height: 600 },
    minSize: { width: 360, height: 420 },
    singleInstance: true,
    bundleId: "com.k4rto.minesweeper",
    version: "1.0.0",
    category: "game",
  },
  snake: {
    id: "snake",
    name: "Snake",
    icon: null,
    component: lazy(() => import("./snake/Snake")),
    defaultRect: { x: 280, y: 80, width: 480, height: 620 },
    minSize: { width: 380, height: 500 },
    singleInstance: true,
    bundleId: "com.k4rto.snake",
    version: "1.0.0",
    category: "game",
  },
  tetris: {
    id: "tetris",
    name: "Tetris",
    icon: null,
    component: lazy(() => import("./tetris/Tetris")),
    defaultRect: { x: 200, y: 50, width: 520, height: 720 },
    minSize: { width: 460, height: 620 },
    singleInstance: true,
    bundleId: "com.k4rto.tetris",
    version: "1.0.0",
    category: "game",
  },
};

export function getApp(id: string): AppDefinition | undefined {
  return apps[id];
}

export function getAllApps(): AppDefinition[] {
  return Object.values(apps);
}

export default apps;

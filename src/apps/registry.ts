import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export interface AppComponentProps {
  windowId: string;
  processId: string;
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
  },
  terminal: {
    id: "terminal",
    name: "Terminal",
    icon: null,
    component: lazy(() => import("./terminal/Terminal")),
    defaultRect: { x: 150, y: 100, width: 600, height: 400 },
    minSize: { width: 400, height: 250 },
  },
  safari: {
    id: "safari",
    name: "Safari",
    icon: null,
    component: lazy(() => import("./browser/Browser")),
    defaultRect: { x: 80, y: 40, width: 900, height: 600 },
    minSize: { width: 500, height: 350 },
  },
  notes: {
    id: "notes",
    name: "Notes",
    icon: null,
    component: lazy(() => import("./notes/Notes")),
    defaultRect: { x: 200, y: 80, width: 650, height: 500 },
    minSize: { width: 400, height: 300 },
  },
  textedit: {
    id: "textedit",
    name: "TextEdit",
    icon: null,
    component: lazy(() => import("./textedit/TextEdit")),
    defaultRect: { x: 180, y: 70, width: 600, height: 450 },
    minSize: { width: 300, height: 200 },
  },
  settings: {
    id: "settings",
    name: "System Settings",
    icon: null,
    component: lazy(() => import("./settings/Settings")),
    defaultRect: { x: 200, y: 60, width: 700, height: 500 },
    minSize: { width: 600, height: 400 },
    singleInstance: true,
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
  },
  calendar: {
    id: "calendar",
    name: "Calendar",
    icon: null,
    component: lazy(() => import("./calendar/Calendar")),
    defaultRect: { x: 150, y: 60, width: 750, height: 550 },
    minSize: { width: 500, height: 400 },
    singleInstance: true,
  },
  clock: {
    id: "clock",
    name: "Clock",
    icon: null,
    component: lazy(() => import("./clock/Clock")),
    defaultRect: { x: 160, y: 60, width: 780, height: 520 },
    minSize: { width: 500, height: 380 },
    singleInstance: true,
  },
  preview: {
    id: "preview",
    name: "Preview",
    icon: null,
    component: lazy(() => import("./preview/Preview")),
    defaultRect: { x: 120, y: 60, width: 860, height: 620 },
    minSize: { width: 400, height: 300 },
  },
  vscode: {
    id: "vscode",
    name: "Code",
    icon: null,
    component: lazy(() => import("./vscode/VSCode")),
    defaultRect: { x: 80, y: 50, width: 900, height: 600 },
    minSize: { width: 500, height: 350 },
  },
  word: {
    id: "word",
    name: "Word",
    icon: null,
    component: lazy(() => import("./word/Word")),
    defaultRect: { x: 100, y: 60, width: 780, height: 580 },
    minSize: { width: 400, height: 300 },
  },
  music: {
    id: "music",
    name: "Music",
    icon: "music.webp",
    component: lazy(() => import("./music/Music")),
    defaultRect: { x: 220, y: 80, width: 380, height: 520 },
    minSize: { width: 300, height: 400 },
    singleInstance: true,
  },
  game2048: {
    id: "game2048",
    name: "2048",
    icon: null,
    component: lazy(() => import("./game2048/Game2048")),
    defaultRect: { x: 260, y: 70, width: 420, height: 560 },
    minSize: { width: 360, height: 480 },
    singleInstance: true,
  },
  minesweeper: {
    id: "minesweeper",
    name: "Minesweeper",
    icon: null,
    component: lazy(() => import("./minesweeper/Minesweeper")),
    defaultRect: { x: 200, y: 50, width: 760, height: 600 },
    minSize: { width: 360, height: 420 },
    singleInstance: true,
  },
};

export function getApp(id: string): AppDefinition | undefined {
  return apps[id];
}

export function getAllApps(): AppDefinition[] {
  return Object.values(apps);
}

export default apps;

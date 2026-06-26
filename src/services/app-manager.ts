import type { AppDefinition } from "@/apps/registry";
import { getApp, getAllApps } from "@/apps/registry";
import type { FsEntry, FileSystemContextValue } from "@/lib/filesystem/types";

export type AppCategory =
  | "system"
  | "productivity"
  | "developer"
  | "media"
  | "utility"
  | "game";

export interface AppRuntimeMetadata {
  bundleId: string;
  version: string;
  category: AppCategory;
  supportedFileTypes?: string[];
  defaultOpenFor?: string[];
  permissions?: string[];
}

export interface LaunchRequest {
  appId: string;
  meta?: Record<string, string>;
}

export interface OpenFileResult extends LaunchRequest {
  filePath: string;
  fileName: string;
}

const EXTENSION_FALLBACKS: Record<string, string> = {
  pdf: "preview",
  png: "preview",
  jpg: "preview",
  jpeg: "preview",
  webp: "preview",
  gif: "preview",
  doc: "word",
  docx: "word",
  ts: "vscode",
  tsx: "vscode",
  js: "vscode",
  jsx: "vscode",
  json: "vscode",
  css: "vscode",
  html: "vscode",
  md: "vscode",
  txt: "textedit",
};

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function appFileName(app: AppDefinition): string {
  return `${app.name}.app`;
}

export function appFileContent(appId: string): string {
  return `__app:${appId}`;
}

export function appIdFromApplicationFile(content: string): string | null {
  const match = /^__app:(.+)$/.exec(content.trim());
  return match ? match[1] : null;
}

export function getDefaultAppForFile(name: string, entry?: FsEntry | null): string {
  if (entry?.metadata?.defaultAppId) return entry.metadata.defaultAppId;
  if (entry?.metadata?.mime?.startsWith("image/")) return "preview";
  const ext = extensionOf(name);
  for (const app of getAllApps()) {
    const defaults = app.defaultOpenFor ?? [];
    if (defaults.includes(ext)) return app.id;
  }
  return EXTENSION_FALLBACKS[ext] ?? "textedit";
}

export function getFileLaunchMeta(filePath: string, fileName: string, appId?: string): Record<string, string> {
  const resolvedAppId = appId ?? getDefaultAppForFile(fileName);
  const publicPath = filePath.replace("/Users/guest/", "/");
  if (resolvedAppId === "preview") return { filePath, publicPath, fileName };
  return { filePath, fileName };
}

export function planOpenFile(fs: Pick<FileSystemContextValue, "getEntry" | "readFile">, path: string): OpenFileResult | null {
  const entry = fs.getEntry(path);
  if (!entry || entry.type !== "file") return null;

  if (extensionOf(entry.name) === "app") {
    const appId = appIdFromApplicationFile(fs.readFile(path) ?? "");
    if (!appId || !getApp(appId)) return null;
    return {
      appId,
      filePath: path,
      fileName: entry.name,
      meta: { filePath: path, fileName: entry.name },
    };
  }

  const appId = getDefaultAppForFile(entry.name, entry);
  return {
    appId,
    filePath: path,
    fileName: entry.name,
    meta: getFileLaunchMeta(path, entry.name, appId),
  };
}

export function listLaunchableApps(): AppDefinition[] {
  return getAllApps().sort((a, b) => a.name.localeCompare(b.name));
}

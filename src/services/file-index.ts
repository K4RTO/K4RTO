import type { FileSystemContextValue, FsEntry } from "@/lib/filesystem/types";
import { getDefaultAppForFile } from "@/services/app-manager";

export interface IndexedFile {
  path: string;
  name: string;
  kind: string;
  icon: string;
  appId: string;
  scoreText: string;
}

const FILE_ICONS: Record<string, string> = {
  md: "📄",
  txt: "📄",
  pdf: "📕",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
  webp: "🖼️",
  gif: "🖼️",
  ts: "🟦",
  tsx: "🟦",
  js: "🟨",
  jsx: "🟨",
  json: "🟧",
  css: "🎨",
  html: "🌐",
  doc: "📘",
  docx: "📘",
  app: "📦",
};

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function fileIconForName(name: string): string {
  return FILE_ICONS[fileExtension(name)] ?? "📄";
}

export function fileKindForName(name: string, entry?: FsEntry | null): string {
  if (entry?.metadata?.kind) return entry.metadata.kind;
  const ext = fileExtension(name);
  if (ext === "app") return "Application";
  if (ext === "txt") return "Plain Text";
  if (ext === "md") return "Markdown";
  if (ext === "pdf") return "PDF Document";
  if (ext === "json") return "JSON";
  if (ext === "doc" || ext === "docx") return "Word Document";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "Image";
  if (["ts", "tsx", "js", "jsx"].includes(ext)) return "Source Code";
  if (ext === "css") return "Stylesheet";
  if (ext === "html") return "HTML";
  return "Document";
}

function shouldSkipDir(entry: FsEntry): boolean {
  if (entry.name === ".Trash") return true;
  if (entry.name.startsWith(".") && entry.path !== "/Users/guest/.Trash") return true;
  return false;
}

export function indexFileSystem(
  fs: Pick<FileSystemContextValue, "readDir" | "readFile">,
  roots = ["/Users/guest", "/Applications"]
): IndexedFile[] {
  const out: IndexedFile[] = [];
  const seen = new Set<string>();

  const visit = (dir: string) => {
    if (seen.has(dir)) return;
    seen.add(dir);
    for (const entry of fs.readDir(dir)) {
      if (entry.type === "dir") {
        if (!shouldSkipDir(entry)) visit(entry.path);
        continue;
      }

      const content = entry.size <= 40_000 ? fs.readFile(entry.path) ?? "" : "";
      out.push({
        path: entry.path,
        name: entry.name,
        kind: fileKindForName(entry.name, entry),
        icon: fileIconForName(entry.name),
        appId: getDefaultAppForFile(entry.name, entry),
        scoreText: `${entry.name}\n${entry.path}\n${entry.metadata?.tags?.join(" ") ?? ""}\n${content}`.toLowerCase(),
      });
    }
  };

  for (const root of roots) visit(root);
  return out;
}

export function searchFiles(
  fs: Pick<FileSystemContextValue, "readDir" | "readFile">,
  query: string,
  cap = 8
): IndexedFile[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return indexFileSystem(fs)
    .map((file) => {
      const name = file.name.toLowerCase();
      const path = file.path.toLowerCase();
      let score = 0;
      if (name === q) score += 100;
      if (name.startsWith(q)) score += 60;
      if (name.includes(q)) score += 35;
      if (path.includes(q)) score += 15;
      if (file.scoreText.includes(q)) score += 8;
      return { file, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.file.name.localeCompare(b.file.name))
    .slice(0, cap)
    .map((r) => r.file);
}

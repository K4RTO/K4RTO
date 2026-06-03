"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  FsEntry,
  FsState,
  FileSystemContextValue,
} from "@/lib/filesystem/types";
import { buildDefaults } from "@/lib/filesystem/defaults";

const FileSystemContext = createContext<FileSystemContextValue | null>(null);

// v2: added /Users/guest/.Trash, /Applications populated with virtual .app files, removed "files" sidebar item
// v3: seeded /Users/guest/K4RTO/Source/ with VSCode portfolio source samples
// v4: added README.zh.md (Chinese version) to K4RTO/Source/
const LS_KEY = "vfs_state_v4";

function loadOrInit(): FsState {
  if (typeof window === "undefined") return buildDefaults();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as FsState;
  } catch {}
  return buildDefaults();
}

function persist(state: FsState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

function parentOf(p: string): string {
  const parts = p.split("/").filter(Boolean);
  parts.pop();
  return "/" + parts.join("/") || "/";
}

function baseName(p: string): string {
  return p.split("/").filter(Boolean).pop() ?? "";
}

function makeEntry(path: string, type: "file" | "dir", content = ""): FsEntry {
  const now = Date.now();
  return {
    path,
    name: baseName(path),
    type,
    content,
    size: content.length,
    createdAt: now,
    modifiedAt: now,
  };
}

export function FileSystemProvider({ children }: { children: ReactNode }) {
  const [fs, setFs] = useState<FsState>(loadOrInit);

  const update = useCallback((fn: (prev: FsState) => FsState) => {
    setFs((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }, []);

  const readDir = useCallback(
    (path: string): FsEntry[] => {
      const norm = path === "/" ? "/" : path.replace(/\/$/, "");
      return Object.values(fs).filter((e) => {
        if (e.path === norm) return false;
        const parent = parentOf(e.path);
        return parent === norm;
      });
    },
    [fs]
  );

  const readFile = useCallback(
    (path: string): string | null => {
      const e = fs[path];
      if (!e || e.type === "dir") return null;
      return e.content;
    },
    [fs]
  );

  const writeFile = useCallback(
    (path: string, content: string) => {
      update((prev) => {
        const next = { ...prev };
        // ensure parent dirs
        const parts = path.split("/").filter(Boolean);
        let cur = "";
        for (let i = 0; i < parts.length - 1; i++) {
          cur += "/" + parts[i];
          if (!next[cur]) next[cur] = makeEntry(cur, "dir");
        }
        const existing = next[path];
        next[path] = {
          path,
          name: baseName(path),
          type: "file",
          content,
          size: content.length,
          createdAt: existing?.createdAt ?? Date.now(),
          modifiedAt: Date.now(),
        };
        return next;
      });
    },
    [update]
  );

  const mkdir = useCallback(
    (path: string) => {
      update((prev) => {
        const next = { ...prev };
        const parts = path.split("/").filter(Boolean);
        let cur = "";
        for (const p of parts) {
          cur += "/" + p;
          if (!next[cur]) next[cur] = makeEntry(cur, "dir");
        }
        return next;
      });
    },
    [update]
  );

  const remove = useCallback(
    (path: string) => {
      update((prev) => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
    },
    [update]
  );

  const exists = useCallback((path: string): boolean => !!fs[path], [fs]);

  const rename = useCallback(
    (oldPath: string, newPath: string) => {
      update((prev) => {
        const entry = prev[oldPath];
        if (!entry) return prev;
        const next = { ...prev };
        delete next[oldPath];
        next[newPath] = {
          ...entry,
          path: newPath,
          name: baseName(newPath),
          modifiedAt: Date.now(),
        };
        return next;
      });
    },
    [update]
  );

  const getEntry = useCallback(
    (path: string): FsEntry | null => fs[path] ?? null,
    [fs]
  );

  return (
    <FileSystemContext.Provider
      value={{
        readDir,
        readFile,
        writeFile,
        mkdir,
        remove,
        exists,
        rename,
        getEntry,
      }}
    >
      {children}
    </FileSystemContext.Provider>
  );
}

export function useFileSystem(): FileSystemContextValue {
  const ctx = useContext(FileSystemContext);
  if (!ctx)
    throw new Error("useFileSystem must be used within FileSystemProvider");
  return ctx;
}

export function useFileSystemOptional(): FileSystemContextValue | null {
  return useContext(FileSystemContext);
}

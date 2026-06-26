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
import { PORTFOLIO_SOURCE_ROOT } from "@/apps/vscode/portfolioSources";

const FileSystemContext = createContext<FileSystemContextValue | null>(null);

// v2: added /Users/guest/.Trash, /Applications populated with virtual .app files, removed "files" sidebar item
// v3: seeded /Users/guest/K4RTO/Source/ with VSCode portfolio source samples
// v4: added README.zh.md (Chinese version) to K4RTO/Source/
// v5: identity scrub — removed real name from any UI text (login screen,
//     Notes seed, terminal portfolio command output)
// v6: seeded /Users/guest/Desktop with Resume.pdf + Welcome.md (replacing
//     the empty Untitled.txt) so the desktop isn't blank on first reveal
// v7: added Welcome.zh.md (Chinese counterpart to Welcome.md) so the
//     desktop has bilingual entry points matching the menubar lang toggle
// v8: added system metadata, /System + /Volumes seeds, and application bundle
//     metadata used by the frontend runtime/app-manager layer.
const LS_KEY = "vfs_state_v8";

// Where trashed entries live, and a separate LS key for the trashed-path →
// origin-path map (we can't stash origin info in FsEntry without breaking the
// existing schema, and a parallel map is plenty simple at this scale).
const TRASH_DIR = "/Users/guest/.Trash";
const TRASH_ORIGINS_KEY = "vfs_trash_origins_v1";

function loadTrashOrigins(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TRASH_ORIGINS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * Try to migrate an older VFS snapshot forward without nuking user-written data
 * (Notes content, TextEdit drafts, custom files in Desktop / Documents, etc).
 *
 * Currently handles v3 → v4: preserves the entire prior state, then overlays
 * fresh entries under `PORTFOLIO_SOURCE_ROOT` so any new / updated portfolio
 * samples land in the showcase without touching the user's own files.
 *
 * Returns null if there's nothing to migrate from.
 */
function migrateFromOlder(): FsState | null {
  // Each new version reads from the previous, preserving user data and only
  // overlaying the freshly-seeded entries (portfolio source samples in v4,
  // desktop welcome files in v6, etc).
  const legacyKeys = ["vfs_state_v7", "vfs_state_v6", "vfs_state_v5", "vfs_state_v4", "vfs_state_v3"];
  // Paths whose freshly-built content should always replace whatever was on
  // disk (so updates to a seeded file reach existing visitors). User-created
  // files outside these prefixes are preserved as-is.
  const SEEDED_PREFIXES = [
    PORTFOLIO_SOURCE_ROOT,
    "/System",
    "/Applications",
    "/Volumes",
    "/Users/guest/Desktop/Resume.pdf",
    "/Users/guest/Desktop/Welcome.md",
    "/Users/guest/Desktop/Welcome.zh.md",
  ];
  for (const key of legacyKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const prior = JSON.parse(raw) as FsState;
      const fresh = buildDefaults();
      const overlay = Object.fromEntries(
        Object.entries(fresh).filter(([k]) =>
          SEEDED_PREFIXES.some((p) => k === p || k.startsWith(`${p}/`)),
        ),
      );
      return { ...prior, ...overlay };
    } catch {
      // Corrupt legacy snapshot — fall through to next candidate / full reset.
    }
  }
  return null;
}

function withSystemSeeds(state: FsState): FsState {
  const fresh = buildDefaults();
  const SYSTEM_PREFIXES = [
    "/System",
    "/Applications",
    "/Volumes",
    PORTFOLIO_SOURCE_ROOT,
  ];
  const next = { ...state };
  for (const [path, entry] of Object.entries(fresh)) {
    if (SYSTEM_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      next[path] = entry;
    }
  }
  return next;
}

function loadOrInit(): FsState {
  if (typeof window === "undefined") return buildDefaults();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return withSystemSeeds(JSON.parse(raw) as FsState);
    const migrated = migrateFromOlder();
    if (migrated) {
      // Persist immediately so the next load skips migration; don't delete the
      // legacy snapshot — keeps a recovery path if the new version is buggy.
      try { localStorage.setItem(LS_KEY, JSON.stringify(migrated)); } catch {}
      return withSystemSeeds(migrated);
    }
  } catch {}
  // Fresh-defaults path also means any leftover trash origins are dead
  // references (their VFS counterparts don't exist any more). Clear them so
  // the map doesn't accumulate stale entries across reset cycles.
  try { localStorage.removeItem(TRASH_ORIGINS_KEY); } catch {}
  return withSystemSeeds(buildDefaults());
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

function inferMetadata(path: string, type: "file" | "dir"): FsEntry["metadata"] {
  const name = baseName(path);
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (type === "dir") return {};
  if (ext === "pdf") return { kind: "PDF Document", mime: "application/pdf", defaultAppId: "preview" };
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return { kind: "Image", mime: `image/${ext === "jpg" ? "jpeg" : ext}`, defaultAppId: "preview" };
  if (["ts", "tsx", "js", "jsx", "json", "css", "html", "md"].includes(ext)) return { kind: ext === "md" ? "Markdown" : "Source Code", mime: "text/plain", defaultAppId: "vscode" };
  if (ext === "txt") return { kind: "Plain Text", mime: "text/plain", defaultAppId: "textedit" };
  if (["doc", "docx"].includes(ext)) return { kind: "Word Document", defaultAppId: "word" };
  return { kind: "Document" };
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
    metadata: inferMetadata(path, type),
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
          metadata: existing?.metadata ?? inferMetadata(path, "file"),
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
        // Recursive delete: drop the entry itself AND every descendant. Without
        // this, removing a folder would leave its children as orphan nodes that
        // accumulate in localStorage forever (no UI surfaces them — they're
        // dead weight until VFS reset). moveToTrash already handles descendants
        // correctly; remove was the inconsistent path.
        const prefix = path + "/";
        for (const k of Object.keys(next)) {
          if (k === path || k.startsWith(prefix)) delete next[k];
        }
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

  // ── Trash ──────────────────────────────────────────────────────────────────
  // The trash sits at TRASH_DIR. We can't store origin info inside the FsEntry
  // (no schema slot for it without breaking everything that reads .content as
  // raw text), so origins live in a parallel localStorage map keyed by the
  // trashed path. The map is loaded into a React state so trash operations
  // re-render consumers, and snapshotted to LS on each mutation.

  type TrashOrigins = Record<string, string>;
  const [trashOrigins, setTrashOrigins] = useState<TrashOrigins>(loadTrashOrigins);

  const persistOrigins = useCallback((map: TrashOrigins) => {
    try { localStorage.setItem(TRASH_ORIGINS_KEY, JSON.stringify(map)); } catch {}
  }, []);

  /** Find a non-colliding name inside .Trash by appending " (2)", " (3)"… */
  const uniqueTrashName = useCallback((state: FsState, name: string): string => {
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext  = dot > 0 ? name.slice(dot)    : "";
    let candidate = name;
    let n = 2;
    while (state[`${TRASH_DIR}/${candidate}`]) {
      candidate = `${stem} (${n})${ext}`;
      n += 1;
    }
    return candidate;
  }, []);

  const moveToTrash = useCallback(
    (path: string): string | null => {
      // Refuse to trash the trash itself or things inside it (no-op + log avoidance).
      if (path === TRASH_DIR || path.startsWith(`${TRASH_DIR}/`)) return null;

      // Compute everything inside the functional setter so we always work
      // against the freshest state (not the captured-closure snapshot). The
      // setter's return value is the new state; we use a ref to thread the
      // computed destPath out to the caller. React 18 batches setters but
      // doesn't reorder them within one event handler tick, so origins +
      // fs state land together.
      let destPath: string | null = null;
      update((prev) => {
        const src = prev[path];
        if (!src) return prev;  // entry vanished between check and apply
        const next = { ...prev };
        if (!next[TRASH_DIR]) next[TRASH_DIR] = makeEntry(TRASH_DIR, "dir");
        const newName = uniqueTrashName(next, src.name);
        destPath = `${TRASH_DIR}/${newName}`;
        delete next[path];
        next[destPath] = { ...src, path: destPath, name: newName, modifiedAt: Date.now() };
        if (src.type === "dir") {
          const prefix = path + "/";
          for (const [oldKey, entry] of Object.entries(prev)) {
            if (oldKey.startsWith(prefix)) {
              const tail = oldKey.slice(path.length);  // includes leading "/"
              const newKey = destPath + tail;
              delete next[oldKey];
              next[newKey] = { ...entry, path: newKey };
            }
          }
        }
        return next;
      });
      if (destPath) {
        // Use the functional updater form so we don't fight a stale closure
        // of `trashOrigins` either.
        setTrashOrigins((prev) => {
          const nextOrigins = { ...prev, [destPath as string]: path };
          persistOrigins(nextOrigins);
          return nextOrigins;
        });
      }
      return destPath;
    },
    [update, persistOrigins, uniqueTrashName],
  );

  const restoreFromTrash = useCallback(
    (trashedPath: string): string | null => {
      let resolvedOrigin: string | null = null;
      update((prev) => {
        const origin = trashOrigins[trashedPath];
        const entry = prev[trashedPath];
        // Bail conditions checked against the latest state, not a captured one.
        if (!origin || !entry) return prev;
        if (prev[origin]) return prev;  // destination reoccupied
        resolvedOrigin = origin;
        const next = { ...prev };
        const parts = origin.split("/").filter(Boolean);
        let cur = "";
        for (let i = 0; i < parts.length - 1; i++) {
          cur += "/" + parts[i];
          if (!next[cur]) next[cur] = makeEntry(cur, "dir");
        }
        delete next[trashedPath];
        next[origin] = { ...entry, path: origin, name: baseName(origin), modifiedAt: Date.now() };
        if (entry.type === "dir") {
          const prefix = trashedPath + "/";
          for (const [oldKey, e] of Object.entries(prev)) {
            if (oldKey.startsWith(prefix)) {
              const tail = oldKey.slice(trashedPath.length);
              const newKey = origin + tail;
              delete next[oldKey];
              next[newKey] = { ...e, path: newKey };
            }
          }
        }
        return next;
      });
      if (resolvedOrigin) {
        setTrashOrigins((prev) => {
          const { [trashedPath]: _gone, ...rest } = prev;
          void _gone;
          persistOrigins(rest);
          return rest;
        });
      }
      return resolvedOrigin;
    },
    [update, trashOrigins, persistOrigins],
  );

  const emptyTrash = useCallback((): number => {
    // Count top-level entries directly under .Trash (the ones a user sees in
    // the Trash window — descendants are implicit).
    const topLevel = Object.keys(fs).filter(
      (p) => p.startsWith(`${TRASH_DIR}/`) && !p.slice(TRASH_DIR.length + 1).includes("/"),
    );
    if (topLevel.length === 0) return 0;
    update((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (k.startsWith(`${TRASH_DIR}/`)) delete next[k];
      }
      // Re-ensure the .Trash dir itself survives
      if (!next[TRASH_DIR]) next[TRASH_DIR] = makeEntry(TRASH_DIR, "dir");
      return next;
    });
    setTrashOrigins({});
    persistOrigins({});
    return topLevel.length;
  }, [fs, update, persistOrigins]);

  const getTrashOrigin = useCallback(
    (trashedPath: string): string | null => trashOrigins[trashedPath] ?? null,
    [trashOrigins],
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
        moveToTrash,
        restoreFromTrash,
        emptyTrash,
        getTrashOrigin,
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

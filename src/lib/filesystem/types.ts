export interface FsEntry {
  path: string;       // absolute path, e.g. "/Users/guest/Documents/note.txt"
  name: string;       // basename
  type: "file" | "dir";
  content: string;    // "" for dirs
  size: number;       // bytes
  createdAt: number;  // unix ms
  modifiedAt: number;
  metadata?: {
    kind?: string;
    mime?: string;
    tags?: string[];
    hidden?: boolean;
    readonly?: boolean;
    system?: boolean;
    defaultAppId?: string;
    bundleId?: string;
  };
}

export type FsState = Record<string, FsEntry>; // keyed by path

export interface FileSystemContextValue {
  readDir(path: string): FsEntry[];
  readFile(path: string): string | null;
  writeFile(path: string, content: string): void;
  mkdir(path: string): void;
  remove(path: string): void;
  exists(path: string): boolean;
  rename(oldPath: string, newPath: string): void;
  getEntry(path: string): FsEntry | null;
  /** Move a file or directory to /Users/guest/.Trash, remembering its origin
   *  so it can be restored later. Returns the new path inside .Trash, or null
   *  if the source did not exist. Same-name collisions inside .Trash are
   *  resolved by appending " (2)", " (3)", etc. */
  moveToTrash(path: string): string | null;
  /** Restore an entry from .Trash to the path it was at when trashed.
   *  Returns the destination path on success, or null if the trashed entry
   *  is unknown or the destination is now occupied. */
  restoreFromTrash(trashedPath: string): string | null;
  /** Permanently delete every entry directly under .Trash (and clear the
   *  origin map). Returns the count of top-level entries removed. */
  emptyTrash(): number;
  /** Read the trashed-path → origin-path map (useful for "Put Back"
   *  context-menu labels that show the original location). */
  getTrashOrigin(trashedPath: string): string | null;
}

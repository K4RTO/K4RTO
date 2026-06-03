export interface FsEntry {
  path: string;       // absolute path, e.g. "/Users/guest/Documents/note.txt"
  name: string;       // basename
  type: "file" | "dir";
  content: string;    // "" for dirs
  size: number;       // bytes
  createdAt: number;  // unix ms
  modifiedAt: number;
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
}

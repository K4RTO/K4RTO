"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useT } from "@/contexts/SystemContext";

/**
 * Minesweeper — classic Windows / macOS port of the original Microsoft game.
 *
 * Three difficulty presets matching the canonical Windows numbers:
 *   Beginner     9×9    10 mines
 *   Intermediate 16×16  40 mines
 *   Expert       16×30  99 mines
 *
 * Rules:
 *   - Left-click an unrevealed cell → reveal it. If it's a mine you lose.
 *     If it's empty (zero adjacent mines), recursively flood-reveal neighbors.
 *   - Right-click an unrevealed cell → toggle a flag mark.
 *   - You win when every non-mine cell has been revealed.
 *
 * Best time per difficulty is persisted to localStorage.
 */

type Difficulty = "beginner" | "intermediate" | "expert";
type Status = "ready" | "playing" | "won" | "lost";

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  neighbors: number;   // count of adjacent mines (0 if cell is a mine)
}

interface Preset {
  rows: number;
  cols: number;
  mines: number;
}

const PRESETS: Record<Difficulty, Preset> = {
  beginner:     { rows: 9,  cols: 9,  mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert:       { rows: 16, cols: 30, mines: 99 },
};

const STORAGE_KEY_PREFIX = "minesweeper_best_v1_";

function makeEmptyBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      neighbors: 0,
    })),
  );
}

/** Plant mines randomly, AVOIDING the first-click cell (and ideally its
 *  neighbors so the first click always opens an empty area). This is the
 *  standard "safe first click" behavior — without it the game frequently
 *  ends on click one and feels broken. */
function plantMines(board: Cell[][], firstClickRow: number, firstClickCol: number, mineCount: number) {
  const rows = board.length;
  const cols = board[0].length;
  const forbidden = new Set<string>();
  for (let r = firstClickRow - 1; r <= firstClickRow + 1; r++) {
    for (let c = firstClickCol - 1; c <= firstClickCol + 1; c++) {
      if (r >= 0 && r < rows && c >= 0 && c < cols) forbidden.add(`${r},${c}`);
    }
  }
  // Pool of placeable cells
  const pool: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!forbidden.has(`${r},${c}`)) pool.push([r, c]);
  }
  // Fisher-Yates partial shuffle to pick `mineCount` cells uniformly.
  const limit = Math.min(mineCount, pool.length);
  for (let i = 0; i < limit; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let i = 0; i < limit; i++) {
    const [r, c] = pool[i];
    board[r][c].mine = true;
  }
  // Compute neighbor counts
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) n++;
      }
      board[r][c].neighbors = n;
    }
  }
}

function cloneBoard(b: Cell[][]): Cell[][] {
  return b.map((row) => row.map((c) => ({ ...c })));
}

/** Iterative flood-fill reveal: when a 0-neighbor cell is revealed, reveal
 *  all reachable 0-neighbor cells plus their numbered borders. Recursion
 *  would blow the stack on the Expert (16×30) preset; an explicit queue is
 *  safer and faster. */
function floodReveal(b: Cell[][], startR: number, startC: number) {
  const rows = b.length;
  const cols = b[0].length;
  const queue: [number, number][] = [[startR, startC]];
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const cell = b[r][c];
    if (cell.revealed || cell.flagged || cell.mine) continue;
    cell.revealed = true;
    if (cell.neighbors === 0) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) queue.push([nr, nc]);
      }
    }
  }
}

function checkWin(b: Cell[][]): boolean {
  for (const row of b) for (const c of row) if (!c.mine && !c.revealed) return false;
  return true;
}

function loadBest(diff: Difficulty): number | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY_PREFIX + diff);
    return v ? parseInt(v, 10) : null;
  } catch { return null; }
}

// Number-tile colors lift the look directly from classic Windows Minesweeper
// (blue=1, green=2, red=3, etc) — they're chromatic mnemonics players know.
const NUM_COLORS: Record<number, string> = {
  1: "#1976d2", 2: "#388e3c", 3: "#d32f2f", 4: "#7b1fa2",
  5: "#5d4037", 6: "#0097a7", 7: "#212121", 8: "#616161",
};

export default function Minesweeper(_props: AppComponentProps) {
  const t = useT();
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const preset = PRESETS[difficulty];
  const [board, setBoard] = useState<Cell[][]>(() => makeEmptyBoard(preset.rows, preset.cols));
  const [status, setStatus] = useState<Status>("ready");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [best, setBest] = useState<number | null>(() => loadBest("beginner"));

  // Reset board whenever difficulty changes — also resets the run state.
  useEffect(() => {
    setBoard(makeEmptyBoard(preset.rows, preset.cols));
    setStatus("ready");
    setStartTime(null);
    setElapsed(0);
    setBest(loadBest(difficulty));
  }, [difficulty, preset.rows, preset.cols]);

  // Live elapsed-time counter while the user is mid-game. Cheap: a single
  // 250ms interval reading wall-clock; no timer math needed elsewhere.
  useEffect(() => {
    if (status !== "playing" || startTime === null) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 250);
    return () => clearInterval(id);
  }, [status, startTime]);

  const newGame = useCallback(() => {
    setBoard(makeEmptyBoard(preset.rows, preset.cols));
    setStatus("ready");
    setStartTime(null);
    setElapsed(0);
  }, [preset.rows, preset.cols]);

  const handleReveal = useCallback(
    (r: number, c: number) => {
      if (status === "won" || status === "lost") return;
      setBoard((prev) => {
        // First-click safe area: plant mines now, AVOIDING the clicked cell.
        // Capture the start time as a LOCAL var — the state-level `startTime`
        // is still null at this point in the same handler call, so a first-
        // click-that-immediately-wins (rare on Beginner with massive flood)
        // would otherwise record `elapsed = 0`.
        const working = cloneBoard(prev);
        let runStart = startTime;
        if (status === "ready") {
          plantMines(working, r, c, preset.mines);
          setStatus("playing");
          runStart = Date.now();
          setStartTime(runStart);
        }
        const cell = working[r][c];
        if (cell.revealed || cell.flagged) return prev;
        if (cell.mine) {
          // Reveal every mine on loss so the user can see what they hit.
          for (const row of working) for (const cl of row) if (cl.mine) cl.revealed = true;
          setStatus("lost");
          return working;
        }
        floodReveal(working, r, c);
        if (checkWin(working)) {
          setStatus("won");
          // Persist best time if better than the saved one.
          const finalElapsed = runStart !== null ? Math.floor((Date.now() - runStart) / 1000) : 0;
          const current = loadBest(difficulty);
          if (current === null || finalElapsed < current) {
            try { localStorage.setItem(STORAGE_KEY_PREFIX + difficulty, String(finalElapsed)); } catch {}
            setBest(finalElapsed);
          }
        }
        return working;
      });
    },
    [status, preset.mines, difficulty, startTime],
  );

  const handleFlag = useCallback(
    (r: number, c: number) => {
      if (status === "won" || status === "lost" || status === "ready") return;
      setBoard((prev) => {
        const cell = prev[r][c];
        if (cell.revealed) return prev;
        const next = cloneBoard(prev);
        next[r][c].flagged = !next[r][c].flagged;
        return next;
      });
    },
    [status],
  );

  const flagCount = useMemo(() => {
    let n = 0;
    for (const row of board) for (const c of row) if (c.flagged) n++;
    return n;
  }, [board]);
  const minesRemaining = preset.mines - flagCount;

  // Compute pixel-level cell size from the preset so Expert (16×30) fits the
  // window. Caps at 32 for tiny grids (Beginner shouldn't render giant cells).
  const cellSize = difficulty === "expert" ? 22 : difficulty === "intermediate" ? 26 : 30;

  return (
    <div
      className="h-full flex flex-col select-none overflow-auto"
      style={{ backgroundColor: "#c0c0c0", padding: 16 }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Difficulty toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        {(Object.keys(PRESETS) as Difficulty[]).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid #808080",
              background: difficulty === d ? "#fff" : "#dcdcdc",
              color: "#000",
              cursor: "pointer",
            }}
          >
            {t(`minesweeper.diff.${d}`)}
          </button>
        ))}
      </div>

      {/* Score panel — mines remaining, smiley reset, timer (classic LED look) */}
      <div
        className="flex items-center justify-between mb-3 flex-shrink-0"
        style={{
          background: "#c0c0c0",
          border: "3px inset #808080",
          padding: "6px 10px",
        }}
      >
        <LedReadout value={minesRemaining} />
        <button
          onClick={newGame}
          style={{
            fontSize: 22,
            width: 36,
            height: 36,
            background: "#dcdcdc",
            border: "2px outset #fff",
            cursor: "pointer",
            lineHeight: 1,
          }}
          title={t("minesweeper.newGame")}
          aria-label={t("minesweeper.newGame")}
        >
          {status === "lost" ? "😵" : status === "won" ? "😎" : "🙂"}
        </button>
        <LedReadout value={Math.min(elapsed, 999)} />
      </div>

      {/* Grid */}
      <div
        className="inline-block"
        style={{
          alignSelf: "center",
          border: "3px inset #808080",
          background: "#808080",
          padding: 2,
        }}
      >
        {board.map((row, r) => (
          <div key={r} className="flex">
            {row.map((cell, c) => (
              <CellButton
                key={c}
                cell={cell}
                size={cellSize}
                onReveal={() => handleReveal(r, c)}
                onFlag={() => handleFlag(r, c)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Footer hint + best time */}
      <div className="mt-3 flex items-center justify-between text-[11px] flex-shrink-0" style={{ color: "#000" }}>
        <span>{t("minesweeper.hint")}</span>
        {best !== null && (
          <span style={{ fontWeight: 600 }}>
            {t("minesweeper.best", { n: String(best) })}
          </span>
        )}
      </div>
    </div>
  );
}

/** Classic Minesweeper LED display — three-digit, leading zeros, red on black. */
function LedReadout({ value }: { value: number }) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const display = sign + abs.toString().padStart(sign ? 2 : 3, "0");
  return (
    <span
      style={{
        background: "#000",
        color: "#ff3333",
        fontFamily: "'Courier New', monospace",
        fontSize: 22,
        fontWeight: 700,
        padding: "2px 8px",
        minWidth: 64,
        textAlign: "center",
        letterSpacing: "0.05em",
        border: "1px solid #404040",
      }}
    >
      {display}
    </span>
  );
}

interface CellButtonProps {
  cell: Cell;
  size: number;
  onReveal: () => void;
  onFlag: () => void;
}

function CellButton({ cell, size, onReveal, onFlag }: CellButtonProps) {
  let content: React.ReactNode = "";
  let bg = "#c0c0c0";
  let color = "#000";
  let border: string = "2px outset #fff";

  if (cell.revealed) {
    bg = cell.mine ? "#ff5959" : "#bdbdbd";
    border = "1px solid #808080";
    if (cell.mine) {
      content = "💣";
    } else if (cell.neighbors > 0) {
      content = cell.neighbors;
      color = NUM_COLORS[cell.neighbors] ?? "#000";
    }
  } else if (cell.flagged) {
    content = "🚩";
  }

  return (
    <button
      onClick={onReveal}
      onContextMenu={(e) => { e.preventDefault(); onFlag(); }}
      style={{
        width: size,
        height: size,
        background: bg,
        color,
        border,
        fontSize: size < 24 ? 11 : 14,
        fontWeight: 700,
        padding: 0,
        lineHeight: 1,
        cursor: cell.revealed ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {content}
    </button>
  );
}

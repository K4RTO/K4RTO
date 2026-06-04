"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useT } from "@/contexts/SystemContext";

/**
 * 2048 — classic merge-the-tiles puzzle.
 *
 * 4×4 grid; arrow keys (or WASD) slide every tile in a direction. When two
 * tiles with the same value collide they merge into one tile worth their sum.
 * Each move spawns a new 2 (90%) or 4 (10%) in a random empty cell. Goal is
 * to reach 2048 (but the game continues after for the high-score chasers).
 *
 * State machine:
 *   playing  → moves change board, score, possibly transition to won/over
 *   won      → reached 2048 first time; user can keep playing
 *   over     → no legal moves remain
 *
 * Best score persists across sessions via localStorage so portfolio visitors
 * have something to chase on repeat visits.
 */

type Board = number[][];
type Direction = "up" | "down" | "left" | "right";
type Status = "playing" | "won" | "over";

const SIZE = 4;
const STORAGE_KEY = "game2048_best_v1";

// Tile colors mirror the original Gabriele Cirulli palette so the game is
// instantly recognizable. Higher tiles cap at the 2048+ orange.
const TILE_COLORS: Record<number, { bg: string; fg: string }> = {
  0:    { bg: "rgba(238, 228, 218, 0.18)", fg: "transparent" },
  2:    { bg: "#eee4da", fg: "#776e65" },
  4:    { bg: "#ede0c8", fg: "#776e65" },
  8:    { bg: "#f2b179", fg: "#f9f6f2" },
  16:   { bg: "#f59563", fg: "#f9f6f2" },
  32:   { bg: "#f67c5f", fg: "#f9f6f2" },
  64:   { bg: "#f65e3b", fg: "#f9f6f2" },
  128:  { bg: "#edcf72", fg: "#f9f6f2" },
  256:  { bg: "#edcc61", fg: "#f9f6f2" },
  512:  { bg: "#edc850", fg: "#f9f6f2" },
  1024: { bg: "#edc53f", fg: "#f9f6f2" },
  2048: { bg: "#edc22e", fg: "#f9f6f2" },
};
function tileColor(v: number) {
  return TILE_COLORS[v] ?? { bg: "#3c3a32", fg: "#f9f6f2" };
}

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function clone(b: Board): Board {
  return b.map((row) => row.slice());
}

function emptyCells(b: Board): [number, number][] {
  const out: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (b[r][c] === 0) out.push([r, c]);
  return out;
}

function spawnTile(b: Board): Board {
  const cells = emptyCells(b);
  if (cells.length === 0) return b;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  const next = clone(b);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function initialBoard(): Board {
  return spawnTile(spawnTile(emptyBoard()));
}

/** Slide + merge a single row leftward. Returns the new row and the score
 *  gained from this row's merges. */
function slideRow(row: number[]): { row: number[]; gained: number } {
  const compact = row.filter((v) => v !== 0);
  const merged: number[] = [];
  let gained = 0;
  for (let i = 0; i < compact.length; i++) {
    if (i + 1 < compact.length && compact[i] === compact[i + 1]) {
      const m = compact[i] * 2;
      merged.push(m);
      gained += m;
      i++;
    } else {
      merged.push(compact[i]);
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { row: merged, gained };
}

/** Generic move — rotate the board so that the requested direction becomes
 *  "left", slide each row, then rotate back. */
function move(b: Board, dir: Direction): { board: Board; gained: number; changed: boolean } {
  let work = clone(b);
  // Rotate so that we always slide left
  if (dir === "up") work = rotateLeft(work);
  else if (dir === "down") work = rotateRight(work);
  else if (dir === "right") work = work.map((r) => r.slice().reverse());

  let gained = 0;
  const next: Board = work.map((row) => {
    const r = slideRow(row);
    gained += r.gained;
    return r.row;
  });

  if (dir === "up") {
    return { board: rotateRight(next), gained, changed: !boardsEqual(b, rotateRight(next)) };
  }
  if (dir === "down") {
    return { board: rotateLeft(next), gained, changed: !boardsEqual(b, rotateLeft(next)) };
  }
  if (dir === "right") {
    const reversed = next.map((r) => r.slice().reverse());
    return { board: reversed, gained, changed: !boardsEqual(b, reversed) };
  }
  return { board: next, gained, changed: !boardsEqual(b, next) };
}

function rotateLeft(b: Board): Board {
  const out: Board = emptyBoard();
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) out[SIZE - 1 - c][r] = b[r][c];
  return out;
}
function rotateRight(b: Board): Board {
  const out: Board = emptyBoard();
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) out[c][SIZE - 1 - r] = b[r][c];
  return out;
}

function boardsEqual(a: Board, b: Board): boolean {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (a[r][c] !== b[r][c]) return false;
  return true;
}

function hasAnyMove(b: Board): boolean {
  if (emptyCells(b).length > 0) return true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = b[r][c];
      if (c + 1 < SIZE && b[r][c + 1] === v) return true;
      if (r + 1 < SIZE && b[r + 1][c] === v) return true;
    }
  }
  return false;
}

function hasWon(b: Board): boolean {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (b[r][c] >= 2048) return true;
  return false;
}

function loadBest(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch { return 0; }
}

export default function Game2048(_props: AppComponentProps) {
  const t = useT();
  const [board, setBoard] = useState<Board>(() => initialBoard());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(loadBest);
  const [status, setStatus] = useState<Status>("playing");
  // Distinguishes "won + kept playing" from "won (first time)" so the modal
  // doesn't keep re-appearing after the user dismisses it.
  const [keepPlaying, setKeepPlaying] = useState(false);

  const newGame = useCallback(() => {
    setBoard(initialBoard());
    setScore(0);
    setStatus("playing");
    setKeepPlaying(false);
  }, []);

  // Apply a move. Reflects in board + score + status; persists new best to LS.
  // Uses functional setters throughout so rapid keypresses (key-repeat) don't
  // miss best-score updates due to a stale `best` closure inside the nested
  // setState updater.
  const apply = useCallback(
    (dir: Direction) => {
      if (status === "over") return;
      setBoard((prev) => {
        const result = move(prev, dir);
        if (!result.changed) return prev;
        const next = spawnTile(result.board);
        setScore((s) => {
          const newScore = s + result.gained;
          // Functional setBest — always reads the latest committed `best`,
          // not a captured-closure snapshot from when `apply` was built.
          setBest((prevBest) => {
            if (newScore > prevBest) {
              try { localStorage.setItem(STORAGE_KEY, String(newScore)); } catch {}
              return newScore;
            }
            return prevBest;
          });
          return newScore;
        });
        if (!keepPlaying && status === "playing" && hasWon(next)) {
          setStatus("won");
        } else if (!hasAnyMove(next)) {
          setStatus("over");
        }
        return next;
      });
    },
    [status, keepPlaying],
  );

  // Keyboard input — global keydown so the game responds even when the inner
  // grid hasn't grabbed focus. We don't preventDefault on every key — only on
  // arrow / WASD so browser scroll and other shortcuts still work.
  const applyRef = useRef(apply);
  useEffect(() => { applyRef.current = apply; }, [apply]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      let dir: Direction | null = null;
      if (e.key === "ArrowUp" || k === "w") dir = "up";
      else if (e.key === "ArrowDown" || k === "s") dir = "down";
      else if (e.key === "ArrowLeft" || k === "a") dir = "left";
      else if (e.key === "ArrowRight" || k === "d") dir = "right";
      if (dir) {
        e.preventDefault();
        applyRef.current(dir);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Touch/swipe — basic threshold detection. Useful on trackpad gestures too.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t0 = e.touches[0];
    touchStartRef.current = { x: t0.clientX, y: t0.clientY };
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t1 = e.changedTouches[0];
    const dx = t1.clientX - start.x;
    const dy = t1.clientY - start.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < 24) return;
    if (ax > ay) apply(dx > 0 ? "right" : "left");
    else         apply(dy > 0 ? "down" : "up");
  }, [apply]);

  const dismissWonModal = useCallback(() => {
    setKeepPlaying(true);
    setStatus("playing");
  }, []);

  // Flatten the board into render-friendly tiles. We give each tile a stable
  // key from (row,col) so the grid doesn't churn on every move; smarter
  // animation would track tile identity through merges, but for portfolio
  // purposes the simple version reads fine.
  const tiles = useMemo(() => {
    const out: { r: number; c: number; v: number }[] = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) out.push({ r, c, v: board[r][c] });
    return out;
  }, [board]);

  return (
    <div
      className="h-full flex flex-col select-none overflow-hidden"
      style={{ backgroundColor: "#faf8ef", padding: 16 }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header: title + scores + new game */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div style={{ fontSize: 38, fontWeight: 800, color: "#776e65", lineHeight: 1 }}>2048</div>
        <div className="flex items-center gap-2">
          <ScorePill label={t("game2048.score")} value={score} />
          <ScorePill label={t("game2048.best")} value={best} />
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div style={{ fontSize: 12, color: "#776e65", lineHeight: 1.4, maxWidth: 260 }}>
          {t("game2048.hint")}
        </div>
        <button
          onClick={newGame}
          style={{
            background: "#8f7a66",
            color: "#f9f6f2",
            fontSize: 13,
            fontWeight: 700,
            padding: "8px 14px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
          }}
        >
          {t("game2048.newGame")}
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center">
        <div
          style={{
            position: "relative",
            background: "#bbada0",
            borderRadius: 8,
            padding: 8,
            display: "grid",
            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${SIZE}, 1fr)`,
            gap: 8,
            width: "min(100%, 360px)",
            aspectRatio: "1 / 1",
          }}
        >
          {tiles.map(({ r, c, v }) => {
            const color = tileColor(v);
            const fs = v >= 1024 ? 22 : v >= 128 ? 26 : v >= 16 ? 30 : 34;
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  background: color.bg,
                  color: color.fg,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: fs,
                  fontWeight: 800,
                  transition: "background-color 0.12s ease",
                }}
              >
                {v > 0 ? v : ""}
              </div>
            );
          })}

          {/* Win overlay — dismissable, then keep playing */}
          {status === "won" && (
            <Overlay
              title={t("game2048.youWin")}
              cta={t("game2048.keepPlaying")}
              secondaryCta={t("game2048.newGame")}
              onCta={dismissWonModal}
              onSecondary={newGame}
            />
          )}
          {/* Game over overlay — only path forward is new game */}
          {status === "over" && (
            <Overlay
              title={t("game2048.gameOver")}
              cta={t("game2048.tryAgain")}
              onCta={newGame}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "#bbada0",
        color: "#f9f6f2",
        padding: "6px 16px",
        borderRadius: 4,
        minWidth: 70,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", opacity: 0.75 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function Overlay({
  title,
  cta,
  secondaryCta,
  onCta,
  onSecondary,
}: {
  title: string;
  cta: string;
  secondaryCta?: string;
  onCta: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(238, 228, 218, 0.75)",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        backdropFilter: "blur(2px)",
      }}
    >
      <div style={{ fontSize: 40, fontWeight: 800, color: "#776e65", textAlign: "center" }}>{title}</div>
      <div className="flex gap-2">
        <button
          onClick={onCta}
          style={{
            background: "#8f7a66",
            color: "#f9f6f2",
            fontSize: 14,
            fontWeight: 700,
            padding: "10px 18px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
          }}
        >
          {cta}
        </button>
        {secondaryCta && onSecondary && (
          <button
            onClick={onSecondary}
            style={{
              background: "rgba(143, 122, 102, 0.2)",
              color: "#776e65",
              fontSize: 14,
              fontWeight: 700,
              padding: "10px 18px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            {secondaryCta}
          </button>
        )}
      </div>
    </div>
  );
}

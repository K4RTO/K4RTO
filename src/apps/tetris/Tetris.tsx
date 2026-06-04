"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useT } from "@/contexts/SystemContext";

/**
 * Tetris — classic 10×20 falling-block puzzle.
 *
 * Implementation notes:
 *  - 7-bag randomizer: each "bag" is a shuffled copy of the 7 tetrominoes, so
 *    the player is guaranteed to see every piece exactly once per 7 spawns.
 *    Vastly better feel than naive uniform-random.
 *  - SRS (Super Rotation System): pieces rotate by transforming a 4×4 (I) or
 *    3×3 (J/L/S/Z/T) cell grid. Wall kicks not implemented (would add ~80
 *    lines for SRS kick tables); rotation just fails if the new position
 *    collides, which is acceptable for an MVP and rarely felt.
 *  - Locking: when soft-drop or gravity can't move the piece down, it locks
 *    into the board on the NEXT tick. Lines are scanned and cleared, then a
 *    new piece spawns. Top-out (spawn collision) ends the game.
 *  - Scoring follows the standard guidelines:
 *      single 100, double 300, triple 500, tetris 800 — all × (level + 1)
 *      soft drop +1/cell, hard drop +2/cell
 *  - Level rises every 10 cleared lines; tick interval shortens accordingly.
 *  - All state lives in React; the game loop is a single setTimeout that
 *    reschedules itself, so pause / level-change / mode-change don't have to
 *    fight an interval lifecycle.
 */

type Cell = string | null;          // color string, or null = empty
type Board = Cell[][];
type Piece = {
  shape: number[][];                // 0/1 grid of the rotated piece
  color: string;
  type: TetrominoKey;
  x: number;
  y: number;
};
type TetrominoKey = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
type Status = "playing" | "paused" | "over";

const COLS = 10;
const ROWS = 20;
const STORAGE_KEY = "tetris_best_v1";

// Canonical tetromino base shapes (rotation 0). Colors mirror the Tetris
// Company guideline palette so each piece is instantly recognizable.
const TETROMINOES: Record<TetrominoKey, { shape: number[][]; color: string }> = {
  I: { color: "#06b6d4", shape: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]},
  O: { color: "#eab308", shape: [
    [1, 1],
    [1, 1],
  ]},
  T: { color: "#a855f7", shape: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ]},
  S: { color: "#22c55e", shape: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ]},
  Z: { color: "#ef4444", shape: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ]},
  J: { color: "#3b82f6", shape: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ]},
  L: { color: "#f97316", shape: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ]},
};
const ALL_PIECES: TetrominoKey[] = ["I", "O", "T", "S", "Z", "J", "L"];

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

/** Fisher-Yates shuffle, returning a new array. */
function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Rotate a square 2D grid 90° clockwise. */
function rotateCW(grid: number[][]): number[][] {
  const n = grid.length;
  const out = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[c][n - 1 - r] = grid[r][c];
  return out;
}
function rotateCCW(grid: number[][]): number[][] {
  return rotateCW(rotateCW(rotateCW(grid)));
}

function makePiece(type: TetrominoKey): Piece {
  const { shape, color } = TETROMINOES[type];
  // Spawn centered horizontally at y=0.
  return {
    shape: shape.map((row) => row.slice()),
    color,
    type,
    x: Math.floor((COLS - shape.length) / 2),
    y: 0,
  };
}

/** Does the piece (at its proposed x/y/shape) fit on the board without
 *  overlapping locked cells or running off the edges? */
function fits(board: Board, piece: Piece): boolean {
  const { shape, x, y } = piece;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const bx = x + c;
      const by = y + r;
      if (bx < 0 || bx >= COLS || by >= ROWS) return false;
      if (by >= 0 && board[by][bx] !== null) return false;
    }
  }
  return true;
}

/** Stamp a piece into the board (immutable copy). */
function lock(board: Board, piece: Piece): Board {
  const next = board.map((row) => row.slice());
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        const bx = piece.x + c;
        const by = piece.y + r;
        if (by >= 0 && by < ROWS) next[by][bx] = piece.color;
      }
    }
  }
  return next;
}

/** Scan the board for full rows, remove them, and shift everything above
 *  down. Returns the cleaned board AND the number of lines that were
 *  cleared (so the caller can score). */
function clearLines(board: Board): { board: Board; cleared: number } {
  const survivors: Cell[][] = [];
  let cleared = 0;
  for (const row of board) {
    if (row.every((c) => c !== null)) cleared++;
    else survivors.push(row);
  }
  while (survivors.length < ROWS) survivors.unshift(Array<Cell>(COLS).fill(null));
  return { board: survivors, cleared };
}

/** Standard guidelines: 1/2/3/4 line clears worth 100/300/500/800, scaled
 *  by current level (level + 1). */
const LINE_SCORES = [0, 100, 300, 500, 800];

function loadBest(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10) || 0;
  } catch { return 0; }
}

/** Tick interval (ms) for a given level. Classic NES curve roughly: starts
 *  at 800ms, halves by level 9, floors at ~80ms by level 19. */
function tickIntervalForLevel(level: number): number {
  if (level <= 8) return 800 - level * 80;
  if (level <= 12) return 100;
  if (level <= 18) return 80;
  return 60;
}

export default function Tetris(_props: AppComponentProps) {
  const t = useT();
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [bag, setBag] = useState<TetrominoKey[]>(() => shuffle(ALL_PIECES));
  const [nextQueue, setNextQueue] = useState<TetrominoKey[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [lines, setLines] = useState(0);
  const [best, setBest] = useState(loadBest);
  const [status, setStatus] = useState<Status>("playing");

  // Refs that the game loop reads — avoids recomputing the loop's deps on
  // every render-causing state change.
  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const statusRef = useRef(status);
  const levelRef = useRef(level);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { pieceRef.current = piece; }, [piece]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { levelRef.current = level; }, [level]);

  /** Pull the next piece from the 7-bag, refilling when empty. */
  const drawNext = useCallback((currentBag: TetrominoKey[]): { piece: Piece; bag: TetrominoKey[]; queue: TetrominoKey[] } => {
    let b = currentBag.slice();
    if (b.length < 4) b = b.concat(shuffle(ALL_PIECES));
    const type = b.shift()!;
    return { piece: makePiece(type), bag: b, queue: b.slice(0, 3) };
  }, []);

  // Spawn the very first piece on mount.
  useEffect(() => {
    if (piece === null && status === "playing") {
      const { piece: p, bag: b, queue } = drawNext(bag);
      setPiece(p);
      setBag(b);
      setNextQueue(queue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Try to spawn a new piece. If it collides immediately, it's a top-out. */
  const spawnPiece = useCallback(() => {
    const { piece: p, bag: b, queue } = drawNext(bag);
    if (!fits(boardRef.current, p)) {
      setStatus("over");
      // Persist best score if this run beat the previous record.
      setBest((prev) => {
        if (score > prev) {
          try { localStorage.setItem(STORAGE_KEY, String(score)); } catch {}
          return score;
        }
        return prev;
      });
      return;
    }
    setPiece(p);
    setBag(b);
    setNextQueue(queue);
  }, [bag, drawNext, score]);

  /** Move the active piece by (dx, dy) and return whether the move stuck. */
  const tryMove = useCallback((dx: number, dy: number) => {
    const p = pieceRef.current;
    if (!p) return false;
    const candidate = { ...p, x: p.x + dx, y: p.y + dy };
    if (fits(boardRef.current, candidate)) {
      setPiece(candidate);
      return true;
    }
    return false;
  }, []);

  /** Lock the current piece into the board, scan for line clears, score,
   *  bump level, and spawn the next piece. */
  const lockAndScore = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    const locked = lock(boardRef.current, p);
    const { board: cleaned, cleared } = clearLines(locked);
    setBoard(cleaned);
    if (cleared > 0) {
      setScore((s) => s + LINE_SCORES[cleared] * (levelRef.current + 1));
      setLines((prev) => {
        const next = prev + cleared;
        const newLevel = Math.floor(next / 10);
        if (newLevel > levelRef.current) setLevel(newLevel);
        return next;
      });
    }
    setPiece(null);
    // Spawning is delegated to the effect below, which fires whenever piece becomes null.
  }, []);

  /** Move down one cell; if blocked, lock + spawn. Called by gravity tick and soft-drop. */
  const stepDown = useCallback(() => {
    if (!tryMove(0, 1)) lockAndScore();
  }, [tryMove, lockAndScore]);

  // Auto-spawn whenever piece is null and we're still playing — keeps the
  // lockAndScore / topout / first-spawn paths uniform.
  useEffect(() => {
    if (piece === null && status === "playing") {
      spawnPiece();
    }
  }, [piece, status, spawnPiece]);

  // Gravity timer — self-rescheduling setTimeout so level changes pick up the
  // new interval naturally without needing to tear down a setInterval.
  useEffect(() => {
    if (status !== "playing") return;
    const id = setTimeout(() => {
      stepDown();
    }, tickIntervalForLevel(level));
    return () => clearTimeout(id);
  }, [board, piece, status, level, stepDown]);

  const rotate = useCallback((dir: "cw" | "ccw") => {
    const p = pieceRef.current;
    if (!p) return;
    // O piece rotation is a no-op (it's symmetric); skipping avoids a
    // pointless setPiece on every Up press.
    if (p.type === "O") return;
    const newShape = dir === "cw" ? rotateCW(p.shape) : rotateCCW(p.shape);
    const candidate = { ...p, shape: newShape };
    if (fits(boardRef.current, candidate)) setPiece(candidate);
  }, []);

  const hardDrop = useCallback(() => {
    let p = pieceRef.current;
    if (!p) return;
    let dropped = 0;
    while (fits(boardRef.current, { ...p, y: p.y + 1 })) {
      p = { ...p, y: p.y + 1 };
      dropped++;
    }
    setPiece(p);
    if (dropped > 0) setScore((s) => s + dropped * 2);
    // Lock on the same tick — hard drop is committed instantly in standard rules.
    setTimeout(() => lockAndScore(), 0);
  }, [lockAndScore]);

  const newGame = useCallback(() => {
    setBoard(emptyBoard());
    setBag(shuffle(ALL_PIECES));
    setNextQueue([]);
    setScore(0);
    setLevel(0);
    setLines(0);
    setStatus("playing");
    setPiece(null);
  }, []);

  // Keyboard input — global, so users don't have to focus the canvas first.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "p" || e.key === "P") {
        if (statusRef.current === "playing") { e.preventDefault(); setStatus("paused"); return; }
        if (statusRef.current === "paused")  { e.preventDefault(); setStatus("playing"); return; }
      }
      if (statusRef.current !== "playing") return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); tryMove(-1, 0); }
      else if (e.key === "ArrowRight") { e.preventDefault(); tryMove(1, 0); }
      else if (e.key === "ArrowDown")  { e.preventDefault(); if (tryMove(0, 1)) setScore((s) => s + 1); }
      else if (e.key === "ArrowUp" || e.key === "x" || e.key === "X") { e.preventDefault(); rotate("cw"); }
      else if (e.key === "z" || e.key === "Z") { e.preventDefault(); rotate("ccw"); }
      else if (e.key === "Shift" || e.key === " ") { e.preventDefault(); hardDrop(); }
      // Space is handled above as pause when paused, hard-drop while playing.
      else if (e.key === " " && statusRef.current === "playing") { e.preventDefault(); hardDrop(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryMove, rotate, hardDrop]);

  // Render-time board: actual board + the active piece overlaid, for the grid
  // displayed to the user. Doesn't mutate state.
  const renderedBoard = useMemo<Board>(() => {
    const out = board.map((row) => row.slice());
    if (piece) {
      for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
          if (!piece.shape[r][c]) continue;
          const bx = piece.x + c;
          const by = piece.y + r;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
            out[by][bx] = piece.color;
          }
        }
      }
    }
    return out;
  }, [board, piece]);

  return (
    <div className="h-full flex select-none overflow-hidden" style={{ backgroundColor: "#1a1a2e", padding: 24, color: "#e6edf3", gap: 18 }}>
      {/* Board (left) */}
      <div
        style={{
          background: "#0f0f1a",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          padding: 6,
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: 1,
          aspectRatio: `${COLS} / ${ROWS}`,
          height: "100%",
          maxHeight: "100%",
          position: "relative",
        }}
      >
        {renderedBoard.flat().map((cell, i) => (
          <div
            key={i}
            style={{
              background: cell ?? "#15152a",
              borderRadius: 2,
              boxShadow: cell ? "inset 0 0 0 1px rgba(255,255,255,0.15)" : undefined,
            }}
          />
        ))}
        {status === "paused" && (
          <Overlay title={t("tetris.paused")} subtitle={t("tetris.pauseHint")} />
        )}
        {status === "over" && (
          <Overlay
            title={t("tetris.gameOver")}
            cta={t("tetris.tryAgain")}
            onCta={newGame}
          />
        )}
      </div>

      {/* Side panel: score / level / next / hint */}
      <div className="flex flex-col gap-3" style={{ minWidth: 130 }}>
        <SidePill label={t("tetris.score")} value={score} />
        <SidePill label={t("tetris.best")}  value={best} />
        <SidePill label={t("tetris.level")} value={level} />
        <SidePill label={t("tetris.lines")} value={lines} />

        {/* Next preview — only renders if we have at least one queued. */}
        {nextQueue.length > 0 && (
          <div
            style={{
              background: "#15152a",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              padding: 10,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(230,237,243,0.45)", marginBottom: 8 }}>
              {t("tetris.next").toUpperCase()}
            </div>
            <NextPreview type={nextQueue[0]} />
          </div>
        )}

        <button
          onClick={newGame}
          style={{
            marginTop: 6,
            background: "#a855f7",
            color: "white",
            fontSize: 13,
            fontWeight: 700,
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
          }}
        >
          {t("tetris.newGame")}
        </button>

        <div style={{ fontSize: 11, color: "rgba(230,237,243,0.55)", lineHeight: 1.55, marginTop: 4 }}>
          {t("tetris.hint")}
        </div>
      </div>
    </div>
  );
}

function SidePill({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#15152a", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(230,237,243,0.45)" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function NextPreview({ type }: { type: TetrominoKey }) {
  const { shape, color } = TETROMINOES[type];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${shape.length}, 1fr)`, gap: 1 }}>
      {shape.flat().map((v, i) => (
        <div
          key={i}
          style={{
            aspectRatio: "1 / 1",
            background: v ? color : "transparent",
            borderRadius: 2,
            boxShadow: v ? "inset 0 0 0 1px rgba(255,255,255,0.18)" : undefined,
          }}
        />
      ))}
    </div>
  );
}

function Overlay({
  title,
  subtitle,
  cta,
  onCta,
}: {
  title: string;
  subtitle?: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(15, 15, 30, 0.85)",
        backdropFilter: "blur(3px)",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 800, color: "#e6edf3" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: "rgba(230,237,243,0.6)" }}>{subtitle}</div>}
      {cta && onCta && (
        <button
          onClick={onCta}
          style={{
            background: "#a855f7",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            padding: "10px 20px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            marginTop: 6,
          }}
        >
          {cta}
        </button>
      )}
    </div>
  );
}

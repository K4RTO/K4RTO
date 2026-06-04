"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppComponentProps } from "@/apps/registry";
import { useT } from "@/contexts/SystemContext";

/**
 * Snake — classic grid-based snake game.
 *
 * 20×20 board. Arrow keys / WASD turn the snake. Eat the food, grow by one
 * segment, score +1. Hit a wall or yourself → game over. Space toggles pause.
 *
 * Implementation notes:
 *  - Game loop is a single `setInterval` that ticks every TICK_MS. Direction
 *    input is buffered into `pendingDirRef` so a fast double-key (e.g. right
 *    then immediately down to cut a corner) doesn't get dropped between ticks.
 *  - The snake is stored as an array of {x,y} segments, head at index 0.
 *  - Food placement re-rolls until it finds a cell not occupied by the snake.
 *    With a 20×20 board and at most ~400 segments, in the worst case (snake
 *    fills board) the loop would spin — we cap with a fallback that scans the
 *    full board for the first empty cell.
 *  - 180° turns (right→left etc.) are silently ignored because they would
 *    instantly self-collide.
 */

type Point = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";
type Status = "playing" | "paused" | "over";

const GRID = 20;          // 20×20 cells
const TICK_MS = 110;      // game speed — lower is faster
const STORAGE_KEY = "snake_best_v1";

function opposite(a: Direction, b: Direction): boolean {
  return (a === "up" && b === "down") || (a === "down" && b === "up")
      || (a === "left" && b === "right") || (a === "right" && b === "left");
}

function startSnake(): Point[] {
  // Three-segment snake horizontally centered, heading right.
  const cy = Math.floor(GRID / 2);
  return [
    { x: 6, y: cy },
    { x: 5, y: cy },
    { x: 4, y: cy },
  ];
}

function randomFreeCell(snake: Point[]): Point {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
  // Try up to GRID * GRID random picks first — usually finds a cell instantly.
  for (let i = 0; i < GRID * GRID; i++) {
    const x = Math.floor(Math.random() * GRID);
    const y = Math.floor(Math.random() * GRID);
    if (!occupied.has(`${x},${y}`)) return { x, y };
  }
  // Fallback scan for the (effectively-full) snake case so we never loop forever.
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!occupied.has(`${x},${y}`)) return { x, y };
    }
  }
  // Board is 100% covered (player has perfected the game). Return head pos.
  return snake[0];
}

function loadBest(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10) || 0;
  } catch { return 0; }
}

export default function Snake(_props: AppComponentProps) {
  const t = useT();
  const [snake, setSnake] = useState<Point[]>(() => startSnake());
  const [food, setFood] = useState<Point>(() => randomFreeCell(startSnake()));
  const [direction, setDirection] = useState<Direction>("right");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(loadBest);
  const [status, setStatus] = useState<Status>("playing");

  // Latest committed direction — the tick uses this to advance the head.
  // Pending direction is what the user pressed since the last tick; the tick
  // adopts it iff it's not a 180° reversal of the current heading.
  const dirRef = useRef<Direction>(direction);
  useEffect(() => { dirRef.current = direction; }, [direction]);
  const pendingDirRef = useRef<Direction | null>(null);

  // Food position via ref so the tick effect doesn't restart every time food
  // moves — restarting the interval caused a perceptible 110ms hesitation
  // after eating, since the new interval would wait its full tick before
  // firing instead of preserving whatever was left of the current tick.
  const foodRef = useRef(food);
  useEffect(() => { foodRef.current = food; }, [food]);

  const newGame = useCallback(() => {
    const s = startSnake();
    setSnake(s);
    setFood(randomFreeCell(s));
    setDirection("right");
    pendingDirRef.current = null;
    setScore(0);
    setStatus("playing");
  }, []);

  // Game tick — only runs while status === "playing". Pause / over freezes it.
  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => {
      setSnake((prev) => {
        // Apply pending direction if it's a legal turn.
        let nextDir = dirRef.current;
        const pending = pendingDirRef.current;
        if (pending && !opposite(pending, dirRef.current)) {
          nextDir = pending;
          dirRef.current = pending;
          setDirection(pending);
        }
        pendingDirRef.current = null;

        const head = prev[0];
        const dx = nextDir === "left" ? -1 : nextDir === "right" ? 1 : 0;
        const dy = nextDir === "up" ? -1 : nextDir === "down" ? 1 : 0;
        const newHead: Point = { x: head.x + dx, y: head.y + dy };

        // Wall collision.
        if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
          setStatus("over");
          return prev;
        }
        // Self collision — check against everything except the tail tip (which
        // will move out of the way this tick) UNLESS we're growing this tick.
        const currentFood = foodRef.current;
        const willGrow = newHead.x === currentFood.x && newHead.y === currentFood.y;
        const bodyToCheck = willGrow ? prev : prev.slice(0, prev.length - 1);
        if (bodyToCheck.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
          setStatus("over");
          return prev;
        }

        const newSnake = [newHead, ...prev];
        if (!willGrow) newSnake.pop();
        else {
          setScore((s) => {
            const ns = s + 1;
            setBest((b) => {
              if (ns > b) {
                try { localStorage.setItem(STORAGE_KEY, String(ns)); } catch {}
                return ns;
              }
              return b;
            });
            return ns;
          });
          setFood(randomFreeCell(newSnake));
        }
        return newSnake;
      });
    }, TICK_MS);
    return () => clearInterval(id);
    // Intentionally NOT depending on food — food changes go through foodRef
    // so the interval keeps its current cadence instead of being torn down
    // and restarted on every eat.
  }, [status]);

  // Keyboard input — buffer into pendingDirRef so fast double-presses don't
  // get dropped between ticks.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      let dir: Direction | null = null;
      if (e.key === "ArrowUp" || k === "w") dir = "up";
      else if (e.key === "ArrowDown" || k === "s") dir = "down";
      else if (e.key === "ArrowLeft" || k === "a") dir = "left";
      else if (e.key === "ArrowRight" || k === "d") dir = "right";
      else if (k === " " || k === "p") {
        e.preventDefault();
        setStatus((cur) => cur === "playing" ? "paused" : cur === "paused" ? "playing" : cur);
        return;
      }
      if (dir) {
        e.preventDefault();
        pendingDirRef.current = dir;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Memo the snake-cells lookup so the render loop doesn't re-scan the snake
  // array for every cell of the 20×20 grid.
  const snakeIndex = useMemo(() => {
    const m = new Map<string, number>();
    snake.forEach((seg, i) => m.set(`${seg.x},${seg.y}`, i));
    return m;
  }, [snake]);

  return (
    <div
      className="h-full flex flex-col select-none overflow-hidden"
      style={{ backgroundColor: "#0f1419", padding: 28, color: "#e6edf3" }}
    >
      {/* Header: title + scores + new game */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{t("snake.title")}</div>
        <div className="flex items-center gap-3">
          <ScorePill label={t("snake.score")} value={score} />
          <ScorePill label={t("snake.best")} value={best} />
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 flex-shrink-0 text-[12px]">
        <span style={{ color: "rgba(230, 237, 243, 0.6)" }}>{t("snake.hint")}</span>
        <button
          onClick={newGame}
          style={{
            background: "#238636",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 14px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
          }}
        >
          {t("snake.newGame")}
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center">
        <div
          style={{
            position: "relative",
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 8,
            padding: 4,
            display: "grid",
            gridTemplateColumns: `repeat(${GRID}, 1fr)`,
            gridTemplateRows: `repeat(${GRID}, 1fr)`,
            gap: 1,
            width: "min(100%, 420px)",
            aspectRatio: "1 / 1",
          }}
        >
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const x = i % GRID;
            const y = Math.floor(i / GRID);
            const idx = snakeIndex.get(`${x},${y}`);
            const isSnake = idx !== undefined;
            const isHead = idx === 0;
            const isFood = food.x === x && food.y === y;
            let bg = "transparent";
            if (isHead)      bg = "#3fb950";
            else if (isSnake) bg = "#238636";
            else if (isFood)  bg = "#f85149";
            return (
              <div
                key={i}
                style={{
                  background: bg,
                  borderRadius: isHead ? 4 : isSnake ? 2 : isFood ? "50%" : 0,
                  transition: "background 0.06s linear",
                }}
              />
            );
          })}

          {status === "paused" && (
            <Overlay title={t("snake.paused")} subtitle={t("snake.pauseHint")} />
          )}
          {status === "over" && (
            <Overlay
              title={t("snake.gameOver")}
              cta={t("snake.tryAgain")}
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
        background: "#21262d",
        color: "#e6edf3",
        padding: "6px 14px",
        borderRadius: 6,
        minWidth: 70,
        textAlign: "center",
        border: "1px solid #30363d",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", opacity: 0.6 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
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
        background: "rgba(15, 20, 25, 0.85)",
        backdropFilter: "blur(3px)",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 800, color: "#e6edf3" }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 13, color: "rgba(230, 237, 243, 0.6)" }}>{subtitle}</div>
      )}
      {cta && onCta && (
        <button
          onClick={onCta}
          style={{
            background: "#238636",
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

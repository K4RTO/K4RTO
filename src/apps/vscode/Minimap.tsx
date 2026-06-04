"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * VSCode-style minimap — a tiny SVG outline of the whole document showing
 * line lengths and indentation, with a draggable viewport indicator that
 * mirrors the textarea's scroll position.
 *
 * Architecture:
 *  - Reads textarea scrollTop / clientHeight to compute the visible range.
 *  - Click anywhere in the minimap to jump the textarea (centers that line).
 *  - Drag the viewport box to scrub.
 *  - One SVG <rect> per non-blank line. Indent → x offset; content length →
 *    rect width; content density → opacity. No syntax color here — accurate
 *    color would mean re-running Shiki on every render, which would dominate
 *    cost. The shape outline is enough to navigate by.
 */

interface MinimapProps {
  /** Full text content of the textarea — drives the rect grid. */
  code: string;
  /** Live reference to the textarea so we can read its scrollTop. */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** px height of each textarea line (must match the textarea's lineHeight). */
  lineHeight: number;
}

const MINIMAP_WIDTH = 76;
/** px per minimap row — small enough that ~1000-line files fit on screen
 *  without scrolling the minimap itself in typical app windows. */
const MINIMAP_LINE_HEIGHT = 2.5;
const MAX_CHARS_PER_LINE = 80;
/** Indent levels beyond this don't visually push further (avoid overshooting). */
const INDENT_CLAMP = 20;

export function Minimap({ code, textareaRef, lineHeight }: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  /** start = first fully-visible line index; end = last visible line index. */
  const [viewport, setViewport] = useState({ start: 0, end: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lines = code.split("\n");
  const totalLines = lines.length;
  const minimapTotalHeight = totalLines * MINIMAP_LINE_HEIGHT;

  // Mirror textarea scroll position → viewport box position.
  //
  // CAUTION: this effect depends on [textareaRef, lineHeight] but reads
  // textareaRef.current at setup time. React does NOT track ref.current
  // changes — so the listener attaches only to whichever textarea exists
  // when this effect FIRST runs. This works today because Minimap and the
  // textarea live in the same conditional branch in VSCode.tsx (raw-edit
  // mode), so a preview→edit toggle remounts Minimap, which re-runs this
  // effect against the fresh textarea. If a future refactor moves Minimap
  // outside that branch (e.g. keep it visible across preview toggles), the
  // textarea would remount underneath us and scroll-tracking would silently
  // stop. The fix in that case is a callback ref on the textarea that
  // re-invokes this setup.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    function update() {
      if (!ta) return;
      const startLine = Math.floor(ta.scrollTop / lineHeight);
      const endLine = Math.ceil((ta.scrollTop + ta.clientHeight) / lineHeight);
      setViewport({ start: startLine, end: endLine });
    }
    update();
    ta.addEventListener("scroll", update, { passive: true });
    // Window resize changes textarea clientHeight without firing scroll —
    // resync so the viewport box stays accurately sized.
    const ro = new ResizeObserver(update);
    ro.observe(ta);
    return () => {
      ta.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [textareaRef, lineHeight]);

  /** Map a click/drag Y inside the minimap container into a target textarea
   *  scrollTop. We center the clicked line in the textarea viewport so the
   *  jump feels like "I want to read this part". */
  const scrollToY = useCallback((clientY: number) => {
    const ta = textareaRef.current;
    const container = containerRef.current;
    if (!ta || !container) return;
    const rect = container.getBoundingClientRect();
    const relY = clientY - rect.top + container.scrollTop;
    const targetLine = Math.floor(relY / MINIMAP_LINE_HEIGHT);
    const targetScroll = targetLine * lineHeight - ta.clientHeight / 2;
    ta.scrollTop = Math.max(0, Math.min(targetScroll, ta.scrollHeight - ta.clientHeight));
  }, [textareaRef, lineHeight]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    scrollToY(e.clientY);
  }, [scrollToY]);

  // Drag-scrub — bind to document so dragging outside the minimap still tracks.
  useEffect(() => {
    if (!isDragging) return;
    function onMove(e: MouseEvent) { scrollToY(e.clientY); }
    function onUp() { setIsDragging(false); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, scrollToY]);

  const viewportTop = viewport.start * MINIMAP_LINE_HEIGHT;
  const viewportHeight = (viewport.end - viewport.start) * MINIMAP_LINE_HEIGHT;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className="flex-shrink-0 relative overflow-auto select-none"
      style={{
        width: MINIMAP_WIDTH,
        backgroundColor: "rgba(20,20,20,0.92)",
        borderLeft: "1px solid rgba(255,255,255,0.05)",
        cursor: isDragging ? "grabbing" : "pointer",
      }}
      aria-hidden
    >
      <svg
        width={MINIMAP_WIDTH}
        height={minimapTotalHeight}
        style={{ display: "block", pointerEvents: "none" }}
      >
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          const indent = (line.length - line.trimStart().length);
          const xStart = (Math.min(indent, INDENT_CLAMP) / INDENT_CLAMP) * (MINIMAP_WIDTH - 14);
          // Width proportional to content length, capped so very-long lines
          // don't blow past the minimap width.
          const visLen = Math.min(trimmed.length, MAX_CHARS_PER_LINE);
          const widthRatio = visLen / MAX_CHARS_PER_LINE;
          const rectWidth = Math.max(2, (MINIMAP_WIDTH - 8 - xStart) * widthRatio);
          // Denser lines get a touch more opacity — visually flags the "thick"
          // parts of the file like long function bodies.
          const opacity = 0.30 + widthRatio * 0.30;
          return (
            <rect
              key={i}
              x={4 + xStart}
              y={i * MINIMAP_LINE_HEIGHT}
              width={rectWidth}
              height={MINIMAP_LINE_HEIGHT - 0.6}
              fill={`rgba(220,220,220,${opacity})`}
              rx={0.5}
            />
          );
        })}
      </svg>

      {/* Viewport indicator — semi-transparent box that mirrors what's currently
       *  visible in the textarea. Drag-scrub friendly because pointer-events
       *  pass through to the container's mousedown handler. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: viewportTop,
          height: Math.max(20, viewportHeight),
          backgroundColor: "rgba(120,140,255,0.14)",
          border: "1px solid rgba(120,140,255,0.35)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

// ── Variant Types ─────────────────────────────────────────────────────────

export type GlassThickness = "thin" | "regular" | "thick";
export type GlassShadow = "sm" | "md" | "lg";
export type GlassRadius = "window" | "card" | "panel" | "popover" | "tooltip";

interface GlassSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  /** Material thickness — thin for popovers, regular for windows, thick for modals. */
  thickness?: GlassThickness;
  /** Drop shadow size. */
  shadow?: GlassShadow;
  /** Border radius preset. */
  radius?: GlassRadius;
  children?: ReactNode;
}

// ── Class Maps ────────────────────────────────────────────────────────────

const THICKNESS_CLASS: Record<GlassThickness, string> = {
  thin: "glass-thin",
  regular: "", // .glass-surface defaults to regular
  thick: "glass-thick",
};

const SHADOW_CLASS: Record<GlassShadow, string> = {
  sm: "glass-shadow-sm",
  md: "", // default
  lg: "glass-shadow-lg",
};

const RADIUS_CLASS: Record<GlassRadius, string> = {
  window: "", // default
  card: "glass-radius-card",
  panel: "glass-radius-panel",
  popover: "glass-radius-popover",
  tooltip: "glass-radius-tooltip",
};

// ── Component ─────────────────────────────────────────────────────────────

/**
 * GlassSurface — Tahoe Liquid Glass material wrapper.
 *
 * Provides the standard 5-layer glass effect (background + blur + saturate +
 * inner highlights + outer shadow + gloss overlay) via a single component.
 *
 * @example
 *   <GlassSurface thickness="thin" radius="popover">
 *     <MenuItem />
 *   </GlassSurface>
 */
export const GlassSurface = forwardRef<HTMLDivElement, GlassSurfaceProps>(
  function GlassSurface(
    {
      thickness = "regular",
      shadow = "md",
      radius = "window",
      className = "",
      children,
      ...rest
    },
    ref
  ) {
    const cls = [
      "glass-surface",
      THICKNESS_CLASS[thickness],
      SHADOW_CLASS[shadow],
      RADIUS_CLASS[radius],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={ref} className={cls} {...rest}>
        {children}
      </div>
    );
  }
);

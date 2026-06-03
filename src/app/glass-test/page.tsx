"use client";

/**
 * /glass-test/ — Tahoe Liquid Glass 视觉验收页
 *
 * Sprint A 完成后访问 http://localhost:3060/glass-test/ 检查：
 *   1. 3 档玻璃（thin / regular / thick）厚度差
 *   2. 顶部 0.5px 高光线（look for the white pixel-perfect line at the top edge）
 *   3. 顶部 30% gloss 渐变
 *   4. 外阴影 3 档（sm / md / lg）
 *   5. 5 种圆角变体
 *   6. 类用法 vs 组件用法等价
 *
 * 本页 dev-only：不挂到 Dock/Spotlight，仅作视觉验收。
 */

import type { CSSProperties } from "react";
import { GlassSurface } from "@/components/shared/GlassSurface";

// ── Wallpaper gradient — simulates desktop背景 for honest glass evaluation ──

const wallpaperStyle: CSSProperties = {
  minHeight: "100vh",
  width: "100%",
  background:
    "linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #6f1e51 100%)",
  padding: "40px",
  overflow: "auto",
};

const sectionTitle: CSSProperties = {
  color: "rgba(255,255,255,0.9)",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  marginBottom: 12,
  marginTop: 32,
};

const cardPadding: CSSProperties = {
  padding: 24,
  color: "rgba(255,255,255,0.95)",
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.6)",
  marginTop: 8,
};

export default function GlassTestPage() {
  return (
    <div style={wallpaperStyle}>
      <h1 style={{ color: "white", fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
        Tahoe Liquid Glass — Visual Acceptance
      </h1>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
        Sprint A 验收页 · 检查 5 个视觉锚点（见文件注释）
      </p>

      {/* ── 厚度 3 档 ─────────────────────────────────────────────────────── */}
      <div style={sectionTitle}>1 · Thickness</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <GlassSurface thickness="thin">
          <div style={cardPadding}>
            <strong>thin</strong>
            <div style={labelStyle}>blur 40px · bg 0.30</div>
            <div style={labelStyle}>顶层 popover / tooltip / menubar</div>
          </div>
        </GlassSurface>

        <GlassSurface thickness="regular">
          <div style={cardPadding}>
            <strong>regular</strong>
            <div style={labelStyle}>blur 60px · bg 0.45</div>
            <div style={labelStyle}>常规窗口（默认）</div>
          </div>
        </GlassSurface>

        <GlassSurface thickness="thick">
          <div style={cardPadding}>
            <strong>thick</strong>
            <div style={labelStyle}>blur 80px · bg 0.65</div>
            <div style={labelStyle}>桌面/底层 / 大型 modal</div>
          </div>
        </GlassSurface>
      </div>

      {/* ── 阴影 3 档 ─────────────────────────────────────────────────────── */}
      <div style={sectionTitle}>2 · Shadow</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <GlassSurface shadow="sm">
          <div style={cardPadding}>
            <strong>shadow sm</strong>
            <div style={labelStyle}>0 4px 14px · 0.20</div>
          </div>
        </GlassSurface>
        <GlassSurface shadow="md">
          <div style={cardPadding}>
            <strong>shadow md</strong>
            <div style={labelStyle}>0 12px 40px · 0.35（默认）</div>
          </div>
        </GlassSurface>
        <GlassSurface shadow="lg">
          <div style={cardPadding}>
            <strong>shadow lg</strong>
            <div style={labelStyle}>0 28px 80px · 0.45</div>
          </div>
        </GlassSurface>
      </div>

      {/* ── 圆角 5 档 ─────────────────────────────────────────────────────── */}
      <div style={sectionTitle}>3 · Radius</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <GlassSurface radius="tooltip"><div style={cardPadding}><strong>tooltip</strong><div style={labelStyle}>8px</div></div></GlassSurface>
        <GlassSurface radius="window"><div style={cardPadding}><strong>window</strong><div style={labelStyle}>10px</div></div></GlassSurface>
        <GlassSurface radius="card"><div style={cardPadding}><strong>card</strong><div style={labelStyle}>12px</div></div></GlassSurface>
        <GlassSurface radius="popover"><div style={cardPadding}><strong>popover</strong><div style={labelStyle}>14px</div></div></GlassSurface>
        <GlassSurface radius="panel"><div style={cardPadding}><strong>panel</strong><div style={labelStyle}>16px</div></div></GlassSurface>
      </div>

      {/* ── 类用法 vs 组件用法对照 ───────────────────────────────────────── */}
      <div style={sectionTitle}>4 · Class vs Component (should look identical)</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        <div className="glass-surface glass-thin glass-radius-popover">
          <div style={cardPadding}>
            <strong>className path</strong>
            <pre style={{ ...labelStyle, fontFamily: "monospace", fontSize: 11 }}>
              {`<div className="glass-surface\n  glass-thin\n  glass-radius-popover">`}
            </pre>
          </div>
        </div>
        <GlassSurface thickness="thin" radius="popover">
          <div style={cardPadding}>
            <strong>Component path</strong>
            <pre style={{ ...labelStyle, fontFamily: "monospace", fontSize: 11 }}>
              {`<GlassSurface\n  thickness="thin"\n  radius="popover">`}
            </pre>
          </div>
        </GlassSurface>
      </div>

      {/* ── 嵌套测试 ──────────────────────────────────────────────────────── */}
      <div style={sectionTitle}>5 · Nested (popover 内含 toolbar)</div>
      <GlassSurface thickness="thick" radius="panel">
        <div style={{ padding: 24 }}>
          <strong style={{ color: "rgba(255,255,255,0.95)" }}>Outer thick panel</strong>
          <div style={{ ...labelStyle, marginBottom: 16 }}>
            Inside this panel, a thin surface for a toolbar:
          </div>
          <GlassSurface thickness="thin" radius="tooltip">
            <div style={{ padding: 12, fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
              Inner thin toolbar — should look distinctly less blurry than outer
            </div>
          </GlassSurface>
        </div>
      </GlassSurface>

      {/* ── Spring 动画测试 ─────────────────────────────────────────────── */}
      <div style={sectionTitle}>6 · Spring animation (hover the card)</div>
      <GlassSurface
        thickness="regular"
        radius="card"
        style={{
          cursor: "pointer",
          transition: "transform 0.25s var(--spring-bouncy)",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <div style={cardPadding}>
          <strong>Hover me</strong>
          <div style={labelStyle}>scale 1 → 1.03 with var(--spring-bouncy)</div>
          <div style={labelStyle}>松手时应该有微小 overshoot 才正常</div>
        </div>
      </GlassSurface>

      <div style={{ height: 60 }} />
    </div>
  );
}

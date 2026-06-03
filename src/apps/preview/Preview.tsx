"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { AppComponentProps } from "@/apps/registry";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useSystem } from "@/contexts/SystemContext";
import { withBase } from "@/lib/paths";
import { useAppMenuListener } from "@/lib/menubar/appMenu";

// Load pdf.js worker from CDN — works for static export (GH Pages) without copying worker file.
// Version is matched to the installed pdfjs-dist via pdfjs.version.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ── Analytics stub ────────────────────────────────────────────────────────
// HONEST NOTE: Cloudflare Web Analytics does NOT support custom events as of 2026-06.
// This function is a clean stub — it logs to console in dev so we can verify event
// shapes during development. Wire up a real provider here when ready:
//   - Plausible: window.plausible?.(name, { props: payload })
//   - Umami:     window.umami?.track(name, payload)
//   - Cloudflare Zaraz: zaraz?.track(name, payload)
// Until then, all events are no-op in production.
function trackEvent(name: string, payload?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[analytics:stub]", name, payload ?? {});
  }
  // TODO: wire to real analytics provider (see note above)
}

// ── Icons ─────────────────────────────────────────────────────────────────

function ZoomInIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>; }
function ZoomOutIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>; }
function ActualSizeIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9l6 6M15 9l-6 6"/></svg>; }
function DownloadIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function PrintIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>; }
function ChevronLeftIcon(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>; }
function ChevronRightIcon(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>; }

// ── Main Component ────────────────────────────────────────────────────────

export default function Preview({ windowId }: AppComponentProps) {
  const { state, dispatch } = useWindowManager();
  const { lang } = useSystem();
  const meta = state.windows.get(windowId)?.meta ?? {};
  const { publicPath = "", fileName = "Preview", filePath = "" } = meta;

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const isPdf = ext === "pdf";
  const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);

  // Resume detection by path (robust to renames; matches anything under K4RTO/Resume)
  const isResume = /\/K4RTO\/Resume(\.|-)/i.test(filePath) || /\/K4RTO\/Resume(\.|-)/i.test(publicPath);
  const [resumeLang, setResumeLang] = useState<"en" | "zh">(() => (lang === "zh" ? "zh" : "en"));

  // Sync resume language with system language
  useEffect(() => {
    if (isResume) setResumeLang(lang === "zh" ? "zh" : "en");
  }, [lang, isResume]);

  // Resolve actual file path: bilingual swap for Resume; otherwise the meta path as-is.
  // All paths go through withBase() to handle GH Pages basePath correctly.
  const actualPath = useMemo(() => {
    if (isResume) {
      return withBase(resumeLang === "zh" ? "/K4RTO/Resume-CN.pdf" : "/K4RTO/Resume-EN.pdf");
    }
    return withBase(publicPath);
  }, [isResume, resumeLang, publicPath]);

  // PDF state
  const [scale, setScale] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Reset page state when file source changes
  useEffect(() => {
    setCurrentPage(1);
    setNumPages(null);
    setPdfError(null);
  }, [actualPath]);

  // Sync window title — show language suffix for Resume
  useEffect(() => {
    const title = isResume
      ? `Resume.pdf (${resumeLang === "zh" ? "中" : "EN"})`
      : fileName;
    dispatch({ type: "SET_TITLE", id: windowId, title });
  }, [dispatch, windowId, fileName, isResume, resumeLang]);

  // Track open event — guard with ref so initial mount + lang-sync don't double-fire
  const trackedPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (trackedPathRef.current === actualPath) return;
    trackedPathRef.current = actualPath;
    if (isPdf) trackEvent("preview_pdf_opened", { file: fileName });
    if (isResume) trackEvent("resume_viewed", { lang: resumeLang });
  }, [actualPath, isPdf, isResume, fileName, resumeLang]);

  // ── Action handlers (useCallback for stable refs in keyboard effect) ────

  const zoomIn    = useCallback(() => setScale(s => Math.min(s + 0.25, 4)), []);
  const zoomOut   = useCallback(() => setScale(s => Math.max(s - 0.25, 0.25)), []);
  const resetZoom = useCallback(() => setScale(1), []);

  const nextPage = useCallback(() => setCurrentPage(p => Math.min(p + 1, numPages ?? p)), [numPages]);
  const prevPage = useCallback(() => setCurrentPage(p => Math.max(p - 1, 1)), []);

  // Download via anchor element (most reliable across browsers, gesture-driven)
  const handleDownload = useCallback(() => {
    if (!actualPath) return;
    const a = document.createElement("a");
    a.href = actualPath;
    a.download = isResume ? `K4RTO-Resume-${resumeLang.toUpperCase()}.pdf` : fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (isResume) trackEvent("resume_downloaded", { lang: resumeLang });
    else trackEvent("preview_downloaded", { file: fileName });
  }, [actualPath, fileName, isResume, resumeLang]);

  // Print via hidden iframe — more reliable than window.open() across Chrome/Safari/Firefox.
  // Browsers that delegate PDF rendering to a viewer plugin may still ignore .print(),
  // in which case the user should use Download + system print.
  const handlePrint = useCallback(() => {
    if (!actualPath) return;
    const existing = document.getElementById("__preview_print_iframe") as HTMLIFrameElement | null;
    existing?.remove();
    const iframe = document.createElement("iframe");
    iframe.id = "__preview_print_iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = actualPath;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Cross-origin or PDF-viewer-intercepted: fall back to opening in new tab
        window.open(actualPath, "_blank");
      }
    };
    document.body.appendChild(iframe);
    // Clean up after a reasonable delay (print dialog blocks, then user dismisses)
    setTimeout(() => iframe.remove(), 10000);
    if (isResume) trackEvent("resume_printed", { lang: resumeLang });
    else trackEvent("preview_printed", { file: fileName });
  }, [actualPath, fileName, isResume, resumeLang]);

  // Resume language toggle
  const toggleResumeLang = useCallback(() => {
    setResumeLang(prev => {
      const next = prev === "en" ? "zh" : "en";
      trackEvent("resume_lang_switched", { from: prev, to: next });
      return next;
    });
  }, []);

  // Keyboard shortcuts (PDF only): arrows for page nav; ⌘+/-/0 for zoom; ⌘S/P for download/print
  useEffect(() => {
    if (!isPdf) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prevPage(); }
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); nextPage(); }
      if (e.metaKey && (e.key === "=" || e.key === "+")) { e.preventDefault(); zoomIn(); }
      if (e.metaKey && e.key === "-") { e.preventDefault(); zoomOut(); }
      if (e.metaKey && e.key === "0") { e.preventDefault(); resetZoom(); }
      if (e.metaKey && (e.key === "s" || e.key === "S")) { e.preventDefault(); handleDownload(); }
      if (e.metaKey && (e.key === "p" || e.key === "P")) { e.preventDefault(); handlePrint(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPdf, prevPage, nextPage, zoomIn, zoomOut, resetZoom, handleDownload, handlePrint]);

  // ── MenuBar integration ───────────────────────────────────────────────

  useAppMenuListener("preview", (detail) => {
    switch (detail.type) {
      case "print":      handlePrint(); break;
      case "download":   handleDownload(); break;
      case "zoom-in":    zoomIn(); break;
      case "zoom-out":   zoomOut(); break;
      case "zoom-reset": resetZoom(); break;
      case "next-page":  nextPage(); break;
      case "prev-page":  prevPage(); break;
    }
  });

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: "#1e1e1e", color: "rgba(255,255,255,0.85)" }}
    >
      {/* Toolbar */}
      <div
        className="glass-surface glass-thin flex items-center gap-3 flex-shrink-0 select-none"
        style={{
          height: 48,
          padding: "0 16px",
          borderRadius: 0,
          boxShadow: "inset 0 0.5px 0 var(--glass-highlight-top), inset 0 -1px 0 rgba(255,255,255,0.10)",
        }}
      >
        {/* File name */}
        <span className="text-[13px] font-medium flex-1 truncate" style={{ color: "rgba(255,255,255,0.9)" }}>
          {fileName}
        </span>

        {/* Resume language toggle */}
        {isResume && (
          <div className="flex items-center rounded-[6px] overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.12)" }} role="group" aria-label="Resume language">
            {(["en", "zh"] as const).map(l => (
              <button
                key={l}
                onClick={() => l !== resumeLang && toggleResumeLang()}
                className="px-2.5 h-7 text-[11px] font-semibold"
                style={{
                  color: resumeLang === l ? "white" : "rgba(255,255,255,0.55)",
                  backgroundColor: resumeLang === l ? "rgba(255,255,255,0.15)" : "transparent",
                }}
                aria-label={l === "en" ? "English Resume" : "Chinese Resume"}
                aria-pressed={resumeLang === l}
              >
                {l === "en" ? "EN" : "中"}
              </button>
            ))}
          </div>
        )}

        {/* PDF page navigation */}
        {isPdf && numPages && numPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", color: currentPage > 1 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}
              title="Previous Page"
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
            </button>
            <span className="text-[11px] tabular-nums px-1" style={{ color: "rgba(255,255,255,0.55)", minWidth: 50, textAlign: "center" }} aria-live="polite">
              {currentPage} / {numPages}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage >= (numPages ?? 1)}
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", color: currentPage < (numPages ?? 1) ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}
              title="Next Page"
              aria-label="Next page"
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}

        {/* Zoom controls (PDF + image) */}
        {(isPdf || isImage) && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] mr-1 tabular-nums" style={{ color: "rgba(255,255,255,0.45)" }} aria-live="polite">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={zoomOut} className="w-7 h-7 rounded flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
              title="Zoom Out (⌘−)" aria-label="Zoom out"><ZoomOutIcon /></button>
            <button onClick={resetZoom} className="w-7 h-7 rounded flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
              title="Actual Size (⌘0)" aria-label="Actual size"><ActualSizeIcon /></button>
            <button onClick={zoomIn} className="w-7 h-7 rounded flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
              title="Zoom In (⌘+)" aria-label="Zoom in"><ZoomInIcon /></button>
          </div>
        )}

        {/* Download + Print (PDF only) */}
        {isPdf && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,88,208,0.65)", color: "white" }}
              title="Download (⌘S)"
              aria-label="Download PDF"
            >
              <DownloadIcon />
            </button>
            <button
              onClick={handlePrint}
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
              title="Print (⌘P)"
              aria-label="Print PDF"
            >
              <PrintIcon />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex items-start justify-center" style={{ backgroundColor: "#2a2a2a", padding: 24 }} aria-busy={isPdf && numPages === null && !pdfError}>
        {isPdf && actualPath ? (
          <Document
            file={actualPath}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(err) => setPdfError(err.message)}
            loading={<div style={{ color: "rgba(255,255,255,0.4)", marginTop: 40 }}>Loading PDF…</div>}
            error={
              <div style={{ color: "rgba(255,100,100,0.7)", marginTop: 40, maxWidth: 420, textAlign: "center" }}>
                Failed to load PDF{pdfError ? `: ${pdfError}` : ""}.
                <br />
                <a href={actualPath} download style={{ color: "#4a9eff", textDecoration: "underline" }}>
                  Download instead
                </a>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={<div style={{ color: "rgba(255,255,255,0.4)" }}>Rendering page…</div>}
            />
          </Document>
        ) : isImage && publicPath ? (
          <div style={{ overflow: "auto", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={withBase(publicPath)}
              alt={fileName}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "center center",
                maxWidth: scale <= 1 ? "100%" : "none",
                maxHeight: scale <= 1 ? "100%" : "none",
                objectFit: "contain",
                transition: "transform 0.15s ease",
              }}
            />
          </div>
        ) : (
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, marginTop: 80 }}>
            No file to display
          </div>
        )}
      </div>
    </div>
  );
}

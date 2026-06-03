"use client";

import { Suspense, useEffect, useState } from "react";
import { MenuBar } from "@/components/menubar/MenuBar";
import { Dock } from "@/components/dock/Dock";
import { Window } from "@/components/window/Window";
import { Wallpaper } from "@/components/desktop/Wallpaper";
import { DesktopGrid } from "@/components/desktop/DesktopGrid";
import { Spotlight } from "@/components/menubar/Spotlight";
import {
  WindowManagerProvider,
  useWindowManager,
} from "@/contexts/WindowManagerContext";
import { ProcessProvider, useProcesses } from "@/contexts/ProcessContext";
import { FileSystemProvider } from "@/contexts/FileSystemContext";
import { SystemProvider, useSystem } from "@/contexts/SystemContext";
import { getApp } from "@/apps/registry";
import { AboutThisMac } from "@/components/desktop/AboutThisMac";

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div
        className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "rgba(0,0,0,0.15)", borderTopColor: "transparent" }}
      />
    </div>
  );
}

function DesktopContent() {
  const { state, dispatch, closeWindow } = useWindowManager();
  const { launch, kill, getProcessByWindowId } = useProcesses();
  const { lang, setLang } = useSystem();
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [showAboutThisMac, setShowAboutThisMac] = useState(false);

  // Focused window = last in windowOrder
  const focusedWindowId =
    state.windowOrder.length > 0
      ? state.windowOrder[state.windowOrder.length - 1]
      : null;
  const focusedProcess = focusedWindowId
    ? getProcessByWindowId(focusedWindowId)
    : null;
  const focusedApp = focusedProcess ? getApp(focusedProcess.appId) : null;
  const activeAppName = focusedApp?.name ?? "Finder";
  const activeAppId = focusedProcess?.appId ?? null;

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey && (e.key === " ")) {
        e.preventDefault();
        setSpotlightOpen(v => !v);
        return;
      }
      if (!e.metaKey) return;
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        if (focusedWindowId) closeWindow(focusedWindowId);
      }
      if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        if (focusedProcess) kill(focusedProcess.id);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [focusedWindowId, focusedProcess, closeWindow, kill]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Wallpaper />
      <MenuBar
        activeAppName={activeAppName}
        activeAppId={activeAppId}
        inputMethod={lang}
        onToggleInputMethod={() => setLang(lang === "en" ? "zh" : "en")}
        onSpotlight={() => setSpotlightOpen(true)}
        onNewFinderWindow={() => launch("finder")}
        onCloseWindow={() => { if (focusedProcess) kill(focusedProcess.id); }}
        onMinimizeWindow={() => { if (focusedWindowId) dispatch({ type: "MINIMIZE_WINDOW", id: focusedWindowId }); }}
        onZoomWindow={() => { if (focusedWindowId) dispatch({ type: "MAXIMIZE_WINDOW", id: focusedWindowId }); }}
        onAboutThisMac={() => setShowAboutThisMac(true)}
        onSystemSettings={() => launch("settings")}
        onQuitApp={() => { if (focusedProcess) kill(focusedProcess.id); }}
        onHideApp={() => { if (focusedWindowId) dispatch({ type: "MINIMIZE_WINDOW", id: focusedWindowId }); }}
        onHideOthers={() => {
          Array.from(state.windows.values())
            .filter(w => w.id !== focusedWindowId && w.status !== "minimized")
            .forEach(w => dispatch({ type: "MINIMIZE_WINDOW", id: w.id }));
        }}
        onShowAll={() => {
          Array.from(state.windows.values())
            .filter(w => w.status === "minimized")
            .forEach(w => dispatch({ type: "RESTORE_WINDOW", id: w.id }));
        }}
      />

      {/* Desktop icons + right-click */}
      <DesktopGrid onLaunchApp={launch} />

      {/* Window Layer */}
      {Array.from(state.windows.values()).map((ws) => {
        const process = getProcessByWindowId(ws.id);
        const app = process ? getApp(process.appId) : null;
        const AppComponent = app?.component;

        return (
          <Window key={ws.id} windowState={ws}>
            <Suspense fallback={<LoadingSpinner />}>
              {AppComponent && process ? (
                <AppComponent windowId={ws.id} processId={process.id} />
              ) : (
                <div className="flex items-center justify-center h-full text-black/40 text-sm">
                  {ws.title}
                </div>
              )}
            </Suspense>
          </Window>
        );
      })}

      <Dock onLaunchApp={launch} />

      {/* About This Mac */}
      {showAboutThisMac && (
        <AboutThisMac onClose={() => setShowAboutThisMac(false)} />
      )}

      {/* Spotlight */}
      {spotlightOpen && (
        <Spotlight onClose={() => setSpotlightOpen(false)} onLaunchApp={launch} />
      )}
    </div>
  );
}

export function Desktop() {
  return (
    <SystemProvider>
      <FileSystemProvider>
        <WindowManagerProvider>
          <ProcessProvider>
            <DesktopContent />
          </ProcessProvider>
        </WindowManagerProvider>
      </FileSystemProvider>
    </SystemProvider>
  );
}

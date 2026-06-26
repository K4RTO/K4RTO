"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
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
import { SystemProvider, useSystem, useT } from "@/contexts/SystemContext";
import { getApp } from "@/apps/registry";
import { AboutThisMac } from "@/components/desktop/AboutThisMac";
import { LoginScreen } from "@/components/desktop/LoginScreen";
import { Launchpad } from "@/components/desktop/Launchpad";
import { MissionControl } from "@/components/desktop/MissionControl";

const LOGIN_SESSION_KEY = "k4rto_unlocked";

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
  const t = useT();
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [launchpadOpen, setLaunchpadOpen] = useState(false);
  const [missionControlOpen, setMissionControlOpen] = useState(false);
  const [showAboutThisMac, setShowAboutThisMac] = useState(false);

  // Lock screen — shown once per browser session. We start `locked = false` to
  // avoid an SSR/CSR mismatch (sessionStorage doesn't exist on the server) and
  // flip to `true` in an effect after mount. This means the desktop is briefly
  // visible for one paint cycle (~50-100ms on cold loads) before the lock takes
  // over; acceptable trade-off vs hydration warnings. Cannot use useLayoutEffect
  // either — Next.js logs a warning when those run during SSR-marker rehydration.
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(LOGIN_SESSION_KEY) !== "1") setLocked(true);
    } catch {
      // sessionStorage unavailable (private mode / sandboxed iframe) — skip lock.
    }
  }, []);
  // useCallback so the ESC effect inside LoginScreen doesn't tear down/rebuild
  // its listener on every Desktop re-render (also prevents the stale-closure
  // maintenance trap if `unlock` ever grows to capture changing state).
  const unlock = useCallback(() => {
    try { sessionStorage.setItem(LOGIN_SESSION_KEY, "1"); } catch {}
    setLocked(false);
  }, []);

  // Apple-menu power actions. "Sleep" and "Shut Down" drop the display to
  // black (powerState overlay below); waking from sleep lands on the lock
  // screen, like a real Mac with "require password after sleep" on. Restart
  // reloads the page — the boot lands on the lock screen because we clear the
  // session flag first. Lock Screen / Log Out reuse the same lock flow.
  const [powerState, setPowerState] = useState<null | "sleep" | "off">(null);
  const bootSteps = lang === "zh"
    ? ["加载前端内核", "挂载虚拟文件系统", "启动系统服务", "恢复桌面会话"]
    : ["Loading frontend kernel", "Mounting virtual filesystem", "Starting system services", "Restoring desktop session"];
  const [bootStep, setBootStep] = useState(0);
  const lock = useCallback(() => {
    try { sessionStorage.removeItem(LOGIN_SESSION_KEY); } catch {}
    setLocked(true);
  }, []);
  const restart = useCallback(() => {
    try { sessionStorage.removeItem(LOGIN_SESSION_KEY); } catch {}
    window.location.reload();
  }, []);
  const wakeFromSleep = useCallback(() => {
    setPowerState(null);
    lock();
  }, [lock]);

  // While asleep, any keypress wakes the machine (clicks are handled by the
  // overlay itself). Shut-down ignores keys — you press the "power button"
  // (click) to boot.
  useEffect(() => {
    if (powerState !== "sleep") return;
    const onKey = (e: KeyboardEvent) => { e.preventDefault(); wakeFromSleep(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [powerState, wakeFromSleep]);

  useEffect(() => {
    if (bootStep >= bootSteps.length) return;
    const timer = window.setTimeout(() => setBootStep((step) => step + 1), bootStep === 0 ? 420 : 320);
    return () => window.clearTimeout(timer);
  }, [bootStep, bootSteps.length]);

  // Focused window = last in windowOrder
  const focusedWindowId =
    state.windowOrder.length > 0
      ? state.windowOrder[state.windowOrder.length - 1]
      : null;
  const focusedProcess = focusedWindowId
    ? getProcessByWindowId(focusedWindowId)
    : null;
  const focusedApp = focusedProcess ? getApp(focusedProcess.appId) : null;
  // Prefer the localized dock name (dock.<appId>) so the menubar app indicator
  // matches the dock label. Fall back to the registry's English name if the
  // app isn't dock-registered (shouldn't happen for known apps), and "Finder"
  // when no window is focused (matches macOS behavior).
  const activeAppId = focusedProcess?.appId ?? null;
  const activeAppName = activeAppId
    ? t(`dock.${activeAppId}`) || focusedApp?.name || "Finder"
    : t("dock.finder");

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // While the lock screen is up, swallow everything. LoginScreen has its
      // own key listener that unlocks on any key; we don't want F4 / F3 /
      // ⌘Space to also pop overlays open underneath, leaving the user on a
      // desktop that's already cluttered the moment they unlock.
      if (locked) return;
      // F4 opens Launchpad. Closing is handled inside Launchpad itself (so
      // it can run the exit animation cleanly); we only fire the open path
      // here when it isn't already showing. Mutually exclusive with
      // Mission Control — if MC is open, dismiss it first (no animation;
      // Launchpad's open animation covers the gap cleanly).
      if (e.key === "F4") {
        e.preventDefault();
        setMissionControlOpen(false);
        setLaunchpadOpen((open) => open ? open : true);
        return;
      }
      // F3 opens Mission Control. Same mutual-exclusion treatment.
      // Caveat: real macOS intercepts F3 at the OS level for the system
      // Mission Control, so this key won't reach the browser there. The
      // Dock now carries a Mission Control icon as the reliable trigger;
      // F3 is best-effort for Linux/Windows.
      if (e.key === "F3") {
        e.preventDefault();
        setLaunchpadOpen(false);
        setMissionControlOpen((open) => open ? open : true);
        return;
      }
      if (e.metaKey && (e.key === " ")) {
        e.preventDefault();
        setSpotlightOpen(v => !v);
        return;
      }
      // Window snap shortcuts: Ctrl+Alt+Arrow snaps the focused window to a
      // half / full / restored position. Matches the macOS "Move Window to
      // Left/Right Side" menu entries (which on real macOS use Ctrl+Opt+arrow
      // by default). Decoupled from the metaKey block below so the modifier
      // chord doesn't accidentally fall through to ⌘+W / ⌘+Q.
      if (e.ctrlKey && e.altKey && focusedWindowId && !e.metaKey && !e.shiftKey) {
        const MENU_BAR = 28;
        const DOCK_RESERVE = 80;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const halfW = Math.floor(w / 2);
        const contentH = h - MENU_BAR - DOCK_RESERVE;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          dispatch({ type: "RESIZE_WINDOW", id: focusedWindowId, rect: { x: 0, y: MENU_BAR, width: halfW, height: contentH } });
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          dispatch({ type: "RESIZE_WINDOW", id: focusedWindowId, rect: { x: w - halfW, y: MENU_BAR, width: halfW, height: contentH } });
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          dispatch({ type: "MAXIMIZE_WINDOW", id: focusedWindowId });
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          dispatch({ type: "RESTORE_WINDOW", id: focusedWindowId });
          return;
        }
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
  }, [focusedWindowId, focusedProcess, closeWindow, kill, locked, dispatch]);

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
        onShowLaunchpad={() => {
          setMissionControlOpen(false);
          setLaunchpadOpen(true);
        }}
        onShowMissionControl={() => {
          setLaunchpadOpen(false);
          setMissionControlOpen(true);
        }}
        onLockScreen={lock}
        onLogOut={lock}
        onSleep={() => setPowerState("sleep")}
        onRestart={restart}
        onShutDown={() => setPowerState("off")}
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
                <AppComponent windowId={ws.id} processId={process.id} meta={ws.meta} />
              ) : (
                <div className="flex items-center justify-center h-full text-black/40 text-sm">
                  {ws.title}
                </div>
              )}
            </Suspense>
          </Window>
        );
      })}

      <Dock
        onLaunchApp={launch}
        onShowLaunchpad={() => {
          setMissionControlOpen(false);
          setLaunchpadOpen(true);
        }}
        onShowMissionControl={() => {
          setLaunchpadOpen(false);
          setMissionControlOpen(true);
        }}
      />

      {/* About This Mac */}
      {showAboutThisMac && (
        <AboutThisMac onClose={() => setShowAboutThisMac(false)} />
      )}

      {/* Spotlight */}
      {spotlightOpen && (
        <Spotlight onClose={() => setSpotlightOpen(false)} onLaunchApp={launch} />
      )}

      {/* Launchpad — full-screen app grid. Sits above windows + dock but
          below the lock screen. */}
      {launchpadOpen && (
        <Launchpad
          onClose={() => setLaunchpadOpen(false)}
          onLaunchApp={launch}
        />
      )}

      {/* Mission Control — full-screen window-tile grid. Same z-tier as
          Launchpad (they're mutually exclusive in practice). */}
      {missionControlOpen && (
        <MissionControl onClose={() => setMissionControlOpen(false)} />
      )}

      {/* Lock screen — sits above everything until unlocked */}
      {locked && <LoginScreen onUnlock={unlock} />}

      {/* Power overlay — black screen for Sleep / Shut Down. Sits above even
          the lock screen (a sleeping display shows nothing). Sleep wakes on
          click or any key (key listener in the effect above) onto the lock
          screen; Shut Down boots on click via a full reload. */}
      {powerState !== null && (
        <div
          className="fixed inset-0 bg-black"
          style={{ zIndex: 100001, animation: "fadeIn 0.6s ease-out" }}
          onClick={powerState === "sleep" ? wakeFromSleep : restart}
        >
          {powerState === "off" && (
            <span
              className="absolute inset-0 flex items-center justify-center select-none"
              style={{ color: "rgba(255,255,255,0.18)", fontSize: 28 }}
              aria-hidden
            >
              ⏻
            </span>
          )}
        </div>
      )}

      {bootStep < bootSteps.length && (
        <div
          className="fixed inset-0 bg-black flex flex-col items-center justify-center"
          style={{ zIndex: 100002, color: "rgba(255,255,255,0.82)" }}
        >
          <div style={{ fontSize: 34, fontWeight: 500, marginBottom: 18 }}>K4RTO</div>
          <div style={{ width: 220, height: 4, background: "rgba(255,255,255,0.16)", borderRadius: 999, overflow: "hidden" }}>
            <div
              style={{
                width: `${((bootStep + 1) / bootSteps.length) * 100}%`,
                height: "100%",
                background: "rgba(255,255,255,0.72)",
                transition: "width 0.28s ease",
              }}
            />
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
            {bootSteps[bootStep]}
          </div>
        </div>
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

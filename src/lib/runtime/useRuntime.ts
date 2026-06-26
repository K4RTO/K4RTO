"use client";

import { useCallback, useMemo } from "react";
import { getAllApps } from "@/apps/registry";
import { useFileSystemOptional } from "@/contexts/FileSystemContext";
import { useProcesses } from "@/contexts/ProcessContext";
import { useSystem } from "@/contexts/SystemContext";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { planOpenFile } from "@/services/app-manager";

export function useRuntime() {
  const fs = useFileSystemOptional();
  const processes = useProcesses();
  const windows = useWindowManager();
  const system = useSystem();

  const launchApp = useCallback((appId: string, meta?: Record<string, string>) => {
    return processes.launch(appId, meta);
  }, [processes]);

  const openFile = useCallback((path: string): boolean => {
    if (!fs) return false;
    const plan = planOpenFile(fs, path);
    if (!plan) return false;
    processes.launch(plan.appId, plan.meta);
    return true;
  }, [fs, processes]);

  const listProcesses = useCallback(() => {
    return Array.from(processes.processes.values()).map((p) => ({
      ...p,
      appName: getAllApps().find((app) => app.id === p.appId)?.name ?? p.appId,
    }));
  }, [processes.processes]);

  const killProcess = useCallback((id: string): boolean => {
    if (!processes.processes.has(id)) return false;
    processes.kill(id);
    return true;
  }, [processes]);

  const readSetting = useCallback((key: string): string | null => {
    if (key === "lang") return system.lang;
    if (key === "theme") return system.theme;
    if (key === "accent") return system.accent;
    if (key === "wallpaper") return system.wallpaper;
    if (key === "sidebarSize") return system.sidebarSize;
    return null;
  }, [system]);

  const writeSetting = useCallback((key: string, value: string): boolean => {
    if (key === "lang" && (value === "en" || value === "zh")) { system.setLang(value); return true; }
    if (key === "theme" && (value === "light" || value === "dark" || value === "auto")) { system.setTheme(value); return true; }
    if (key === "accent") { system.setAccent(value); return true; }
    if (key === "wallpaper") { system.setWallpaper(value); return true; }
    if (key === "sidebarSize" && (value === "small" || value === "medium" || value === "large")) { system.setSidebarSize(value); return true; }
    return false;
  }, [system]);

  const systemProfile = useMemo(() => ({
    productName: "K4RTO macOS Portfolio",
    productVersion: "1.0",
    buildVersion: "FrontendOS-2026.06",
    kernel: "React 19 frontend runtime",
    filesystem: "Browser VFS with local persistence",
    deployment: "Next.js static export on GitHub Pages",
    apps: getAllApps().length,
  }), []);

  return {
    fs,
    process: {
      launchApp,
      killProcess,
      listProcesses,
      raw: processes,
    },
    window: {
      raw: windows,
    },
    system: {
      ...system,
      readSetting,
      writeSetting,
      profile: systemProfile,
    },
    appManager: {
      openFile,
      listApps: getAllApps,
    },
  };
}

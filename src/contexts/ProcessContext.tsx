"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { getApp } from "@/apps/registry";

export interface Process {
  id: string;
  appId: string;
  windowId: string;
  status: "running" | "suspended";
  launchedAt: number;
}

interface ProcessContextType {
  processes: Map<string, Process>;
  launch: (appId: string, meta?: Record<string, string>) => string | null;
  kill: (processId: string) => void;
  getProcessByWindowId: (windowId: string) => Process | undefined;
  getProcessesByAppId: (appId: string) => Process[];
}

const ProcessContext = createContext<ProcessContextType | null>(null);

export function ProcessProvider({ children }: { children: ReactNode }) {
  const [processes, setProcesses] = useState<Map<string, Process>>(new Map());
  const { createWindow, closeWindow, focusWindow } = useWindowManager();

  const getProcessesByAppId = useCallback(
    (appId: string): Process[] => {
      return Array.from(processes.values()).filter((p) => p.appId === appId);
    },
    [processes]
  );

  const getProcessByWindowId = useCallback(
    (windowId: string): Process | undefined => {
      return Array.from(processes.values()).find((p) => p.windowId === windowId);
    },
    [processes]
  );

  const launch = useCallback(
    (appId: string, meta?: Record<string, string>): string | null => {
      const app = getApp(appId);
      if (!app) return null;

      // Check singleInstance: if already running, focus existing window
      if (app.singleInstance) {
        const existing = Array.from(processes.values()).find(
          (p) => p.appId === appId
        );
        if (existing) {
          focusWindow(existing.windowId);
          return existing.windowId;
        }
      }

      const timestamp = Date.now();
      const processId = `proc-${appId}-${timestamp}`;
      const windowId = `win-${appId}-${timestamp}`;

      // Create the window via WindowManagerContext
      createWindow({
        id: windowId,
        title: app.name,
        appId: app.id,
        rect: {
          x: app.defaultRect.x + Math.random() * 40,
          y: app.defaultRect.y + Math.random() * 40,
          width: app.defaultRect.width,
          height: app.defaultRect.height,
        },
        minSize: app.minSize,
        resizable: app.resizable,
        meta,
      });

      // Create process entry
      const process: Process = {
        id: processId,
        appId,
        windowId,
        status: "running",
        launchedAt: timestamp,
      };

      setProcesses((prev) => {
        const next = new Map(prev);
        next.set(processId, process);
        return next;
      });

      return windowId;
    },
    [processes, createWindow, focusWindow]
  );

  const kill = useCallback(
    (processId: string) => {
      const process = processes.get(processId);
      if (!process) return;

      closeWindow(process.windowId);

      setProcesses((prev) => {
        const next = new Map(prev);
        next.delete(processId);
        return next;
      });
    },
    [processes, closeWindow]
  );

  return (
    <ProcessContext.Provider
      value={{ processes, launch, kill, getProcessByWindowId, getProcessesByAppId }}
    >
      {children}
    </ProcessContext.Provider>
  );
}

export function useProcesses() {
  const ctx = useContext(ProcessContext);
  if (!ctx)
    throw new Error("useProcesses must be used within ProcessProvider");
  return ctx;
}

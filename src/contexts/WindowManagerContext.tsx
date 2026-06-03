"use client";

import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  type ReactNode,
} from "react";
import type {
  WindowAction,
  WindowConfig,
  WindowManagerState,
  WindowState,
  Rect,
} from "@/lib/window/types";

function windowReducer(
  state: WindowManagerState,
  action: WindowAction
): WindowManagerState {
  switch (action.type) {
    case "CREATE_WINDOW": {
      const { config } = action;
      const newWindow: WindowState = {
        id: config.id,
        title: config.title,
        rect: config.rect,
        prevRect: null,
        zIndex: 100 + state.windowOrder.length,
        status: "normal",
        minSize: config.minSize || { width: 200, height: 150 },
        resizable: config.resizable !== false,
        appId: config.appId,
        meta: config.meta ?? {},
      };
      const windows = new Map(state.windows);
      windows.set(config.id, newWindow);
      return {
        windows,
        windowOrder: [...state.windowOrder, config.id],
      };
    }

    case "CLOSE_WINDOW": {
      const windows = new Map(state.windows);
      windows.delete(action.id);
      return {
        windows,
        windowOrder: state.windowOrder.filter((id) => id !== action.id),
      };
    }

    case "FOCUS_WINDOW": {
      const order = state.windowOrder.filter((id) => id !== action.id);
      order.push(action.id);
      const windows = new Map(state.windows);
      order.forEach((id, i) => {
        const w = windows.get(id);
        if (w) windows.set(id, { ...w, zIndex: 100 + i });
      });
      return { windows, windowOrder: order };
    }

    case "MOVE_WINDOW": {
      const windows = new Map(state.windows);
      const w = windows.get(action.id);
      if (w) {
        windows.set(action.id, {
          ...w,
          rect: { ...w.rect, x: action.x, y: action.y },
        });
      }
      return { ...state, windows };
    }

    case "RESIZE_WINDOW": {
      const windows = new Map(state.windows);
      const w = windows.get(action.id);
      if (w) {
        windows.set(action.id, {
          ...w,
          rect: { ...w.rect, ...action.rect },
        });
      }
      return { ...state, windows };
    }

    case "MINIMIZE_WINDOW": {
      const windows = new Map(state.windows);
      const w = windows.get(action.id);
      if (w) windows.set(action.id, { ...w, status: "minimized" });
      return { ...state, windows };
    }

    case "MAXIMIZE_WINDOW": {
      const windows = new Map(state.windows);
      const w = windows.get(action.id);
      if (w) {
        const menuBarHeight = 28;
        const dockHeight = 80;
        windows.set(action.id, {
          ...w,
          prevRect: w.rect,
          status: "maximized",
          rect: {
            x: 0,
            y: menuBarHeight,
            width: typeof window !== "undefined" ? window.innerWidth : 1440,
            height:
              (typeof window !== "undefined" ? window.innerHeight : 900) -
              menuBarHeight -
              dockHeight,
          },
        });
      }
      return { ...state, windows };
    }

    case "RESTORE_WINDOW": {
      const windows = new Map(state.windows);
      const w = windows.get(action.id);
      if (w) {
        windows.set(action.id, {
          ...w,
          status: "normal",
          rect: w.prevRect || w.rect,
          prevRect: null,
        });
      }
      return { ...state, windows };
    }

    case "SET_TITLE": {
      const windows = new Map(state.windows);
      const w = windows.get(action.id);
      if (w) windows.set(action.id, { ...w, title: action.title });
      return { ...state, windows };
    }

    default:
      return state;
  }
}

const initialState: WindowManagerState = {
  windows: new Map(),
  windowOrder: [],
};

interface WindowManagerContextType {
  state: WindowManagerState;
  dispatch: React.Dispatch<WindowAction>;
  createWindow: (config: WindowConfig) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
}

const WindowManagerContext = createContext<WindowManagerContextType | null>(null);

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(windowReducer, initialState);

  const createWindow = useCallback(
    (config: WindowConfig) => dispatch({ type: "CREATE_WINDOW", config }),
    [dispatch]
  );

  const closeWindow = useCallback(
    (id: string) => dispatch({ type: "CLOSE_WINDOW", id }),
    [dispatch]
  );

  const focusWindow = useCallback(
    (id: string) => dispatch({ type: "FOCUS_WINDOW", id }),
    [dispatch]
  );

  return (
    <WindowManagerContext.Provider
      value={{ state, dispatch, createWindow, closeWindow, focusWindow }}
    >
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager() {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error("useWindowManager must be used within WindowManagerProvider");
  return ctx;
}

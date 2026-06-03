export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowState {
  id: string;
  title: string;
  rect: Rect;
  prevRect: Rect | null;
  zIndex: number;
  status: "normal" | "minimized" | "maximized";
  minSize: { width: number; height: number };
  resizable: boolean;
  appId: string;
  meta: Record<string, string>;
}

export interface WindowConfig {
  id: string;
  title: string;
  appId: string;
  rect: Rect;
  minSize?: { width: number; height: number };
  resizable?: boolean;
  meta?: Record<string, string>;
}

export type WindowAction =
  | { type: "CREATE_WINDOW"; config: WindowConfig }
  | { type: "CLOSE_WINDOW"; id: string }
  | { type: "FOCUS_WINDOW"; id: string }
  | { type: "MOVE_WINDOW"; id: string; x: number; y: number }
  | { type: "RESIZE_WINDOW"; id: string; rect: Partial<Rect> }
  | { type: "MINIMIZE_WINDOW"; id: string }
  | { type: "MAXIMIZE_WINDOW"; id: string }
  | { type: "RESTORE_WINDOW"; id: string }
  | { type: "SET_TITLE"; id: string; title: string };

export interface WindowManagerState {
  windows: Map<string, WindowState>;
  windowOrder: string[];
}

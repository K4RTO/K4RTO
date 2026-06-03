/**
 * Generic MenuBar ↔ app event bus.
 *
 * MenuBar dispatches a `CustomEvent("appMenuAction", { detail: { appId, type, payload } })`
 * when a menu item is clicked. The currently-focused app registers a listener via
 * `useAppMenuListener(appId, handler)` and responds to types it understands.
 *
 * Why a global event bus rather than props / context?
 * - MenuBar lives in Desktop; the active app lives inside a Window. Threading
 *   handlers down through WindowManager + ProcessContext + lazy(Suspense) is
 *   noisy and tightly couples MenuBar to every app's interface.
 * - The bus is the same pattern Finder already uses (`finderMenuAction`); this
 *   generalizes it.
 *
 * Naming convention: `type` strings are lowercase verbs (e.g. "new", "save",
 * "find"). Optional `payload` is a flat object.
 *
 * Backwards compat: Finder still dispatches its own `finderMenuAction` event.
 * That code path is preserved; this new bus is additive.
 */

import { useEffect, useRef } from "react";

export const APP_MENU_EVENT = "appMenuAction" as const;

export interface AppMenuActionDetail {
  /** The app this action targets (must match the active app's id, else ignored). */
  appId: string;
  /** Action verb — e.g. "new", "save", "find", "next-page". */
  type: string;
  /** Optional flat payload. */
  payload?: Record<string, unknown>;
}

/**
 * Fire an app-targeted menu action. Call from MenuBar.tsx.
 */
export function dispatchAppMenuAction(
  appId: string,
  type: string,
  payload?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const detail: AppMenuActionDetail = { appId, type, payload };
  window.dispatchEvent(new CustomEvent(APP_MENU_EVENT, { detail }));
}

/**
 * React hook to subscribe an app to its menu events.
 *
 * Listener only fires when `detail.appId` matches the passed `appId`.
 * The handler is taken from a closure on every event (so its latest version is
 * always called) — but the effect itself only re-attaches when `appId` changes.
 */
export function useAppMenuListener(
  appId: string,
  handler: (detail: AppMenuActionDetail) => void,
): void {
  // Stable ref so the listener always calls the latest handler without re-attach
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onEvent = (e: Event) => {
      const ce = e as CustomEvent<AppMenuActionDetail>;
      if (!ce.detail || ce.detail.appId !== appId) return;
      handlerRef.current(ce.detail);
    };
    window.addEventListener(APP_MENU_EVENT, onEvent);
    return () => window.removeEventListener(APP_MENU_EVENT, onEvent);
  }, [appId]);
}

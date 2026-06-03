"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT, useSystem } from "@/contexts/SystemContext";

// --- App ID → translation key map ---
const APP_NAME_KEYS: Record<string, string> = {
  finder: "dock.finder",
  safari: "dock.safari",
  notes: "dock.notes",
  textedit: "dock.textedit",
  terminal: "dock.terminal",
  calculator: "dock.calculator",
  calendar: "dock.calendar",
  settings: "dock.settings",
  preview: "dock.preview",
  vscode: "dock.vscode",
  word: "dock.word",
  music: "dock.music",
};

// --- Dispatch a custom event to communicate with Finder ---
function dispatchFinderAction(type: string, payload?: Record<string, string>) {
  window.dispatchEvent(new CustomEvent("finderMenuAction", { detail: { type, ...payload } }));
}

// --- Apple Logo ---
function AppleLogo() {
  return (
    <svg
      width="13" height="16"
      viewBox="0 0 814 1000"
      fill="currentColor"
    >
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.6 135.4-317.3 269-317.3 37.2 0 66.4 9.2 96.8 9.2 29.7 0 75.7-15.2 113.4-15.2 76.4 0 144.3 32.1 190.6 82.8zm-174-181.8c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
    </svg>
  );
}

// --- Clock Widget (hydration-safe) ---
function ClockWidget() {
  const { lang } = useSystem();
  const [time, setTime] = useState("");

  useEffect(() => {
    const locale = lang === "zh" ? "zh-CN" : "en-US";
    const formatTime = () => {
      const now = new Date();
      return now.toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: lang !== "zh",
      }).replace(/,/g, "");
    };

    setTime(formatTime());
    const timer = setInterval(() => setTime(formatTime()), 30000);
    return () => clearInterval(timer);
  }, [lang]);

  return <span className="text-[13px] text-white/85">{time}</span>;
}

function WifiIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-70">
      <path d="M1 4c3.9-3.5 10.1-3.5 14 0" strokeLinecap="round"/>
      <path d="M3.5 7c2.5-2.2 6.5-2.2 9 0" strokeLinecap="round"/>
      <path d="M6 10c1.1-1 2.9-1 4 0" strokeLinecap="round"/>
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="22" height="12" viewBox="0 0 22 12" fill="none" className="opacity-70">
      <rect x="0.5" y="0.5" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1"/>
      <rect x="2" y="2" width="13" height="8" rx="1" fill="currentColor" opacity="0.3"/>
      <path d="M20 4v4a1 1 0 0 0 0-4z" fill="currentColor"/>
    </svg>
  );
}

// --- Dropdown Menu ---
interface MenuItem {
  label: string;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  action?: () => void;
}

function DropdownMenu({
  items,
  onClose,
}: {
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="glass-surface glass-radius-popover absolute top-full left-0 mt-0.5 min-w-[220px] py-1 z-[10000]"
    >
      {items.map((item, i) =>
        item.separator ? (
          <div
            key={`sep-${i}`}
            className="my-1 mx-3 h-px"
            style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
          />
        ) : (
          <button
            key={item.label + i}
            className="w-full flex items-center justify-between px-4 py-0.5 text-[13px] text-white/85 text-left hover:bg-[#0058d0] hover:text-white rounded-[4px] mx-1"
            style={{
              width: "calc(100% - 8px)",
              opacity: item.disabled ? 0.4 : 1,
              pointerEvents: item.disabled ? "none" : "auto",
            }}
            onClick={() => { item.action?.(); onClose(); }}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-[12px] opacity-50 ml-6">{item.shortcut}</span>
            )}
          </button>
        )
      )}
    </div>
  );
}

// Stable menu key type (used for openMenu state — language-independent)
type MenuKey = "apple" | "app" | "File" | "Edit" | "View" | "Go" | "Window" | "Help";

// --- Menu Bar Component ---
export function MenuBar({
  activeAppName = "Finder",
  activeAppId = null,
  inputMethod = "en",
  onToggleInputMethod,
  onSpotlight,
  onNewFinderWindow,
  onCloseWindow,
  onMinimizeWindow,
  onZoomWindow,
  onAboutThisMac,
  onSystemSettings,
  onQuitApp,
  onHideApp,
  onHideOthers,
  onShowAll,
}: {
  activeAppName?: string;
  activeAppId?: string | null;
  inputMethod?: "en" | "zh";
  onToggleInputMethod?: () => void;
  onSpotlight?: () => void;
  onNewFinderWindow?: () => void;
  onCloseWindow?: () => void;
  onMinimizeWindow?: () => void;
  onZoomWindow?: () => void;
  onAboutThisMac?: () => void;
  onSystemSettings?: () => void;
  onQuitApp?: () => void;
  onHideApp?: () => void;
  onHideOthers?: () => void;
  onShowAll?: () => void;
}) {
  const t = useT();
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);

  // Resolve localized app name from appId, fall back to prop
  const localizedAppName = activeAppId && APP_NAME_KEYS[activeAppId]
    ? t(APP_NAME_KEYS[activeAppId])
    : activeAppName;

  // Build menus using translations
  const appleMenuItems: MenuItem[] = [
    { label: t("menu.apple.about"), action: onAboutThisMac },
    { label: "", separator: true },
    { label: t("menu.apple.systemSettings"), shortcut: "⌘,", action: onSystemSettings },
    { label: t("menu.apple.appStore"), disabled: true },
    { label: "", separator: true },
    { label: t("menu.apple.recentItems"), disabled: true },
    { label: "", separator: true },
    { label: t("menu.apple.forceQuit"), shortcut: "⌥⌘⎋", disabled: true },
    { label: "", separator: true },
    { label: t("menu.apple.sleep"), disabled: true },
    { label: t("menu.apple.restart"), disabled: true },
    { label: t("menu.apple.shutdown"), disabled: true },
    { label: "", separator: true },
    { label: t("menu.apple.lockScreen"), shortcut: "⌃⌘Q", disabled: true },
    { label: t("menu.apple.logOut"), shortcut: "⇧⌘Q", disabled: true },
  ];

  const isFinder = activeAppId === "finder";

  const fileMenuItems: MenuItem[] = isFinder ? [
    { label: t("menu.file.newFinderWindow"), shortcut: "⌘N", action: onNewFinderWindow },
    { label: t("menu.file.newFolder"), shortcut: "⇧⌘N", disabled: true },
    { label: t("menu.file.newTab"), shortcut: "⌘T", disabled: true },
    { label: "", separator: true },
    { label: t("menu.file.open"), shortcut: "⌘O", disabled: true },
    { label: t("menu.file.closeWindow"), shortcut: "⌘W", action: onCloseWindow },
    { label: "", separator: true },
    { label: t("menu.file.getInfo"), shortcut: "⌘I", disabled: true },
    { label: "", separator: true },
    { label: t("menu.file.moveToTrash"), shortcut: "⌘⌫", disabled: true },
  ] : [
    { label: t("menu.file.newFinderWindow"), shortcut: "⌘N" },
    { label: t("menu.file.newFolder"), shortcut: "⇧⌘N" },
    { label: t("menu.file.newTab"), shortcut: "⌘T" },
    { label: "", separator: true },
    { label: t("menu.file.open"), shortcut: "⌘O" },
    { label: t("menu.file.closeWindow"), shortcut: "⌘W" },
    { label: "", separator: true },
    { label: t("menu.file.getInfo"), shortcut: "⌘I" },
    { label: "", separator: true },
    { label: t("menu.file.moveToTrash"), shortcut: "⌘⌫" },
  ];

  const editMenuItems: MenuItem[] = [
    { label: t("menu.edit.undo"), shortcut: "⌘Z", disabled: isFinder },
    { label: t("menu.edit.redo"), shortcut: "⇧⌘Z", disabled: isFinder },
    { label: "", separator: true },
    { label: t("menu.edit.cut"), shortcut: "⌘X", disabled: isFinder },
    { label: t("menu.edit.copy"), shortcut: "⌘C", disabled: isFinder },
    { label: t("menu.edit.paste"), shortcut: "⌘V", disabled: isFinder },
    { label: t("menu.edit.selectAll"), shortcut: "⌘A", disabled: isFinder },
    { label: "", separator: true },
    { label: t("menu.edit.find"), shortcut: "⌘F", disabled: isFinder },
  ];

  const viewMenuItems: MenuItem[] = isFinder ? [
    { label: t("menu.view.asIcons"), shortcut: "⌘1", action: () => dispatchFinderAction("setView", { view: "icons" }) },
    { label: t("menu.view.asList"), shortcut: "⌘2", action: () => dispatchFinderAction("setView", { view: "list" }) },
    { label: t("menu.view.asColumns"), shortcut: "⌘3", disabled: true },
    { label: t("menu.view.asGallery"), shortcut: "⌘4", disabled: true },
    { label: "", separator: true },
    { label: t("menu.view.showSidebar"), shortcut: "⌥⌘S", disabled: true },
    { label: t("menu.view.showPreview"), shortcut: "⇧⌘P", disabled: true },
    { label: "", separator: true },
    { label: t("menu.view.showPathBar"), shortcut: "⌥⌘P", disabled: true },
    { label: t("menu.view.showStatusBar"), disabled: true },
  ] : [
    { label: t("menu.view.asIcons"), shortcut: "⌘1" },
    { label: t("menu.view.asList"), shortcut: "⌘2" },
    { label: t("menu.view.asColumns"), shortcut: "⌘3" },
    { label: t("menu.view.asGallery"), shortcut: "⌘4" },
    { label: "", separator: true },
    { label: t("menu.view.showSidebar"), shortcut: "⌥⌘S" },
    { label: t("menu.view.showPreview"), shortcut: "⇧⌘P" },
    { label: "", separator: true },
    { label: t("menu.view.showPathBar"), shortcut: "⌥⌘P" },
    { label: t("menu.view.showStatusBar") },
  ];

  const goMenuItems: MenuItem[] = isFinder ? [
    { label: t("menu.go.back"), shortcut: "⌘[", action: () => dispatchFinderAction("goBack") },
    { label: t("menu.go.forward"), shortcut: "⌘]", action: () => dispatchFinderAction("goForward") },
    { label: t("menu.go.enclosingFolder"), shortcut: "⌘↑", disabled: true },
    { label: "", separator: true },
    { label: t("menu.go.recents"), shortcut: "⇧⌘F", disabled: true },
    { label: t("menu.go.documents"), shortcut: "⇧⌘O", action: () => dispatchFinderAction("navigate", { path: "/Users/guest/Documents" }) },
    { label: t("menu.go.desktop"), shortcut: "⇧⌘D", action: () => dispatchFinderAction("navigate", { path: "/Users/guest/Desktop" }) },
    { label: t("menu.go.downloads"), shortcut: "⌥⌘L", action: () => dispatchFinderAction("navigate", { path: "/Users/guest/Downloads" }) },
    { label: t("menu.go.home"), shortcut: "⇧⌘H", disabled: true },
    { label: "", separator: true },
    { label: t("menu.go.goToFolder"), shortcut: "⇧⌘G", disabled: true },
  ] : [
    { label: t("menu.go.back"), shortcut: "⌘[" },
    { label: t("menu.go.forward"), shortcut: "⌘]" },
    { label: t("menu.go.enclosingFolder"), shortcut: "⌘↑" },
    { label: "", separator: true },
    { label: t("menu.go.recents"), shortcut: "⇧⌘F" },
    { label: t("menu.go.documents"), shortcut: "⇧⌘O" },
    { label: t("menu.go.desktop"), shortcut: "⇧⌘D" },
    { label: t("menu.go.downloads"), shortcut: "⌥⌘L" },
    { label: t("menu.go.home"), shortcut: "⇧⌘H" },
    { label: "", separator: true },
    { label: t("menu.go.goToFolder"), shortcut: "⇧⌘G" },
  ];

  const windowMenuItems: MenuItem[] = isFinder ? [
    { label: t("menu.window.minimize"), shortcut: "⌘M", action: onMinimizeWindow },
    { label: t("menu.window.zoom"), action: onZoomWindow },
    { label: "", separator: true },
    { label: t("menu.window.moveLeft"), disabled: true },
    { label: t("menu.window.moveRight"), disabled: true },
    { label: "", separator: true },
    { label: t("menu.window.bringAllToFront"), disabled: true },
  ] : [
    { label: t("menu.window.minimize"), shortcut: "⌘M" },
    { label: t("menu.window.zoom") },
    { label: "", separator: true },
    { label: t("menu.window.moveLeft") },
    { label: t("menu.window.moveRight") },
    { label: "", separator: true },
    { label: t("menu.window.bringAllToFront") },
  ];

  const helpMenuItems: MenuItem[] = [
    { label: t("menu.help.macosHelp"), disabled: isFinder },
    { label: "", separator: true },
    { label: t("menu.help.whatsNew"), disabled: isFinder },
    { label: t("menu.help.newToMac"), disabled: isFinder },
  ];

  const menuMap: Partial<Record<MenuKey, MenuItem[]>> = {
    File: fileMenuItems,
    Edit: editMenuItems,
    View: viewMenuItems,
    Go: goMenuItems,
    Window: windowMenuItems,
    Help: helpMenuItems,
  };

  const standardMenus: Array<{ key: MenuKey; label: string }> = [
    { key: "File",   label: t("menubar.file") },
    { key: "Edit",   label: t("menubar.edit") },
    { key: "View",   label: t("menubar.view") },
    { key: "Go",     label: t("menubar.go") },
    { key: "Window", label: t("menubar.window") },
    { key: "Help",   label: t("menubar.help") },
  ];

  const handleMenuClick = useCallback((menuKey: MenuKey) => {
    setOpenMenu((prev) => (prev === menuKey ? null : menuKey));
  }, []);

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  const handleMenuHover = useCallback((menuKey: MenuKey) => {
    if (openMenu !== null) setOpenMenu(menuKey);
  }, [openMenu]);

  return (
    <header
      className="glass-surface glass-thin fixed top-0 left-0 right-0 h-7 z-[9999] flex items-center justify-between px-4"
      style={{
        borderRadius: 0,
        borderBottom: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <div className="flex items-center">
        {/* Apple menu */}
        <div className="relative">
          <button
            className="flex items-center justify-center h-7 rounded hover:bg-white/10 text-white"
            style={{ width: 36, minWidth: 36 }}
            onClick={() => handleMenuClick("apple")}
            onMouseEnter={() => handleMenuHover("apple")}
          >
            <AppleLogo />
          </button>
          {openMenu === "apple" && (
            <DropdownMenu items={appleMenuItems} onClose={closeMenu} />
          )}
        </div>

        {/* Active app name */}
        <div className="relative" style={{ marginLeft: 4, marginRight: 8 }}>
          <button
            className="text-[13px] font-semibold text-white/85 rounded hover:bg-white/10 h-7 flex items-center"
            style={{ paddingLeft: 8, paddingRight: 8 }}
            onClick={() => handleMenuClick("app")}
            onMouseEnter={() => handleMenuHover("app")}
          >
            {localizedAppName}
          </button>
          {openMenu === "app" && (
            <DropdownMenu
              items={[
                { label: t("menu.app.about", { name: localizedAppName }), disabled: true },
                { label: "", separator: true },
                { label: t("menu.app.hide", { name: localizedAppName }), shortcut: "⌘H", action: onHideApp },
                { label: t("menu.app.hideOthers"), shortcut: "⌥⌘H", action: onHideOthers },
                { label: t("menu.app.showAll"), action: onShowAll },
                { label: "", separator: true },
                { label: t("menu.app.quit", { name: localizedAppName }), shortcut: "⌘Q", action: onQuitApp },
              ]}
              onClose={closeMenu}
            />
          )}
        </div>

        {/* Standard menus */}
        {standardMenus.map(({ key, label }) => (
          <div key={key} className="relative">
            <button
              className="text-[13px] text-white/85 rounded hover:bg-white/10 h-7 flex items-center"
              style={{ paddingLeft: 8, paddingRight: 8 }}
              onClick={() => handleMenuClick(key)}
              onMouseEnter={() => handleMenuHover(key)}
            >
              {label}
            </button>
            {openMenu === key && menuMap[key] && (
              <DropdownMenu items={menuMap[key]!} onClose={closeMenu} />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-white">
        {/* Spotlight */}
        <button
          onClick={onSpotlight}
          className="flex items-center justify-center w-6 h-7 rounded hover:bg-white/10 opacity-70 hover:opacity-100"
          title="Spotlight (⌘Space)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
        </button>
        {/* Input method toggle */}
        <button
          onClick={onToggleInputMethod}
          className="text-[13px] text-white/85 px-1.5 py-0.5 rounded hover:bg-white/10 font-medium"
          style={{ minWidth: 28 }}
        >
          {inputMethod === "en" ? "En" : "中"}
        </button>
        <WifiIcon />
        <BatteryIcon />
        <ClockWidget />
      </div>
    </header>
  );
}

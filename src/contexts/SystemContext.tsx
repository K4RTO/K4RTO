"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import translations from "@/lib/i18n/translations";

export type Lang = "en" | "zh";

interface SystemContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const SystemContext = createContext<SystemContextValue | null>(null);

export function SystemProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  return (
    <SystemContext.Provider value={{ lang, setLang }}>
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error("useSystem must be used within SystemProvider");
  return ctx;
}

export function useT() {
  const { lang } = useSystem();
  return useCallback((key: string, vars?: Record<string, string>): string => {
    const entry = translations[key];
    if (!entry) return key;
    const text = entry[lang] ?? entry.en ?? key;
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (_: string, k: string) => vars[k] ?? "");
  }, [lang]);
}

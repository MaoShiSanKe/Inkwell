"use client";

import { useEffect, useState } from "react";

import type { PublicThemeDefaultMode } from "@/lib/settings-config";
import { THEME_STORAGE_KEY, type ThemeMode, resolveThemeMode } from "@/lib/theme";

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
}

function resolveInitialTheme(defaultMode: PublicThemeDefaultMode): ThemeMode {
  return defaultMode === "dark" ? "dark" : "light";
}

export function ThemeToggle({ defaultMode = "system" }: { defaultMode?: PublicThemeDefaultMode }) {
  const [theme, setTheme] = useState<ThemeMode>(resolveInitialTheme(defaultMode));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setTheme(
      resolveThemeMode({
        storedMode: window.localStorage.getItem(THEME_STORAGE_KEY),
        defaultMode,
        systemPrefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
      }),
    );
  }, [defaultMode]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      aria-label="切换深色模式"
      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
      onClick={() => {
        const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        applyTheme(nextTheme);
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      }}
    >
      {theme === "dark" ? "浅色模式" : "深色模式"}
    </button>
  );
}

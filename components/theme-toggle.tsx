"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import type { PublicAccentTheme, PublicThemeDefaultMode } from "@/lib/settings-config";
import {
  THEME_STORAGE_KEY,
  type ThemeMode,
  resolveAccentBorderHoverClass,
  resolveAccentFocusRingClass,
  resolveThemeMode,
} from "@/lib/theme";

const THEME_CHANGE_EVENT = "inkwell-theme-change";

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
}

function resolveInitialTheme(defaultMode: PublicThemeDefaultMode): ThemeMode {
  return defaultMode === "dark" ? "dark" : "light";
}

function subscribeToThemeChanges(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      callback();
    }
  };
  const handleThemeChange = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  mediaQuery.addEventListener("change", handleThemeChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    mediaQuery.removeEventListener("change", handleThemeChange);
  };
}

function resolveThemeSnapshot(defaultMode: PublicThemeDefaultMode): ThemeMode {
  if (typeof window === "undefined") {
    return resolveInitialTheme(defaultMode);
  }

  return resolveThemeMode({
    storedMode: window.localStorage.getItem(THEME_STORAGE_KEY),
    defaultMode,
    systemPrefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
  });
}

export function ThemeToggle({
  defaultMode = "system",
  accentTheme,
}: {
  defaultMode?: PublicThemeDefaultMode;
  accentTheme?: PublicAccentTheme;
}) {
  const effectiveAccentTheme = accentTheme ?? "slate";
  const accentInteractionClass = `${resolveAccentBorderHoverClass(effectiveAccentTheme)} ${resolveAccentFocusRingClass(effectiveAccentTheme)}`;
  const getThemeSnapshot = useCallback(() => resolveThemeSnapshot(defaultMode), [defaultMode]);
  const getServerSnapshot = useCallback(() => resolveInitialTheme(defaultMode), [defaultMode]);
  const theme = useSyncExternalStore(subscribeToThemeChanges, getThemeSnapshot, getServerSnapshot);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      aria-label="切换深色模式"
      className={`inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900 ${accentInteractionClass}`}
      onClick={() => {
        const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        applyTheme(nextTheme);
        window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
      }}
    >
      {theme === "dark" ? "浅色模式" : "深色模式"}
    </button>
  );
}

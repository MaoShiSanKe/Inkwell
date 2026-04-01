"use client";

import { useEffect } from "react";

import type { PublicThemeDefaultMode } from "@/lib/settings-config";
import { THEME_STORAGE_KEY, type ThemeMode, resolveThemeMode } from "@/lib/theme";

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
}

export function ThemeScript({ defaultMode = "system" }: { defaultMode?: PublicThemeDefaultMode }) {
  useEffect(() => {
    applyTheme(
      resolveThemeMode({
        storedMode: window.localStorage.getItem(THEME_STORAGE_KEY),
        defaultMode,
        systemPrefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
      }),
    );
  }, [defaultMode]);

  return null;
}

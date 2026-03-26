"use client";

import { useMemo, useState } from "react";

const STORAGE_KEY = "inkwell-theme";

type ThemeMode = "light" | "dark";

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
}

function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const initialTheme = useMemo(() => resolveInitialTheme(), []);
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);

  if (typeof document !== "undefined") {
    applyTheme(theme);
  }

  return (
    <button
      type="button"
      aria-label="切换深色模式"
      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
      onClick={() => {
        const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        applyTheme(nextTheme);
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
      }}
    >
      {theme === "dark" ? "浅色模式" : "深色模式"}
    </button>
  );
}

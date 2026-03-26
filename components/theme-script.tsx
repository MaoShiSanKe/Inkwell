"use client";

import { useEffect } from "react";

const STORAGE_KEY = "inkwell-theme";

type ThemeMode = "light" | "dark";

function resolveTheme(): ThemeMode {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeScript() {
  useEffect(() => {
    const theme = resolveTheme();
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
  }, []);

  return null;
}

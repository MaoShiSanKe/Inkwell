import type {
  PublicAccentTheme,
  PublicLayoutWidth,
  PublicSurfaceVariant,
  PublicThemeDefaultMode,
} from "@/lib/settings-config";

export const THEME_STORAGE_KEY = "inkwell-theme";

export type ThemeMode = Exclude<PublicThemeDefaultMode, "system">;

export function parseThemeMode(value: string | null | undefined): ThemeMode | null {
  if (value === "light" || value === "dark") {
    return value;
  }

  return null;
}

export function resolveThemeMode({
  storedMode,
  defaultMode,
  systemPrefersDark,
}: {
  storedMode: string | null | undefined;
  defaultMode: PublicThemeDefaultMode;
  systemPrefersDark: boolean;
}): ThemeMode {
  const parsedStoredMode = parseThemeMode(storedMode);

  if (parsedStoredMode) {
    return parsedStoredMode;
  }

  if (defaultMode === "light" || defaultMode === "dark") {
    return defaultMode;
  }

  return systemPrefersDark ? "dark" : "light";
}

export function resolveContentWidthClass(width: PublicLayoutWidth) {
  switch (width) {
    case "narrow":
      return "max-w-3xl";
    case "wide":
      return "max-w-6xl";
    default:
      return "max-w-4xl";
  }
}

export function resolveSurfaceClass(variant: PublicSurfaceVariant) {
  switch (variant) {
    case "solid":
      return "border-slate-300 bg-slate-100/90 dark:border-slate-700 dark:bg-slate-900/90";
    default:
      return "border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/70";
  }
}

export function resolveAccentClass(theme: PublicAccentTheme) {
  switch (theme) {
    case "blue":
      return "text-blue-700 dark:text-blue-300";
    case "emerald":
      return "text-emerald-700 dark:text-emerald-300";
    case "amber":
      return "text-amber-700 dark:text-amber-300";
    default:
      return "text-slate-700 dark:text-slate-200";
  }
}


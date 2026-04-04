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

export function resolveAccentLinkClass(theme: PublicAccentTheme) {
  return `underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-700 dark:hover:decoration-slate-400 ${resolveAccentClass(theme)}`;
}

export function resolveEmptyStateSurfaceClass(variant: PublicSurfaceVariant) {
  switch (variant) {
    case "solid":
      return "border-slate-300 bg-slate-100/70 text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300";
    default:
      return "border-slate-300 bg-white/80 text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300";
  }
}

export function resolveAccentBorderHoverClass(theme: PublicAccentTheme) {
  switch (theme) {
    case "blue":
      return "hover:border-blue-300 dark:hover:border-blue-700";
    case "emerald":
      return "hover:border-emerald-300 dark:hover:border-emerald-700";
    case "amber":
      return "hover:border-amber-300 dark:hover:border-amber-700";
    default:
      return "hover:border-slate-400 dark:hover:border-slate-600";
  }
}

export function resolveAccentFocusRingClass(theme: PublicAccentTheme) {
  switch (theme) {
    case "blue":
      return "focus-visible:ring-blue-500/40";
    case "emerald":
      return "focus-visible:ring-emerald-500/40";
    case "amber":
      return "focus-visible:ring-amber-500/40";
    default:
      return "focus-visible:ring-slate-500/40";
  }
}

export function resolveAccentFocusBorderClass(theme: PublicAccentTheme) {
  switch (theme) {
    case "blue":
      return "focus:border-blue-500";
    case "emerald":
      return "focus:border-emerald-500";
    case "amber":
      return "focus:border-amber-500";
    default:
      return "focus:border-slate-500";
  }
}

import { describe, expect, it } from "vitest";

import {
  parseThemeMode,
  resolveAccentClass,
  resolveContentWidthClass,
  resolveEmptyStateSurfaceClass,
  resolveFieldSurfaceClass,
  resolvePrimaryButtonSurfaceClass,
  resolveSurfaceClass,
  resolveThemeMode,
} from "./theme";

describe("theme helpers", () => {
  it("resolves content width classes", () => {
    expect(resolveContentWidthClass("wide")).toBe("max-w-6xl");
    expect(resolveContentWidthClass("default")).toBe("max-w-4xl");
  });

  it("resolves surface classes", () => {
    expect(resolveSurfaceClass("solid")).toContain("bg-slate-100/90");
    expect(resolveSurfaceClass("soft")).toContain("bg-white/80");
  });

  it("resolves field surface classes", () => {
    expect(resolveFieldSurfaceClass("solid")).toContain("bg-slate-100/90");
    expect(resolveFieldSurfaceClass("soft")).toContain("bg-white");
  });

  it("resolves primary button surface classes", () => {
    expect(resolvePrimaryButtonSurfaceClass()).toContain("text-white");
    expect(resolvePrimaryButtonSurfaceClass()).toContain("dark:text-slate-900");
  });

  it("resolves empty state surface classes", () => {
    expect(resolveEmptyStateSurfaceClass("solid")).toContain("bg-slate-100/70");
    expect(resolveEmptyStateSurfaceClass("soft")).toContain("bg-white/80");
  });

  it("resolves accent classes", () => {
    expect(resolveAccentClass("blue")).toBe("text-blue-700 dark:text-blue-300");
    expect(resolveAccentClass("slate")).toBe("text-slate-700 dark:text-slate-200");
  });

  it("prefers stored theme over backend default and system preference", () => {
    expect(
      resolveThemeMode({
        storedMode: "light",
        defaultMode: "dark",
        systemPrefersDark: true,
      }),
    ).toBe("light");
  });

  it("prefers backend default when no stored theme exists", () => {
    expect(
      resolveThemeMode({
        storedMode: null,
        defaultMode: "dark",
        systemPrefersDark: false,
      }),
    ).toBe("dark");
  });

  it("falls back to system preference when stored theme and backend default are absent", () => {
    expect(
      resolveThemeMode({
        storedMode: null,
        defaultMode: "system",
        systemPrefersDark: true,
      }),
    ).toBe("dark");

    expect(
      resolveThemeMode({
        storedMode: undefined,
        defaultMode: "system",
        systemPrefersDark: false,
      }),
    ).toBe("light");
  });

  it("ignores invalid stored theme values", () => {
    expect(parseThemeMode("sepia")).toBeNull();
    expect(
      resolveThemeMode({
        storedMode: "sepia",
        defaultMode: "light",
        systemPrefersDark: true,
      }),
    ).toBe("light");
  });
});

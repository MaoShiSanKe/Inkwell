import { describe, expect, it } from "vitest";

import { parseThemeMode, resolveThemeMode } from "./theme";

describe("theme helpers", () => {
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

import { describe, expect, it } from "vitest";

import { normalizeUsername } from "./create-admin";

describe("create-admin username normalization", () => {
  it("normalizes casing, whitespace, and unsupported characters", () => {
    expect(normalizeUsername("  John Doe!@Example  ")).toBe("john-doeexample");
  });

  it("removes dangling hyphens after truncation", () => {
    expect(normalizeUsername(`${"a".repeat(63)} -`)).toBe("a".repeat(63));
  });

  it("returns an empty string when no slug-safe characters remain", () => {
    expect(normalizeUsername("!!!___")).toBe("");
  });
});

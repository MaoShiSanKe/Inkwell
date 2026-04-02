import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  it("renders accent-aware interaction classes when accent theme is provided", () => {
    const markup = renderToStaticMarkup(
      <ThemeToggle defaultMode="dark" accentTheme="blue" />,
    );

    expect(markup).toContain("focus-visible:ring-blue-500/40");
    expect(markup).toContain("hover:border-blue-300");
  });

  it("falls back to slate interaction classes when accent theme is omitted", () => {
    const markup = renderToStaticMarkup(<ThemeToggle defaultMode="dark" />);

    expect(markup).toContain("focus-visible:ring-slate-500/40");
    expect(markup).toContain("hover:border-slate-400");
  });
});

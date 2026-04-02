import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostTableOfContents } from "./post-table-of-contents";

describe("PostTableOfContents", () => {
  it("renders theme-aware surface and link classes", () => {
    const markup = renderToStaticMarkup(
      <PostTableOfContents
        items={[
          { id: "overview", title: "Overview", level: 2 },
          { id: "details", title: "Details", level: 3 },
        ]}
        accentTheme="blue"
        surfaceVariant="solid"
      />,
    );

    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
    expect(markup).toContain('href="#overview"');
    expect(markup).toContain('href="#details"');
  });

  it("returns null when toc is empty", () => {
    const markup = renderToStaticMarkup(
      <PostTableOfContents items={[]} accentTheme="emerald" surfaceVariant="soft" />,
    );

    expect(markup).toBe("");
  });
});

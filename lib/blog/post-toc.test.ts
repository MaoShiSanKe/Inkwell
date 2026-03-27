import { describe, expect, it } from "vitest";

import { buildPostHeadingAnchorId, parsePostContentForToc } from "./post-toc";

describe("buildPostHeadingAnchorId", () => {
  it("normalizes latin headings into stable anchor ids", () => {
    expect(buildPostHeadingAnchorId("  React & Next.js Guide!  ")).toBe("react-nextjs-guide");
  });
});

describe("parsePostContentForToc", () => {
  it("extracts ## and ### headings into toc items and content blocks", () => {
    const parsed = parsePostContentForToc([
      "开场段落",
      "",
      "## Overview",
      "Overview body",
      "",
      "### Details",
      "Details body",
    ].join("\n"));

    expect(parsed.tocItems).toEqual([
      { id: "overview", title: "Overview", level: 2 },
      { id: "details", title: "Details", level: 3 },
    ]);
    expect(parsed.blocks).toEqual([
      { type: "paragraph", content: "开场段落" },
      { type: "heading", id: "overview", title: "Overview", level: 2 },
      { type: "paragraph", content: "Overview body" },
      { type: "heading", id: "details", title: "Details", level: 3 },
      { type: "paragraph", content: "Details body" },
    ]);
  });

  it("deduplicates repeated headings with stable numeric suffixes", () => {
    const parsed = parsePostContentForToc(["## Repeat", "## Repeat", "### Repeat"].join("\n"));

    expect(parsed.tocItems.map((item) => item.id)).toEqual(["repeat", "repeat-2", "repeat-3"]);
  });

  it("keeps chinese heading anchors non-empty", () => {
    const parsed = parsePostContentForToc("## 中文 标题");

    expect(parsed.tocItems).toEqual([{ id: "中文-标题", title: "中文 标题", level: 2 }]);
  });

  it("supports CRLF content when extracting headings", () => {
    const parsed = parsePostContentForToc("## First\r\nBody\r\n\r\n### Second\r\nMore body");

    expect(parsed.tocItems).toEqual([
      { id: "first", title: "First", level: 2 },
      { id: "second", title: "Second", level: 3 },
    ]);
    expect(parsed.blocks).toEqual([
      { type: "heading", id: "first", title: "First", level: 2 },
      { type: "paragraph", content: "Body" },
      { type: "heading", id: "second", title: "Second", level: 3 },
      { type: "paragraph", content: "More body" },
    ]);
  });

  it("ignores invalid heading formats", () => {
    const parsed = parsePostContentForToc([
      "# Top level",
      "#### Too deep",
      "##No space",
      "###",
      "Text ## inline",
    ].join("\n"));

    expect(parsed.tocItems).toEqual([]);
    expect(parsed.blocks).toEqual([
      {
        type: "paragraph",
        content: ["# Top level", "#### Too deep", "##No space", "###", "Text ## inline"].join(
          "\n",
        ),
      },
    ]);
  });

  it("returns an empty toc when the content has no headings", () => {
    const parsed = parsePostContentForToc("Plain body\n\nAnother paragraph");

    expect(parsed.tocItems).toEqual([]);
    expect(parsed.blocks).toEqual([
      { type: "paragraph", content: "Plain body" },
      { type: "paragraph", content: "Another paragraph" },
    ]);
  });
});

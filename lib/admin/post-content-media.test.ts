import { describe, expect, it } from "vitest";

import {
  buildPostContentImageMarkdown,
  insertPostContentBlock,
} from "./post-content-media";

describe("buildPostContentImageMarkdown", () => {
  it("builds markdown image syntax from the media option", () => {
    expect(
      buildPostContentImageMarkdown({
        altText: "封面图",
        assetUrl: "/uploads/images/2026/03/cover.webp",
      }),
    ).toBe("![封面图](/uploads/images/2026/03/cover.webp)");
  });

  it("falls back to a default alt text and ignores bracket characters", () => {
    expect(
      buildPostContentImageMarkdown({
        altText: " [横幅图片] ",
        assetUrl: "https://cdn.example.com/banner.png",
      }),
    ).toBe("![横幅图片](https://cdn.example.com/banner.png)");
  });

  it("returns null when the media has no asset url", () => {
    expect(
      buildPostContentImageMarkdown({
        altText: "封面图",
        assetUrl: null,
      }),
    ).toBeNull();
  });
});

describe("insertPostContentBlock", () => {
  it("inserts a media block at the cursor with paragraph spacing", () => {
    const expectedValue = "开场段落\n\n![封面图](/uploads/images/2026/03/cover.webp)";
    const expectedCursorPosition = expectedValue.length;

    expect(
      insertPostContentBlock(
        "开场段落",
        "![封面图](/uploads/images/2026/03/cover.webp)",
        "开场段落".length,
        "开场段落".length,
      ),
    ).toEqual({
      value: expectedValue,
      selectionStart: expectedCursorPosition,
      selectionEnd: expectedCursorPosition,
    });
  });

  it("replaces the current selection and preserves surrounding paragraphs", () => {
    const expectedValue = [
      "第一段",
      "![替换图](https://cdn.example.com/replaced.png)",
      "第三段",
    ].join("\n\n");
    const expectedCursorPosition = ["第一段", "![替换图](https://cdn.example.com/replaced.png)"].join("\n\n").length;

    expect(
      insertPostContentBlock(
        ["第一段", "占位内容", "第三段"].join("\n\n"),
        "![替换图](https://cdn.example.com/replaced.png)",
        5,
        9,
      ),
    ).toEqual({
      value: expectedValue,
      selectionStart: expectedCursorPosition,
      selectionEnd: expectedCursorPosition,
    });
  });
});

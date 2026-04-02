import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CommentList } from "./comment-list";

describe("CommentList", () => {
  it("renders themed empty state", () => {
    const markup = renderToStaticMarkup(
      <CommentList comments={[]} postSlug="post-slug" accentTheme="blue" surfaceVariant="solid" />,
    );

    expect(markup).toContain("还没有评论");
    expect(markup).toContain("bg-slate-100/70");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
  });

  it("renders themed author and reply links", () => {
    const markup = renderToStaticMarkup(
      <CommentList
        postSlug="post-slug"
        accentTheme="emerald"
        surfaceVariant="soft"
        comments={[
          {
            id: 1,
            parentId: null,
            authorName: "Author",
            authorUrl: "https://example.com",
            content: "Top level comment",
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            replies: [
              {
                id: 2,
                parentId: 1,
                authorName: "Reply",
                authorUrl: "https://example.com/reply",
                content: "Reply body",
                createdAt: new Date("2026-04-01T01:00:00.000Z"),
              },
            ],
          },
        ]}
      />,
    );

    expect(markup).toContain("Top level comment");
    expect(markup).toContain("text-emerald-700 dark:text-emerald-300");
    expect(markup).toContain("underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-700 dark:hover:decoration-slate-400");
    expect(markup).toContain('href="/post/post-slug?replyTo=1#comment-form"');
    expect(markup).toContain("bg-white/80");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(blog)/post/[slug]/actions", () => ({
  likePostAction: vi.fn(),
}));

import { PostLikeButton } from "./post-like-button";

describe("PostLikeButton", () => {
  it("renders theme-aware surface and interaction classes", () => {
    const markup = renderToStaticMarkup(
      <PostLikeButton
        postId={1}
        postSlug="post-slug"
        initialLikeCount={2}
        accentTheme="blue"
        surfaceVariant="solid"
      />,
    );

    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("focus-visible:ring-blue-500/40");
    expect(markup).toContain("text-white");
    expect(markup).toContain("dark:text-slate-900");
    expect(markup).toContain("当前共有 2 次点赞。");
  });

  it("falls back to slate accent classes by default", () => {
    const markup = renderToStaticMarkup(
      <PostLikeButton postId={1} postSlug="post-slug" initialLikeCount={0} />,
    );

    expect(markup).toContain("focus-visible:ring-slate-500/40");
    expect(markup).toContain("text-white");
    expect(markup).toContain("dark:text-slate-900");
  });
});

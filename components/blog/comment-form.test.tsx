import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    className,
    children,
  }: {
    href: string;
    className?: string;
    children: React.ReactNode;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/app/(blog)/post/[slug]/actions", () => ({
  submitCommentAction: vi.fn(),
}));

import { CommentForm } from "./comment-form";

describe("CommentForm", () => {
  it("renders theme-aware surface and interaction classes", () => {
    const markup = renderToStaticMarkup(
      <CommentForm postId={1} postSlug="post-slug" accentTheme="blue" surfaceVariant="solid" />,
    );

    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("focus:border-blue-500");
    expect(markup).toContain("focus-visible:ring-blue-500/40");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
  });

  it("renders accent-themed reply link for reply mode", () => {
    const markup = renderToStaticMarkup(
      <CommentForm
        postId={1}
        postSlug="post-slug"
        accentTheme="emerald"
        surfaceVariant="soft"
        replyTarget={{ id: 2, authorName: "Reply Target" }}
      />,
    );

    expect(markup).toContain("取消回复");
    expect(markup).toContain("text-emerald-700 dark:text-emerald-300");
    expect(markup).toContain("underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-700 dark:hover:decoration-slate-400");
    expect(markup).toContain("当前正在回复 Reply Target。系统仅支持两层评论嵌套。");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSiteOriginMock,
  resolvePublishedPostBySlugMock,
  listRelatedPublishedPostsMock,
  listApprovedCommentsForPostMock,
  getPublishedPostLikeCountMock,
  getPublishedPostViewCountMock,
  recordPublishedPostViewMock,
} = vi.hoisted(() => ({
  getSiteOriginMock: vi.fn(),
  resolvePublishedPostBySlugMock: vi.fn(),
  listRelatedPublishedPostsMock: vi.fn(),
  listApprovedCommentsForPostMock: vi.fn(),
  getPublishedPostLikeCountMock: vi.fn(),
  getPublishedPostViewCountMock: vi.fn(),
  recordPublishedPostViewMock: vi.fn(),
}));

class RedirectSignal extends Error {
  constructor(readonly destination: string) {
    super(destination);
  }
}

class NotFoundSignal extends Error {
  constructor() {
    super("not-found");
  }
}

const { notFoundMock, permanentRedirectMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new NotFoundSignal();
  }),
  permanentRedirectMock: vi.fn((destination: string) => {
    throw new RedirectSignal(destination);
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  permanentRedirect: permanentRedirectMock,
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/blog/posts", () => ({
  resolvePublishedPostBySlug: resolvePublishedPostBySlugMock,
  listRelatedPublishedPosts: listRelatedPublishedPostsMock,
}));

vi.mock("@/lib/blog/comments", () => ({
  listApprovedCommentsForPost: listApprovedCommentsForPostMock,
}));

vi.mock("@/lib/blog/likes", () => ({
  getPublishedPostLikeCount: getPublishedPostLikeCountMock,
}));

vi.mock("@/lib/blog/views", () => ({
  getPublishedPostViewCount: getPublishedPostViewCountMock,
  recordPublishedPostView: recordPublishedPostViewMock,
}));

vi.mock("@/lib/settings", () => ({
  getSiteOrigin: getSiteOriginMock,
}));

vi.mock("@/components/blog/comment-form", () => ({
  CommentForm: ({ replyTarget }: { replyTarget?: { authorName: string } | null }) => (
    <div>
      comment-form
      {replyTarget ? ` replying:${replyTarget.authorName}` : " top-level"}
    </div>
  ),
}));

vi.mock("@/components/blog/comment-list", () => ({
  CommentList: ({ comments }: { comments: Array<{ authorName: string; replies: Array<{ authorName: string }> }> }) => (
    <div>
      comment-list
      {comments.map((comment) => (
        <span key={comment.authorName}>
          {comment.authorName}
          {comment.replies.map((reply) => (
            <span key={reply.authorName}>{reply.authorName}</span>
          ))}
        </span>
      ))}
    </div>
  ),
}));

vi.mock("@/components/blog/post-like-button", () => ({
  PostLikeButton: ({ initialLikeCount }: { initialLikeCount: number }) => (
    <div>{`post-like-button count:${initialLikeCount}`}</div>
  ),
}));

describe("blog post page", () => {
  beforeEach(() => {
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    resolvePublishedPostBySlugMock.mockReset();
    listRelatedPublishedPostsMock.mockReset();
    listRelatedPublishedPostsMock.mockResolvedValue([]);
    listApprovedCommentsForPostMock.mockReset();
    listApprovedCommentsForPostMock.mockResolvedValue([]);
    getPublishedPostLikeCountMock.mockReset();
    getPublishedPostLikeCountMock.mockResolvedValue(3);
    getPublishedPostViewCountMock.mockReset();
    getPublishedPostViewCountMock.mockResolvedValue(7);
    recordPublishedPostViewMock.mockReset();
    recordPublishedPostViewMock.mockResolvedValue(true);
    notFoundMock.mockClear();
    permanentRedirectMock.mockClear();
  });

  it("returns empty metadata when the slug resolves to a redirect", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "redirect",
      currentSlug: "current-slug",
    });

    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "old-slug" }),
    });

    expect(metadata).toEqual({});
  });

  it("redirects to the current slug when resolvePublishedPostBySlug returns a redirect", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "redirect",
      currentSlug: "current-slug",
    });

    const { default: PostPage } = await import("./page");

    await expect(
      PostPage({
        params: Promise.resolve({ slug: "old-slug" }),
      }),
    ).rejects.toMatchObject({
      destination: "/post/current-slug",
    });

    expect(permanentRedirectMock).toHaveBeenCalledWith("/post/current-slug");
  });

  it("calls notFound when the slug cannot be resolved", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "not-found",
    });

    const { default: PostPage } = await import("./page");

    await expect(
      PostPage({
        params: Promise.resolve({ slug: "missing-slug" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSignal);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("redirects to the canonical slug when the requested slug casing differs", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData(),
    });

    const { default: PostPage } = await import("./page");

    await expect(
      PostPage({
        params: Promise.resolve({ slug: "Canonical-Slug" }),
      }),
    ).rejects.toMatchObject({
      destination: "/post/canonical-slug",
    });

    expect(permanentRedirectMock).toHaveBeenCalledWith("/post/canonical-slug");
  });

  it("renders the published post page with related posts, reading time, views, likes, and comments when the requested slug matches", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData(),
    });
    listRelatedPublishedPostsMock.mockResolvedValue([
      {
        id: 2,
        title: "Related title",
        slug: "related-slug",
        excerpt: "Related excerpt",
        publishedAt: new Date("2026-03-26T16:00:00.000Z"),
        author: { displayName: "Author Name" },
        category: { name: "Frontend", slug: "frontend" },
      },
    ]);
    listApprovedCommentsForPostMock.mockResolvedValue([
      {
        id: 10,
        parentId: null,
        authorName: "Top Level",
        authorUrl: null,
        content: "First comment",
        createdAt: new Date("2026-03-26T14:00:00.000Z"),
        replies: [
          {
            id: 11,
            parentId: 10,
            authorName: "Reply User",
            authorUrl: null,
            content: "Reply comment",
            createdAt: new Date("2026-03-26T14:05:00.000Z"),
          },
        ],
      },
    ]);

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
      searchParams: Promise.resolve({ replyTo: "10" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Canonical title");
    expect(markup).toContain("Canonical excerpt");
    expect(markup).toContain("作者：Author Name");
    expect(markup).toContain("Canonical content body");
    expect(markup).toContain("发布时间：");
    expect(markup).toContain("预计阅读 1 分钟。");
    expect(markup).toContain("当前累计 7 次浏览。");
    expect(markup).toContain("相关文章");
    expect(markup).toContain("Related title");
    expect(markup).toContain("/post/related-slug");
    expect(markup).toContain("application/ld+json");
    expect(markup).toContain("post-like-button count:3");
    expect(markup).toContain("当前共有 2 条已公开评论。");
    expect(markup).toContain("comment-list");
    expect(markup).toContain("Top Level");
    expect(markup).toContain("Reply User");
    expect(markup).toContain("comment-form replying:Top Level");
    expect(recordPublishedPostViewMock).toHaveBeenCalledWith({ postId: 1 });
    expect(listRelatedPublishedPostsMock).toHaveBeenCalledWith({
      postId: 1,
      categoryId: 1,
      tagIds: [1, 2],
    });
  });

  it("renders the empty related posts state when no matches are available", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData(),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("相关文章");
    expect(markup).toContain("当前还没有可推荐的相关文章。");
  });
});

function createPostPageData() {
  return {
    id: 1,
    title: "Canonical title",
    slug: "canonical-slug",
    excerpt: "Canonical excerpt",
    content: "Canonical content body",
    publishedAt: new Date("2026-03-26T12:00:00.000Z"),
    updatedAt: new Date("2026-03-26T13:00:00.000Z"),
    author: {
      displayName: "Author Name",
    },
    seo: {
      metaTitle: "Metadata title",
      metaDescription: "Metadata description",
      ogTitle: "OG title",
      ogDescription: "OG description",
      canonicalUrl: null,
      breadcrumbEnabled: false,
      noindex: false,
      nofollow: false,
    },
    ogImage: null,
    category: {
      id: 1,
      name: "Frontend",
      slug: "frontend",
    },
    tags: [
      { id: 1, name: "React", slug: "react" },
      { id: 2, name: "Next.js", slug: "nextjs" },
    ],
  };
}

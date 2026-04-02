import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSiteBrandNameMock,
  getSiteOriginMock,
  getThemeFrameworkSettingsMock,
  resolvePublishedPostBySlugMock,
  listRelatedPublishedPostsMock,
  listApprovedCommentsForPostMock,
  getPublishedPostLikeCountMock,
  getPublishedPostViewCountMock,
  recordPublishedPostViewMock,
} = vi.hoisted(() => ({
  getSiteBrandNameMock: vi.fn(),
  getSiteOriginMock: vi.fn(),
  getThemeFrameworkSettingsMock: vi.fn(),
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
  getSiteBrandName: getSiteBrandNameMock,
  getSiteOrigin: getSiteOriginMock,
  getThemeFrameworkSettings: getThemeFrameworkSettingsMock,
}));

vi.mock("@/components/blog/comment-form", () => ({
  CommentForm: ({
    replyTarget,
    accentTheme,
    surfaceVariant,
  }: {
    replyTarget?: { authorName: string } | null;
    accentTheme?: string;
    surfaceVariant?: string;
  }) => (
    <div>
      comment-form:{accentTheme ?? ""}:{surfaceVariant ?? ""}
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
  PostLikeButton: ({
    initialLikeCount,
    accentTheme,
    surfaceVariant,
  }: {
    initialLikeCount: number;
    accentTheme?: string;
    surfaceVariant?: string;
  }) => <div>{`post-like-button count:${initialLikeCount}:${accentTheme ?? ""}:${surfaceVariant ?? ""}`}</div>,
}));

describe("blog post page", () => {
  beforeEach(() => {
    getSiteBrandNameMock.mockReset();
    getSiteBrandNameMock.mockResolvedValue("Inkwell Daily");
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    getThemeFrameworkSettingsMock.mockReset();
    getThemeFrameworkSettingsMock.mockResolvedValue(createThemeFrameworkSettings());
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

  it("returns metadata with configured site branding for a published post", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData(),
    });

    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });

    expect(metadata).toMatchObject({
      title: "Metadata title",
      description: "Metadata description",
      openGraph: {
        title: "OG title",
        description: "OG description",
        url: "https://example.com/post/canonical-slug",
        siteName: "Inkwell Daily",
      },
      twitter: {
        title: "OG title",
        description: "OG description",
      },
    });
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

  it("renders flat breadcrumbs when breadcrumbEnabled is false", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData(),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);
    const breadcrumbStart = markup.indexOf('aria-label="面包屑"');

    expect(markup).toContain("max-w-6xl");
    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
    const postLabelStart = markup.indexOf(">Post<");
    const breadcrumbMarkup =
      breadcrumbStart >= 0 && postLabelStart > breadcrumbStart
        ? markup.slice(breadcrumbStart, postLabelStart)
        : markup;

    expect(markup).toContain('aria-label="面包屑"');
    expect(breadcrumbMarkup).toContain('href="/"');
    expect(breadcrumbMarkup).toContain(">首页<");
    expect(breadcrumbMarkup).not.toContain('href="/category/frontend"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('>Canonical title<');
    expect(markup).toContain('"@type":"BreadcrumbList"');
    expect(markup).toContain('"item":"https://example.com/"');
    expect(markup).toContain('"item":"https://example.com/post/canonical-slug"');
    expect(markup).toContain('"publisher":{"@type":"Organization","name":"Inkwell Daily"}');
  });

  it("renders category path breadcrumbs when breadcrumbEnabled is true and categories exist", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData({
        seo: {
          metaTitle: "Metadata title",
          metaDescription: "Metadata description",
          ogTitle: "OG title",
          ogDescription: "OG description",
          canonicalUrl: null,
          breadcrumbEnabled: true,
          noindex: false,
          nofollow: false,
        },
        category: {
          id: 2,
          name: "Guides",
          slug: "guides",
        },
        categoryPath: [
          {
            id: 1,
            name: "Frontend",
            slug: "frontend",
          },
          {
            id: 2,
            name: "Guides",
            slug: "guides",
          },
        ],
      }),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('href="/category/frontend"');
    expect(markup).toContain('href="/category/guides"');
    expect(markup).toContain('>Frontend<');
    expect(markup).toContain('>Guides<');
    expect(markup).toContain('"item":"https://example.com/category/frontend"');
    expect(markup).toContain('"item":"https://example.com/category/guides"');
    expect(markup).toContain('"position":4');
  });

  it("falls back to flat breadcrumbs when breadcrumbEnabled is true but no category exists", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData({
        seo: {
          metaTitle: "Metadata title",
          metaDescription: "Metadata description",
          ogTitle: "OG title",
          ogDescription: "OG description",
          canonicalUrl: null,
          breadcrumbEnabled: true,
          noindex: false,
          nofollow: false,
        },
        category: null,
        categoryPath: [],
      }),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('href="/"');
    expect(markup).not.toContain('/category/frontend');
    expect(markup).toContain('"position":2');
    expect(markup).not.toContain('"position":3');
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
    expect(markup).toContain('href="/author/author-name"');
    expect(markup).toContain('href="/category/frontend"');
    expect(markup).toContain("分类：Frontend");
    expect(markup).toContain("Canonical content body");
    expect(markup).not.toContain("文章目录");
    expect(markup).toContain("发布时间：");
    expect(markup).toContain("最后更新：");
    expect(markup).toContain("预计阅读 1 分钟。");
    expect(markup).toContain("当前累计 7 次浏览。");
    expect(markup).toContain("相关文章");
    expect(markup).toContain("Related title");
    expect(markup).toContain("/post/related-slug");
    expect(markup).toContain("application/ld+json");
    expect(markup).toContain('"@type":"BreadcrumbList"');
    expect(markup).toContain("post-like-button count:3:blue:solid");
    expect(markup).toContain("当前共有 2 条已公开评论。");
    expect(markup).toContain("comment-list");
    expect(markup).toContain("Top Level");
    expect(markup).toContain("Reply User");
    expect(markup).toContain("comment-form:blue:solid replying:Top Level");
    expect(recordPublishedPostViewMock).toHaveBeenCalledWith({ postId: 1 });
    expect(listRelatedPublishedPostsMock).toHaveBeenCalledWith({
      postId: 1,
      categoryId: 1,
      tagIds: [1, 2],
    });
  });

  it("renders themed post classes", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData(),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("max-w-6xl");
    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
    expect(markup).toContain("comment-form:blue:solid top-level");
  });

  it("renders a clickable category link when the published post has a category", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData({
        category: {
          id: 2,
          name: "Guides",
          slug: "guides",
        },
      }),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('href="/category/guides"');
    expect(markup).toContain("分类：Guides");
  });

  it("renders a clickable series link when the published post has a series", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData({
        series: {
          id: 2,
          name: "Getting Started",
          slug: "getting-started",
        },
      }),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('href="/series/getting-started"');
    expect(markup).toContain("系列：Getting Started");
  });

  it("does not render the category link when the published post has no category", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData({ category: null, categoryPath: [] }),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).not.toContain('href="/category/frontend"');
    expect(markup).not.toContain("分类：Frontend");
  });

  it("does not render the series link when the published post has no series", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData({ series: null }),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).not.toContain('href="/series/getting-started"');
    expect(markup).not.toContain("系列：Getting Started");
  });

  it("renders the last updated timestamp from the published post data", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData({
        updatedAt: new Date("2026-03-27T09:45:00.000Z"),
      }),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("最后更新：");
    expect(markup).toContain('dateTime="2026-03-27T09:45:00.000Z"');
  });

  it("renders clickable tag links when the published post has tags", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData({
        tags: [
          { id: 1, name: "React", slug: "react" },
          { id: 2, name: "Next.js", slug: "nextjs" },
        ],
      }),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('aria-label="文章标签"');
    expect(markup).toContain('href="/tag/react"');
    expect(markup).toContain('href="/tag/nextjs"');
    expect(markup).toContain(">React<");
    expect(markup).toContain(">Next.js<");
  });

  it("does not render the tag section when the published post has no tags", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData({ tags: [] }),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).not.toContain('aria-label="文章标签"');
    expect(markup).not.toContain('href="/tag/react"');
    expect(markup).not.toContain('href="/tag/nextjs"');
  });

  it("renders a table of contents and heading anchors when the content includes plain-text headings", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: {
        ...createPostPageData(),
        content: [
          "Lead paragraph",
          "",
          "## Overview",
          "Overview body",
          "",
          "### Details",
          "Details body",
        ].join("\n"),
      },
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("文章目录");
    expect(markup).toContain('aria-label="文章目录"');
    expect(markup).toContain('href="#overview"');
    expect(markup).toContain('href="#details"');
    expect(markup).toContain('id="overview"');
    expect(markup).toContain('id="details"');
    expect(markup).toContain(">Overview<");
    expect(markup).toContain(">Details<");
    expect(markup).toContain("Overview body");
    expect(markup).toContain("Details body");
  });

  it("renders the empty related posts state when no matches are available", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData(),
    });
    listRelatedPublishedPostsMock.mockResolvedValue([]);

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("相关文章");
    expect(markup).toContain("当前还没有可推荐的相关文章。");
    expect(markup).not.toContain("Related title");
  });

  it("preserves raw post content formatting when the content has no headings", async () => {
    const rawContent = ["Lead paragraph", "", "Second paragraph", "", "Third paragraph"].join("\n");

    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData({
        content: rawContent,
      }),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).not.toContain("文章目录");
    expect(markup).toContain(`<p class="whitespace-pre-wrap">${rawContent}</p>`);
  });

  it("renders standalone markdown images from the parsed post content", async () => {
    resolvePublishedPostBySlugMock.mockResolvedValue({
      kind: "post",
      post: createPostPageData({
        content: [
          "Lead paragraph",
          "",
          "![封面图](/uploads/images/2026/03/cover.webp)",
          "",
          "## Overview",
          "Overview body",
        ].join("\n"),
      }),
    });

    const { default: PostPage } = await import("./page");
    const element = await PostPage({
      params: Promise.resolve({ slug: "canonical-slug" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Lead paragraph");
    expect(markup).toContain('<img class="h-auto w-full" src="/uploads/images/2026/03/cover.webp" alt="封面图"/>');
    expect(markup).toContain('href="#overview"');
    expect(markup).toContain("Overview body");
  });

});

type CreatePostPageDataOverrides = {
  id?: number;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  publishedAt?: Date;
  updatedAt?: Date;
  author?: {
    displayName?: string;
    slug?: string;
  };
  seo?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    canonicalUrl?: string | null;
    breadcrumbEnabled?: boolean;
    noindex?: boolean;
    nofollow?: boolean;
  };
  ogImage?: null;
  category?:
    | {
        id: number;
        name: string;
        slug: string;
      }
    | null;
  series?:
    | {
        id: number;
        name: string;
        slug: string;
      }
    | null;
  categoryPath?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
};

function createThemeFrameworkSettings(overrides: Record<string, unknown> = {}) {
  return {
    public_layout_width: "wide",
    public_surface_variant: "solid",
    public_accent_theme: "blue",
    ...overrides,
  };
}

function createPostPageData(overrides: CreatePostPageDataOverrides = {}) {
  const {
    author: authorOverrides,
    seo: seoOverrides,
    ogImage: ogImageOverride,
    category: categoryOverride,
    series: seriesOverride,
    categoryPath: categoryPathOverride,
    tags: tagOverrides,
    ...restOverrides
  } = overrides;

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
      slug: "author-name",
      ...(authorOverrides ?? {}),
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
      ...(seoOverrides ?? {}),
    },
    ogImage: ogImageOverride ?? null,
    category: categoryOverride === undefined
      ? {
          id: 1,
          name: "Frontend",
          slug: "frontend",
        }
      : categoryOverride,
    series: seriesOverride === undefined ? null : seriesOverride,
    categoryPath: categoryPathOverride ?? [
      {
        id: 1,
        name: "Frontend",
        slug: "frontend",
      },
    ],
    tags: tagOverrides ?? [
      { id: 1, name: "React", slug: "react" },
      { id: 2, name: "Next.js", slug: "nextjs" },
    ],
    ...restOverrides,
  };
}

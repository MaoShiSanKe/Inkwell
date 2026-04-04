import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteBrandNameMock, getSiteOriginMock, getThemeFrameworkSettingsMock, resolvePublishedTagArchiveBySlugMock } = vi.hoisted(() => ({
  getSiteBrandNameMock: vi.fn(),
  getSiteOriginMock: vi.fn(),
  getThemeFrameworkSettingsMock: vi.fn(),
  resolvePublishedTagArchiveBySlugMock: vi.fn(),
}));
class NotFoundSignal extends Error {
  constructor() {
    super("not-found");
  }
}

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new NotFoundSignal();
  }),
}));

type LinkStubProps = Omit<ComponentPropsWithoutRef<"a">, "href" | "children"> & {
  href: string;
  children: ReactNode;
};

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: LinkStubProps) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/lib/settings", () => ({
  getSiteBrandName: getSiteBrandNameMock,
  getSiteOrigin: getSiteOriginMock,
  getThemeFrameworkSettings: getThemeFrameworkSettingsMock,
}));
vi.mock("@/lib/blog/posts", () => ({
  resolvePublishedTagArchiveBySlug: resolvePublishedTagArchiveBySlugMock,
}));

describe("blog tag page", () => {
  beforeEach(() => {
    getSiteBrandNameMock.mockReset();
    getSiteBrandNameMock.mockResolvedValue("Inkwell Daily");
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    getThemeFrameworkSettingsMock.mockReset();
    getThemeFrameworkSettingsMock.mockResolvedValue(createThemeFrameworkSettings());
    resolvePublishedTagArchiveBySlugMock.mockReset();
    notFoundMock.mockClear();
  });

  it("renders themed archive classes", async () => {
    getThemeFrameworkSettingsMock.mockResolvedValue(
      createThemeFrameworkSettings({ public_archive_posts_variant: "compact" }),
    );
    resolvePublishedTagArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      tag: {
        id: 1,
        name: "Next.js",
        slug: "nextjs",
        description: "Tagged posts",
      },
      posts: [createPostListItem()],
    });

    const { default: TagPage } = await import("./page");
    const element = await TagPage({
      params: Promise.resolve({ slug: "nextjs" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("max-w-6xl");
    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
    expect(markup).toContain("gap-3");
    expect(markup).toContain("px-5 py-4");
    expect(markup).toContain("text-xs");
    expect(markup).toContain("text-xl");
    expect(markup).toContain("text-sm leading-6");
  });

  it("returns metadata for the tag archive including the RSS alternate", async () => {
    resolvePublishedTagArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      tag: {
        id: 1,
        name: "Next.js",
        slug: "nextjs",
        description: "Tagged posts",
      },
      posts: [],
    });

    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "nextjs" }),
    });

    expect(metadata).toMatchObject({
      title: "Next.js 标签",
      description: "Tagged posts",
      alternates: {
        canonical: "https://example.com/tag/nextjs",
        types: {
          "application/rss+xml": "https://example.com/tag/nextjs/rss.xml",
        },
      },
      openGraph: {
        url: "https://example.com/tag/nextjs",
        siteName: "Inkwell Daily",
      },
    });
  });

  it("renders the tag archive list", async () => {
    resolvePublishedTagArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      tag: {
        id: 1,
        name: "Next.js",
        slug: "nextjs",
        description: "Tagged posts",
      },
      posts: [createPostListItem()],
    });

    const { default: TagPage } = await import("./page");
    const element = await TagPage({
      params: Promise.resolve({ slug: "nextjs" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Next.js");
    expect(markup).toContain("Tagged posts");
    expect(markup).toContain("Published title");
    expect(markup).toContain("作者：Author Name");
    expect(markup).toContain('href="/author/author-name"');
    expect(markup).toContain("/post/published-slug");
    expect(markup).toContain("/category/frontend");
    expect(markup).toContain("underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-700 dark:hover:decoration-slate-400 text-blue-700 dark:text-blue-300");
  });

  it("calls notFound when the tag slug does not exist", async () => {
    resolvePublishedTagArchiveBySlugMock.mockResolvedValue({
      kind: "not-found",
    });

    const { default: TagPage } = await import("./page");

    await expect(
      TagPage({
        params: Promise.resolve({ slug: "missing-tag" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSignal);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state when the tag exists without published posts", async () => {
    resolvePublishedTagArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      tag: {
        id: 1,
        name: "Next.js",
        slug: "nextjs",
        description: null,
      },
      posts: [],
    });

    const { default: TagPage } = await import("./page");
    const element = await TagPage({
      params: Promise.resolve({ slug: "nextjs" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("这个标签下还没有已发布文章");
    expect(markup).toContain("文章发布并关联这个标签后，会自动出现在这里。");
    expect(markup).toContain("bg-slate-100/70");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
  });
});

function createThemeFrameworkSettings(overrides: Record<string, unknown> = {}) {
  return {
    public_layout_width: "wide",
    public_surface_variant: "solid",
    public_accent_theme: "blue",
    public_archive_posts_variant: "comfortable",
    ...overrides,
  };
}

function createPostListItem() {
  return {
    id: 1,
    title: "Published title",
    slug: "published-slug",
    excerpt: "Published excerpt",
    publishedAt: new Date("2026-03-26T12:00:00.000Z"),
    author: {
      displayName: "Author Name",
      slug: "author-name",
    },
    category: {
      name: "Frontend",
      slug: "frontend",
    },
  };
}

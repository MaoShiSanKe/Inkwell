import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteBrandNameMock, getSiteOriginMock, getThemeFrameworkSettingsMock, resolvePublishedCategoryArchiveBySlugMock } = vi.hoisted(() => ({
  getSiteBrandNameMock: vi.fn(),
  getSiteOriginMock: vi.fn(),
  getThemeFrameworkSettingsMock: vi.fn(),
  resolvePublishedCategoryArchiveBySlugMock: vi.fn(),
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
  resolvePublishedCategoryArchiveBySlug: resolvePublishedCategoryArchiveBySlugMock,
}));

describe("blog category page", () => {
  beforeEach(() => {
    getSiteBrandNameMock.mockReset();
    getSiteBrandNameMock.mockResolvedValue("Inkwell Daily");
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    getThemeFrameworkSettingsMock.mockReset();
    getThemeFrameworkSettingsMock.mockResolvedValue(createThemeFrameworkSettings());
    resolvePublishedCategoryArchiveBySlugMock.mockReset();
    notFoundMock.mockClear();
  });

  it("renders themed archive classes", async () => {
    resolvePublishedCategoryArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      category: {
        id: 1,
        name: "Frontend",
        slug: "frontend",
        description: "Frontend posts",
      },
      posts: [createPostListItem()],
    });

    const { default: CategoryPage } = await import("./page");
    const element = await CategoryPage({
      params: Promise.resolve({ slug: "frontend" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("max-w-6xl");
    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
  });

  it("returns metadata for the category archive including the RSS alternate", async () => {
    resolvePublishedCategoryArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      category: {
        id: 1,
        name: "Frontend",
        slug: "frontend",
        description: "Frontend posts",
      },
      posts: [],
    });

    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "frontend" }),
    });

    expect(metadata).toMatchObject({
      title: "Frontend 分类",
      description: "Frontend posts",
      alternates: {
        canonical: "https://example.com/category/frontend",
        types: {
          "application/rss+xml": "https://example.com/category/frontend/rss.xml",
        },
      },
      openGraph: {
        url: "https://example.com/category/frontend",
        siteName: "Inkwell Daily",
      },
    });
  });

  it("renders the category archive list", async () => {
    resolvePublishedCategoryArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      category: {
        id: 1,
        name: "Frontend",
        slug: "frontend",
        description: "Frontend posts",
      },
      posts: [createPostListItem()],
    });

    const { default: CategoryPage } = await import("./page");
    const element = await CategoryPage({
      params: Promise.resolve({ slug: "frontend" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Frontend");
    expect(markup).toContain("Frontend posts");
    expect(markup).toContain("Published title");
    expect(markup).toContain("作者：Author Name");
    expect(markup).toContain('href="/author/author-name"');
    expect(markup).toContain("/post/published-slug");
    expect(markup).toContain("underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-700 dark:hover:decoration-slate-400 text-blue-700 dark:text-blue-300");
  });

  it("calls notFound when the category slug does not exist", async () => {
    resolvePublishedCategoryArchiveBySlugMock.mockResolvedValue({
      kind: "not-found",
    });

    const { default: CategoryPage } = await import("./page");

    await expect(
      CategoryPage({
        params: Promise.resolve({ slug: "missing-category" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSignal);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state when the category exists without published posts", async () => {
    resolvePublishedCategoryArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      category: {
        id: 1,
        name: "Frontend",
        slug: "frontend",
        description: null,
      },
      posts: [],
    });

    const { default: CategoryPage } = await import("./page");
    const element = await CategoryPage({
      params: Promise.resolve({ slug: "frontend" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("这个分类下还没有已发布文章");
    expect(markup).toContain("文章发布后，会自动出现在这个分类归档页。");
    expect(markup).toContain("bg-slate-100/70");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
  });
});

function createThemeFrameworkSettings(overrides: Record<string, unknown> = {}) {
  return {
    public_layout_width: "wide",
    public_surface_variant: "solid",
    public_accent_theme: "blue",
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

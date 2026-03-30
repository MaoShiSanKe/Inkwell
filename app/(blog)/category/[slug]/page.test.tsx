import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteOriginMock, resolvePublishedCategoryArchiveBySlugMock } = vi.hoisted(() => ({
  getSiteOriginMock: vi.fn(),
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
  getSiteOrigin: getSiteOriginMock,
}));

vi.mock("@/lib/blog/posts", () => ({
  resolvePublishedCategoryArchiveBySlug: resolvePublishedCategoryArchiveBySlugMock,
}));

describe("blog category page", () => {
  beforeEach(() => {
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    resolvePublishedCategoryArchiveBySlugMock.mockReset();
    notFoundMock.mockClear();
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
  });
});

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

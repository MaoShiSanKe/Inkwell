import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteOriginMock, listPublishedPostsMock } = vi.hoisted(() => ({
  getSiteOriginMock: vi.fn(),
  listPublishedPostsMock: vi.fn(),
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

vi.mock("@/lib/settings", () => ({
  getSiteOrigin: getSiteOriginMock,
}));

vi.mock("@/lib/blog/posts", () => ({
  listPublishedPosts: listPublishedPostsMock,
}));

describe("blog home page", () => {
  beforeEach(() => {
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    listPublishedPostsMock.mockReset();
  });

  it("returns metadata for the homepage including the RSS alternate", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata();

    expect(metadata).toMatchObject({
      title: "首页",
      description: "一个面向内容管理、评论互动与 SEO 优化的自建博客框架。",
      alternates: {
        canonical: "https://example.com/",
        types: {
          "application/rss+xml": "https://example.com/rss.xml",
        },
      },
      openGraph: {
        type: "website",
        url: "https://example.com/",
      },
    });
  });

  it("renders the published post list", async () => {
    listPublishedPostsMock.mockResolvedValue([createPostListItem()]);

    const { default: BlogHomePage } = await import("./page");
    const element = await BlogHomePage();
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("最新文章");
    expect(markup).toContain("订阅新文章");
    expect(markup).toContain('href="/subscribe"');
    expect(markup).toContain("Published title");
    expect(markup).toContain("Published excerpt");
    expect(markup).toContain("作者：Author Name");
    expect(markup).toContain('href="/author/author-name"');
    expect(markup).toContain("/post/published-slug");
    expect(markup).toContain("/category/published-category");
  });

  it("renders the empty state when no published posts exist", async () => {
    listPublishedPostsMock.mockResolvedValue([]);

    const { default: BlogHomePage } = await import("./page");
    const element = await BlogHomePage();
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("还没有已发布文章");
    expect(markup).toContain("第一篇公开文章发布后，会显示在这里。");
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
      name: "Published Category",
      slug: "published-category",
    },
  };
}

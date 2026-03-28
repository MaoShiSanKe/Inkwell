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

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <div>theme-toggle</div>,
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

  it("renders the published post list", async () => {
    listPublishedPostsMock.mockResolvedValue([createPostListItem()]);

    const { default: BlogHomePage } = await import("./page");
    const element = await BlogHomePage();
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("最新文章");
    expect(markup).toContain("theme-toggle");
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

    expect(markup).toContain("theme-toggle");
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

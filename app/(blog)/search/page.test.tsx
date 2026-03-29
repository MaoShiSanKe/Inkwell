import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteOriginMock, searchPublishedPostsMock } = vi.hoisted(() => ({
  getSiteOriginMock: vi.fn(),
  searchPublishedPostsMock: vi.fn(),
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
  searchPublishedPosts: searchPublishedPostsMock,
}));

describe("search page", () => {
  beforeEach(() => {
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    searchPublishedPostsMock.mockReset();
  });

  it("renders helper copy when query is empty", async () => {
    const { default: SearchPage } = await import("./page");
    const element = await SearchPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("搜索已发布文章");
    expect(markup).toContain("输入关键词开始搜索");
    expect(searchPublishedPostsMock).not.toHaveBeenCalled();
  });

  it("renders matching search results", async () => {
    searchPublishedPostsMock.mockResolvedValue([createPostListItem()]);

    const { default: SearchPage } = await import("./page");
    const element = await SearchPage({ searchParams: Promise.resolve({ q: "Next.js" }) });
    const markup = renderToStaticMarkup(element);

    expect(searchPublishedPostsMock).toHaveBeenCalledWith("Next.js");
    expect(markup).toContain("共找到 1 篇与 “Next.js” 相关的已发布文章。");
    expect(markup).toContain("Published title");
    expect(markup).toContain("Published excerpt");
    expect(markup).toContain('href="/post/published-slug"');
  });

  it("renders an empty state when query returns no matches", async () => {
    searchPublishedPostsMock.mockResolvedValue([]);

    const { default: SearchPage } = await import("./page");
    const element = await SearchPage({ searchParams: Promise.resolve({ q: "missing" }) });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("没有找到相关文章");
    expect(markup).toContain("请尝试更换关键词");
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

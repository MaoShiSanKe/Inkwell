import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteBrandNameMock, getSiteOriginMock, getThemeFrameworkSettingsMock, searchPublishedPostsMock } = vi.hoisted(() => ({
  getSiteBrandNameMock: vi.fn(),
  getSiteOriginMock: vi.fn(),
  getThemeFrameworkSettingsMock: vi.fn(),
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
  getSiteBrandName: getSiteBrandNameMock,
  getSiteOrigin: getSiteOriginMock,
  getThemeFrameworkSettings: getThemeFrameworkSettingsMock,
}));

vi.mock("@/lib/blog/posts", () => ({
  searchPublishedPosts: searchPublishedPostsMock,
}));

describe("search page", () => {
  beforeEach(() => {
    getSiteBrandNameMock.mockReset();
    getSiteBrandNameMock.mockResolvedValue("Inkwell Daily");
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    getThemeFrameworkSettingsMock.mockReset();
    getThemeFrameworkSettingsMock.mockResolvedValue(createThemeFrameworkSettings());
    searchPublishedPostsMock.mockReset();
  });

  it("renders themed archive classes for search results", async () => {
    searchPublishedPostsMock.mockResolvedValue([createPostListItem()]);

    const { default: SearchPage } = await import("./page");
    const element = await SearchPage({ searchParams: Promise.resolve({ q: "Next.js" }) });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("max-w-6xl");
    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
  });


  it("returns metadata with configured site branding", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata();

    expect(metadata).toMatchObject({
      title: "搜索",
      alternates: {
        canonical: "https://example.com/search",
      },
      robots: {
        index: false,
        follow: false,
      },
      openGraph: {
        title: "Inkwell Daily 搜索",
        url: "https://example.com/search",
        siteName: "Inkwell Daily",
      },
      twitter: {
        title: "Inkwell Daily 搜索",
      },
    });
  });

  it("renders themed helper copy and controls when query is empty", async () => {
    const { default: SearchPage } = await import("./page");
    const element = await SearchPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("搜索已发布文章");
    expect(markup).toContain("输入关键词开始搜索");
    expect(markup).toContain("bg-slate-100/70");
    expect(markup).toContain("focus:border-blue-500");
    expect(markup).toContain("focus-visible:ring-blue-500/40");
    expect(searchPublishedPostsMock).not.toHaveBeenCalled();
  });

  it("renders themed matching search results", async () => {
    searchPublishedPostsMock.mockResolvedValue([createPostListItem()]);

    const { default: SearchPage } = await import("./page");
    const element = await SearchPage({ searchParams: Promise.resolve({ q: "Next.js" }) });
    const markup = renderToStaticMarkup(element);

    expect(searchPublishedPostsMock).toHaveBeenCalledWith("Next.js");
    expect(markup).toContain("共找到 1 篇与 “Next.js” 相关的已发布文章。");
    expect(markup).toContain("Published title");
    expect(markup).toContain("Published excerpt");
    expect(markup).toContain('href="/post/published-slug"');
    expect(markup).toContain('href="/author/author-name"');
    expect(markup).toContain('href="/category/published-category"');
    expect(markup).toContain("underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-700 dark:hover:decoration-slate-400 text-blue-700 dark:text-blue-300");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
  });

  it("renders an empty state when query returns no matches", async () => {
    searchPublishedPostsMock.mockResolvedValue([]);

    const { default: SearchPage } = await import("./page");
    const element = await SearchPage({ searchParams: Promise.resolve({ q: "missing" }) });
    const markup = renderToStaticMarkup(element);

    expect(searchPublishedPostsMock).toHaveBeenCalledWith("missing");
    expect(markup).toContain("没有找到相关文章");
    expect(markup).toContain("请尝试更换关键词");
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
      name: "Published Category",
      slug: "published-category",
    },
  };
}

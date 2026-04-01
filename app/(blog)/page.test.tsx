import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteOriginMock, getThemeFrameworkSettingsMock, listPublishedPostsMock } = vi.hoisted(
  () => ({
    getSiteOriginMock: vi.fn(),
    getThemeFrameworkSettingsMock: vi.fn(),
    listPublishedPostsMock: vi.fn(),
  }),
);

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
  getThemeFrameworkSettings: getThemeFrameworkSettingsMock,
}));

vi.mock("@/lib/blog/posts", () => ({
  listPublishedPosts: listPublishedPostsMock,
}));

describe("blog home page", () => {
  beforeEach(() => {
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    getThemeFrameworkSettingsMock.mockReset();
    getThemeFrameworkSettingsMock.mockResolvedValue(createThemeFrameworkSettings());
    listPublishedPostsMock.mockReset();
  });

  it("returns metadata for the homepage including configured brand and RSS alternate", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata();

    expect(metadata).toMatchObject({
      title: "首页",
      description: "浏览主题框架驱动的首页内容。",
      alternates: {
        canonical: "https://example.com/",
        types: {
          "application/rss+xml": "https://example.com/rss.xml",
        },
      },
      openGraph: {
        type: "website",
        title: "Inkwell Daily",
        description: "浏览主题框架驱动的首页内容。",
        url: "https://example.com/",
        siteName: "Inkwell Daily",
      },
      twitter: {
        card: "summary",
        title: "Inkwell Daily",
        description: "浏览主题框架驱动的首页内容。",
      },
    });
  });

  it("renders the published post list with theme framework settings", async () => {
    listPublishedPostsMock.mockResolvedValue([createPostListItem()]);

    const { default: BlogHomePage } = await import("./page");
    const element = await BlogHomePage();
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Inkwell Daily");
    expect(markup).toContain("最新文章与精选内容");
    expect(markup).toContain("浏览主题框架驱动的首页内容。");
    expect(markup).toContain("查看订阅");
    expect(markup).toContain('href="/newsletter"');
    expect(markup).toContain("Published title");
    expect(markup).toContain("Published excerpt");
    expect(markup).toContain("作者：Author Name");
    expect(markup).toContain('href="/author/author-name"');
    expect(markup).toContain("/post/published-slug");
    expect(markup).toContain("/category/published-category");
    expect(markup).toContain("max-w-6xl");
    expect(markup).toContain("bg-slate-100/90");
  });

  it("renders compact list cards and hides disabled post metadata", async () => {
    getThemeFrameworkSettingsMock.mockResolvedValue(
      createThemeFrameworkSettings({
        home_posts_variant: "compact",
        home_show_post_excerpt: false,
        home_show_post_author: false,
        home_show_post_category: false,
        home_show_post_date: false,
      }),
    );
    listPublishedPostsMock.mockResolvedValue([createPostListItem()]);

    const { default: BlogHomePage } = await import("./page");
    const element = await BlogHomePage();
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("px-5 py-4");
    expect(markup).toContain("text-xl font-semibold tracking-tight");
    expect(markup).not.toContain("Published excerpt");
    expect(markup).not.toContain("作者：Author Name");
    expect(markup).not.toContain("分类：Published Category");
    expect(markup).not.toContain("datetime=\"2026-03-26T12:00:00.000Z\"");
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

function createThemeFrameworkSettings(overrides: Record<string, unknown> = {}) {
  return {
    site_brand_name: "Inkwell Daily",
    site_tagline: "A configurable publishing shell.",
    home_hero_title: "最新文章与精选内容",
    home_hero_description: "浏览主题框架驱动的首页内容。",
    home_primary_cta_label: "查看订阅",
    home_primary_cta_url: "/newsletter",
    home_posts_variant: "comfortable",
    home_show_post_excerpt: true,
    home_show_post_author: true,
    home_show_post_category: true,
    home_show_post_date: true,
    public_layout_width: "wide",
    public_surface_variant: "solid",
    public_accent_theme: "blue",
    public_header_show_tagline: true,
    public_footer_blurb: "独立写作，持续发布。",
    public_footer_copyright: "© Inkwell",
    public_theme_default_mode: "dark",
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

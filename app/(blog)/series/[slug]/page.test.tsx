import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteBrandNameMock, getSiteOriginMock, getThemeFrameworkSettingsMock, resolvePublishedSeriesArchiveBySlugMock } = vi.hoisted(() => ({
  getSiteBrandNameMock: vi.fn(),
  getSiteOriginMock: vi.fn(),
  getThemeFrameworkSettingsMock: vi.fn(),
  resolvePublishedSeriesArchiveBySlugMock: vi.fn(),
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
  resolvePublishedSeriesArchiveBySlug: resolvePublishedSeriesArchiveBySlugMock,
}));

describe("blog series page", () => {
  beforeEach(() => {
    getSiteBrandNameMock.mockReset();
    getSiteBrandNameMock.mockResolvedValue("Inkwell Daily");
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    getThemeFrameworkSettingsMock.mockReset();
    getThemeFrameworkSettingsMock.mockResolvedValue(createThemeFrameworkSettings());
    resolvePublishedSeriesArchiveBySlugMock.mockReset();
    notFoundMock.mockClear();
  });

  it("renders themed archive classes", async () => {
    getThemeFrameworkSettingsMock.mockResolvedValue(
      createThemeFrameworkSettings({ public_archive_posts_variant: "compact" }),
    );
    resolvePublishedSeriesArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      series: {
        id: 1,
        name: "React Basics",
        slug: "react-basics",
        description: "Series description",
      },
      posts: [createPostListItem()],
    });

    const { default: SeriesPage } = await import("./page");
    const element = await SeriesPage({
      params: Promise.resolve({ slug: "react-basics" }),
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

  it("returns empty metadata when the series slug does not exist", async () => {
    resolvePublishedSeriesArchiveBySlugMock.mockResolvedValue({
      kind: "not-found",
    });

    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "missing-series" }),
    });

    expect(metadata).toEqual({});
  });

  it("returns metadata for the published series archive", async () => {
    resolvePublishedSeriesArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      series: {
        id: 1,
        name: "React Basics",
        slug: "react-basics",
        description: "从基础到实践的 React 系列。",
      },
      posts: [],
    });

    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "react-basics" }),
    });

    expect(metadata).toMatchObject({
      title: "React Basics 系列",
      description: "从基础到实践的 React 系列。",
      alternates: {
        canonical: "https://example.com/series/react-basics",
      },
      openGraph: {
        type: "website",
        title: "React Basics 系列",
        description: "从基础到实践的 React 系列。",
        url: "https://example.com/series/react-basics",
        siteName: "Inkwell Daily",
      },
      twitter: {
        card: "summary",
        title: "React Basics 系列",
        description: "从基础到实践的 React 系列。",
      },
    });
  });

  it("renders the series archive list", async () => {
    resolvePublishedSeriesArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      series: {
        id: 1,
        name: "React Basics",
        slug: "react-basics",
        description: "Series description",
      },
      posts: [createPostListItem()],
    });

    const { default: SeriesPage } = await import("./page");
    const element = await SeriesPage({
      params: Promise.resolve({ slug: "react-basics" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("React Basics");
    expect(markup).toContain("Series description");
    expect(markup).toContain("Published title");
    expect(markup).toContain("作者：Author Name");
    expect(markup).toContain('href="/author/author-name"');
    expect(markup).toContain("/post/published-slug");
    expect(markup).toContain("/category/frontend");
    expect(markup).toContain("underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-700 dark:hover:decoration-slate-400 text-blue-700 dark:text-blue-300");
  });

  it("calls notFound when the series slug does not exist", async () => {
    resolvePublishedSeriesArchiveBySlugMock.mockResolvedValue({
      kind: "not-found",
    });

    const { default: SeriesPage } = await import("./page");

    await expect(
      SeriesPage({
        params: Promise.resolve({ slug: "missing-series" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSignal);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state when the series exists without published posts", async () => {
    resolvePublishedSeriesArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      series: {
        id: 1,
        name: "React Basics",
        slug: "react-basics",
        description: null,
      },
      posts: [],
    });

    const { default: SeriesPage } = await import("./page");
    const element = await SeriesPage({
      params: Promise.resolve({ slug: "react-basics" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("这个系列下还没有已发布文章");
    expect(markup).toContain("文章发布并加入这个系列后，会自动出现在这里。");
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

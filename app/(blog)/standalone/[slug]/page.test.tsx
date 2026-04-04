import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteOriginMock, getThemeFrameworkSettingsMock, resolveStandalonePageBySlugMock } = vi.hoisted(() => ({
  getSiteOriginMock: vi.fn(),
  getThemeFrameworkSettingsMock: vi.fn(),
  resolveStandalonePageBySlugMock: vi.fn(),
}));

vi.mock("@/lib/settings", () => ({
  getSiteOrigin: getSiteOriginMock,
  getThemeFrameworkSettings: getThemeFrameworkSettingsMock,
}));

vi.mock("@/lib/blog/pages", () => ({
  resolveStandalonePageBySlug: resolveStandalonePageBySlugMock,
  resolveStandalonePageDescription: ({
    metaDescription,
    content,
  }: {
    metaDescription: string | null;
    content: string;
  }) => metaDescription?.trim() || content,
}));

describe("standalone page", () => {
  beforeEach(() => {
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    getThemeFrameworkSettingsMock.mockReset();
    getThemeFrameworkSettingsMock.mockResolvedValue(createThemeFrameworkSettings());
    resolveStandalonePageBySlugMock.mockReset();
  });

  it("renders themed standalone classes", async () => {
    resolveStandalonePageBySlugMock.mockResolvedValue({
      id: 1,
      title: "About",
      slug: "about",
      content: ["Intro", "", "## Section", "Body"].join("\n"),
      publishedAt: new Date("2026-03-30T12:00:00.000Z"),
      updatedAt: new Date("2026-03-30T12:10:00.000Z"),
      seo: {
        metaTitle: null,
        metaDescription: null,
        ogTitle: null,
        ogDescription: null,
        canonicalUrl: null,
        noindex: false,
        nofollow: false,
      },
      ogImage: null,
    });

    const { default: StandalonePage } = await import("./page");
    const element = await StandalonePage({
      params: Promise.resolve({ slug: "about" }),
    });
    const markup = await import("react-dom/server").then(({ renderToStaticMarkup }) =>
      renderToStaticMarkup(element),
    );

    expect(markup).toContain("max-w-6xl");
    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
    expect(markup).toContain("px-6 py-5");
    expect(markup).toContain("text-base leading-7");
  });

  it("renders compact longform classes", async () => {
    getThemeFrameworkSettingsMock.mockResolvedValue(
      createThemeFrameworkSettings({ public_longform_variant: "compact" }),
    );
    resolveStandalonePageBySlugMock.mockResolvedValue({
      id: 1,
      title: "About",
      slug: "about",
      content: ["Intro", "", "## Section", "Body"].join("\n"),
      publishedAt: new Date("2026-03-30T12:00:00.000Z"),
      updatedAt: new Date("2026-03-30T12:10:00.000Z"),
      seo: {
        metaTitle: null,
        metaDescription: null,
        ogTitle: null,
        ogDescription: null,
        canonicalUrl: null,
        noindex: false,
        nofollow: false,
      },
      ogImage: null,
    });

    const { default: StandalonePage } = await import("./page");
    const element = await StandalonePage({
      params: Promise.resolve({ slug: "about" }),
    });
    const markup = await import("react-dom/server").then(({ renderToStaticMarkup }) =>
      renderToStaticMarkup(element),
    );

    expect(markup).toContain("px-5 py-4");
    expect(markup).toContain("text-sm leading-6");
    expect(markup).toContain("text-xl font-semibold tracking-tight");
  });

  it("renders comfortable longform classes by default", async () => {
    resolveStandalonePageBySlugMock.mockResolvedValue({
      id: 1,
      title: "About",
      slug: "about",
      content: ["Intro", "", "## Section", "Body"].join("\n"),
      publishedAt: new Date("2026-03-30T12:00:00.000Z"),
      updatedAt: new Date("2026-03-30T12:10:00.000Z"),
      seo: {
        metaTitle: null,
        metaDescription: null,
        ogTitle: null,
        ogDescription: null,
        canonicalUrl: null,
        noindex: false,
        nofollow: false,
      },
      ogImage: null,
    });

    const { default: StandalonePage } = await import("./page");
    const element = await StandalonePage({
      params: Promise.resolve({ slug: "about" }),
    });
    const markup = await import("react-dom/server").then(({ renderToStaticMarkup }) =>
      renderToStaticMarkup(element),
    );

    expect(markup).toContain("px-6 py-5");
    expect(markup).toContain("text-2xl font-semibold tracking-tight");
  });

  it("returns metadata for a published standalone page", async () => {
    resolveStandalonePageBySlugMock.mockResolvedValue({
      id: 1,
      title: "About",
      slug: "about",
      content: "About body",
      publishedAt: new Date("2026-03-30T12:00:00.000Z"),
      updatedAt: new Date("2026-03-30T12:10:00.000Z"),
      seo: {
        metaTitle: "About title",
        metaDescription: "About description",
        ogTitle: null,
        ogDescription: null,
        canonicalUrl: null,
        noindex: false,
        nofollow: false,
      },
      ogImage: null,
    });

    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "about" }),
    });

    expect(metadata).toMatchObject({
      title: "About title",
      description: "About description",
      alternates: {
        canonical: "https://example.com/about",
      },
      openGraph: {
        url: "https://example.com/about",
      },
    });
  });

  it("renders TOC and content blocks for a published standalone page", async () => {
    resolveStandalonePageBySlugMock.mockResolvedValue({
      id: 1,
      title: "About",
      slug: "about",
      content: ["Intro", "", "## Section", "Body"].join("\n"),
      publishedAt: new Date("2026-03-30T12:00:00.000Z"),
      updatedAt: new Date("2026-03-30T12:10:00.000Z"),
      seo: {
        metaTitle: null,
        metaDescription: null,
        ogTitle: null,
        ogDescription: null,
        canonicalUrl: null,
        noindex: false,
        nofollow: false,
      },
      ogImage: null,
    });

    const { default: StandalonePage } = await import("./page");
    const element = await StandalonePage({
      params: Promise.resolve({ slug: "about" }),
    });
    const markup = await import("react-dom/server").then(({ renderToStaticMarkup }) =>
      renderToStaticMarkup(element),
    );

    expect(markup).toContain("About");
    expect(markup).toContain("文章目录");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("Section");
    expect(markup).toContain("Body");
  });
});

function createThemeFrameworkSettings(overrides: Record<string, unknown> = {}) {
  return {
    public_layout_width: "wide",
    public_surface_variant: "solid",
    public_accent_theme: "blue",
    public_longform_variant: "comfortable",
    ...overrides,
  };
}

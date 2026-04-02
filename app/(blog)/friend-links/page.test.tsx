import { beforeEach, describe, expect, it, vi } from "vitest";

const { listPublicFriendLinksMock, getFriendLinksPageMetadataMock, getThemeFrameworkSettingsMock } = vi.hoisted(() => ({
  listPublicFriendLinksMock: vi.fn(),
  getFriendLinksPageMetadataMock: vi.fn(),
  getThemeFrameworkSettingsMock: vi.fn(),
}));

vi.mock("@/lib/blog/friend-links", () => ({
  listPublicFriendLinks: listPublicFriendLinksMock,
  getFriendLinksPageMetadata: getFriendLinksPageMetadataMock,
}));

vi.mock("@/lib/settings", () => ({
  getThemeFrameworkSettings: getThemeFrameworkSettingsMock,
}));

describe("friend-links page", () => {
  beforeEach(() => {
    listPublicFriendLinksMock.mockReset();
    getFriendLinksPageMetadataMock.mockReset();
    getThemeFrameworkSettingsMock.mockReset();
    getThemeFrameworkSettingsMock.mockResolvedValue(createThemeFrameworkSettings());
    getFriendLinksPageMetadataMock.mockResolvedValue({
      title: "友情链接 | Inkwell Daily",
      description: "浏览站点公开展示的友情链接列表。",
      canonicalUrl: "https://example.com/friend-links",
    });
  });

  it("renders themed friend-link classes", async () => {
    listPublicFriendLinksMock.mockResolvedValue([
      {
        id: 1,
        siteName: "Friend Site",
        url: "https://friend.example.com",
        description: "A friendly blog.",
        sortOrder: 1,
        updatedAt: new Date("2026-03-30T12:00:00.000Z"),
        logo: null,
        logoUrl: null,
      },
    ]);

    const { default: FriendLinksPage } = await import("./page");
    const element = await FriendLinksPage();
    const markup = await import("react-dom/server").then(({ renderToStaticMarkup }) =>
      renderToStaticMarkup(element),
    );

    expect(markup).toContain("max-w-6xl");
    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
  });


  it("returns metadata for the public friend-links page", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata();

    expect(metadata).toMatchObject({
      title: "友情链接 | Inkwell Daily",
      description: "浏览站点公开展示的友情链接列表。",
      alternates: {
        canonical: "https://example.com/friend-links",
      },
      openGraph: {
        url: "https://example.com/friend-links",
      },
    });
  });

  it("renders themed empty and fallback friend-link details", async () => {
    listPublicFriendLinksMock.mockResolvedValue([
      {
        id: 1,
        siteName: "Friend Site",
        url: "https://friend.example.com",
        description: null,
        sortOrder: 1,
        updatedAt: new Date("2026-03-30T12:00:00.000Z"),
        logo: null,
        logoUrl: null,
      },
    ]);

    const { default: FriendLinksPage } = await import("./page");
    const element = await FriendLinksPage();
    const markup = await import("react-dom/server").then(({ renderToStaticMarkup }) =>
      renderToStaticMarkup(element),
    );

    expect(markup).toContain("友情链接");
    expect(markup).toContain("Friend Site");
    expect(markup).toContain("https://friend.example.com");
    expect(markup).toContain("underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-700 dark:hover:decoration-slate-400 text-blue-700 dark:text-blue-300");
    expect(markup).toContain("LINK");
    expect(markup).toContain("暂无描述。");
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
  });

  it("renders themed empty state when no published friend links exist", async () => {
    listPublicFriendLinksMock.mockResolvedValue([]);

    const { default: FriendLinksPage } = await import("./page");
    const element = await FriendLinksPage();
    const markup = await import("react-dom/server").then(({ renderToStaticMarkup }) =>
      renderToStaticMarkup(element),
    );

    expect(markup).toContain("暂时还没有公开友链");
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

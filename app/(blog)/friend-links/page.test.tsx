import { beforeEach, describe, expect, it, vi } from "vitest";

const { listPublicFriendLinksMock, getFriendLinksPageMetadataMock } = vi.hoisted(() => ({
  listPublicFriendLinksMock: vi.fn(),
  getFriendLinksPageMetadataMock: vi.fn(),
}));

vi.mock("@/lib/blog/friend-links", () => ({
  listPublicFriendLinks: listPublicFriendLinksMock,
  getFriendLinksPageMetadata: getFriendLinksPageMetadataMock,
}));

describe("friend-links page", () => {
  beforeEach(() => {
    listPublicFriendLinksMock.mockReset();
    getFriendLinksPageMetadataMock.mockReset();
    getFriendLinksPageMetadataMock.mockResolvedValue({
      title: "友情链接 | Inkwell",
      description: "浏览站点公开展示的友情链接列表。",
      canonicalUrl: "https://example.com/friend-links",
    });
  });

  it("returns metadata for the public friend-links page", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata();

    expect(metadata).toMatchObject({
      title: "友情链接 | Inkwell",
      description: "浏览站点公开展示的友情链接列表。",
      alternates: {
        canonical: "https://example.com/friend-links",
      },
      openGraph: {
        url: "https://example.com/friend-links",
      },
    });
  });

  it("renders published friend link cards with safe external link attributes", async () => {
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

    expect(markup).toContain("友情链接");
    expect(markup).toContain("Friend Site");
    expect(markup).toContain("https://friend.example.com");
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
  });
});

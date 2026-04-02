import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolvePublishedTagRssBySlugMock, getSiteBrandNameMock, getSiteOriginMock, notFoundMock } = vi.hoisted(() => ({
  resolvePublishedTagRssBySlugMock: vi.fn(),
  getSiteBrandNameMock: vi.fn(),
  getSiteOriginMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("not-found");
  }),
}));
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/lib/blog/posts", () => ({
  resolvePublishedTagRssBySlug: resolvePublishedTagRssBySlugMock,
}));

vi.mock("@/lib/settings", () => ({
  getSiteBrandName: getSiteBrandNameMock,
  getSiteOrigin: getSiteOriginMock,
}));

describe("tag rss route", () => {
  beforeEach(() => {
    resolvePublishedTagRssBySlugMock.mockReset();
    getSiteBrandNameMock.mockReset();
    getSiteBrandNameMock.mockResolvedValue("Inkwell Daily");
    getSiteOriginMock.mockReset();
    notFoundMock.mockClear();
    getSiteOriginMock.mockReturnValue("https://example.com");
  });

  it("returns tag RSS XML with application/xml content type", async () => {
    resolvePublishedTagRssBySlugMock.mockResolvedValue({
      kind: "feed",
      tag: {
        id: 1,
        name: "Next.js",
        slug: "nextjs",
        description: "Next.js posts",
      },
      posts: [
        {
          title: "Next.js RSS",
          slug: "nextjs-rss",
          excerpt: "Next.js excerpt",
          content: "<p>Next.js content</p>",
          publishedAt: new Date("2026-03-27T03:00:00.000Z"),
          updatedAt: new Date("2026-03-27T03:30:00.000Z"),
          author: {
            displayName: "Admin",
          },
        },
      ],
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/tag/nextjs/rss.xml"), {
      params: Promise.resolve({ slug: "nextjs" }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(body).toContain("<title>Next.js 标签 RSS | Inkwell Daily</title>");
    expect(body).toContain("<link>https://example.com/tag/nextjs</link>");
    expect(body).toContain("<description>Next.js posts</description>");
    expect(body).toContain("<link>https://example.com/post/nextjs-rss</link>");
  });

  it("calls notFound when the tag feed slug cannot be resolved", async () => {
    resolvePublishedTagRssBySlugMock.mockResolvedValue({ kind: "not-found" });

    const { GET } = await import("./route");

    await expect(
      GET(new Request("https://example.com/tag/missing/rss.xml"), {
        params: Promise.resolve({ slug: "missing" }),
      }),
    ).rejects.toThrow("not-found");
  });
});

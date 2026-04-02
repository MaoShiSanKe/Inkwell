import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolvePublishedCategoryRssBySlugMock, getSiteBrandNameMock, getSiteOriginMock, notFoundMock } = vi.hoisted(() => ({
  resolvePublishedCategoryRssBySlugMock: vi.fn(),
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
  resolvePublishedCategoryRssBySlug: resolvePublishedCategoryRssBySlugMock,
}));

vi.mock("@/lib/settings", () => ({
  getSiteBrandName: getSiteBrandNameMock,
  getSiteOrigin: getSiteOriginMock,
}));

describe("category rss route", () => {
  beforeEach(() => {
    resolvePublishedCategoryRssBySlugMock.mockReset();
    getSiteBrandNameMock.mockReset();
    getSiteBrandNameMock.mockResolvedValue("Inkwell Daily");
    getSiteOriginMock.mockReset();
    notFoundMock.mockClear();
    getSiteOriginMock.mockReturnValue("https://example.com");
  });

  it("returns category RSS XML with application/xml content type", async () => {
    resolvePublishedCategoryRssBySlugMock.mockResolvedValue({
      kind: "feed",
      category: {
        id: 1,
        name: "Frontend",
        slug: "frontend",
        description: "Frontend articles",
      },
      posts: [
        {
          title: "Frontend RSS",
          slug: "frontend-rss",
          excerpt: "Frontend excerpt",
          content: "<p>Frontend content</p>",
          publishedAt: new Date("2026-03-27T03:00:00.000Z"),
          updatedAt: new Date("2026-03-27T03:30:00.000Z"),
          author: {
            displayName: "Admin",
          },
        },
      ],
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/category/frontend/rss.xml"), {
      params: Promise.resolve({ slug: "frontend" }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(body).toContain("<title>Frontend 分类 RSS | Inkwell Daily</title>");
    expect(body).toContain("<link>https://example.com/category/frontend</link>");
    expect(body).toContain("<description>Frontend articles</description>");
    expect(body).toContain("<link>https://example.com/post/frontend-rss</link>");
  });

  it("calls notFound when the category feed slug cannot be resolved", async () => {
    resolvePublishedCategoryRssBySlugMock.mockResolvedValue({ kind: "not-found" });

    const { GET } = await import("./route");

    await expect(
      GET(new Request("https://example.com/category/missing/rss.xml"), {
        params: Promise.resolve({ slug: "missing" }),
      }),
    ).rejects.toThrow("not-found");
  });
});

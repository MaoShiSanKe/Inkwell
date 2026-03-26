import { beforeEach, describe, expect, it, vi } from "vitest";

const { listPublishedRssPostsMock, getSiteOriginMock } = vi.hoisted(() => ({
  listPublishedRssPostsMock: vi.fn(),
  getSiteOriginMock: vi.fn(),
}));

vi.mock("@/lib/blog/posts", () => ({
  listPublishedRssPosts: listPublishedRssPostsMock,
}));

vi.mock("@/lib/settings", () => ({
  getSiteOrigin: getSiteOriginMock,
}));

describe("rss.xml route", () => {
  beforeEach(() => {
    listPublishedRssPostsMock.mockReset();
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
  });

  it("returns RSS XML with application/xml content type", async () => {
    listPublishedRssPostsMock.mockResolvedValue([
      {
        title: "Hello RSS",
        slug: "hello-rss",
        excerpt: "RSS excerpt",
        content: "<p>RSS content</p>",
        publishedAt: new Date("2026-03-27T03:00:00.000Z"),
        updatedAt: new Date("2026-03-27T03:30:00.000Z"),
        author: {
          displayName: "Admin",
        },
      },
    ]);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(body).toContain("<rss version=\"2.0\">");
    expect(body).toContain("<title>Inkwell RSS</title>");
    expect(body).toContain("<link>https://example.com/post/hello-rss</link>");
    expect(body).toContain("<description>RSS excerpt</description>");
  });
});

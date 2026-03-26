import { beforeEach, describe, expect, it, vi } from "vitest";

const { listSitemapEntriesMock, getSiteOriginMock } = vi.hoisted(() => ({
  listSitemapEntriesMock: vi.fn(),
  getSiteOriginMock: vi.fn(),
}));

vi.mock("@/lib/blog/posts", () => ({
  listSitemapEntries: listSitemapEntriesMock,
}));

vi.mock("@/lib/settings", () => ({
  getSiteOrigin: getSiteOriginMock,
}));

describe("sitemap.xml route", () => {
  beforeEach(() => {
    listSitemapEntriesMock.mockReset();
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
  });

  it("returns sitemap XML with application/xml content type", async () => {
    listSitemapEntriesMock.mockResolvedValue([
      {
        loc: "/post/hello-world",
        lastModifiedAt: new Date("2026-03-27T02:00:00.000Z"),
      },
    ]);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(body).toContain("<loc>https://example.com/post/hello-world</loc>");
    expect(body).toContain("<lastmod>2026-03-27T02:00:00.000Z</lastmod>");
  });
});

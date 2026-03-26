import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteOriginMock } = vi.hoisted(() => ({
  getSiteOriginMock: vi.fn(),
}));

vi.mock("@/lib/settings", () => ({
  getSiteOrigin: getSiteOriginMock,
}));

describe("robots.txt route", () => {
  beforeEach(() => {
    getSiteOriginMock.mockReset();
  });

  it("returns robots.txt with absolute sitemap URL when origin exists", async () => {
    getSiteOriginMock.mockReturnValue("https://example.com");

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Allow: /");
    expect(body).toContain("Sitemap: https://example.com/sitemap.xml");
  });

  it("falls back to relative sitemap path when origin is missing", async () => {
    getSiteOriginMock.mockReturnValue(null);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.text();

    expect(body).toContain("Sitemap: /sitemap.xml");
  });
});

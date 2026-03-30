import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminPathMock, isIpBlacklistedMock } = vi.hoisted(() => ({
  getAdminPathMock: vi.fn(),
  isIpBlacklistedMock: vi.fn(),
}));

vi.mock("@/lib/settings", () => ({
  getAdminPath: getAdminPathMock,
}));

vi.mock("@/lib/ip-blacklist", () => ({
  isIpBlacklisted: isIpBlacklistedMock,
  resolveRequestIp: vi.fn(() => null),
}));

describe("proxy rewrite", () => {
  beforeEach(() => {
    getAdminPathMock.mockReset();
    getAdminPathMock.mockResolvedValue("admin");
    isIpBlacklistedMock.mockReset();
    isIpBlacklistedMock.mockResolvedValue(false);
  });

  it("rewrites eligible root slugs to internal standalone page route", async () => {
    const { proxy } = await import("./proxy");
    const url = new URL("https://example.com/about");
    const request = {
      headers: new Headers(),
      nextUrl: {
        pathname: url.pathname,
        clone: () => new URL(url.toString()),
      },
    } as never;

    const response = await proxy(request);

    expect(response.headers.get("x-middleware-rewrite")).toContain("/standalone/about");
  });

  it("does not rewrite reserved friend-links path", async () => {
    const { proxy } = await import("./proxy");
    const url = new URL("https://example.com/friend-links");
    const request = {
      headers: new Headers(),
      nextUrl: {
        pathname: url.pathname,
        clone: () => new URL(url.toString()),
      },
    } as never;

    const response = await proxy(request);

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

class RedirectSignal extends Error {
  constructor(readonly destination: string) {
    super(destination);
  }
}

const { getAdminSessionMock, redirectMock, loginActionMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  redirectMock: vi.fn((destination: string) => {
    throw new RedirectSignal(destination);
  }),
  loginActionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("../actions", () => ({
  loginAction: loginActionMock,
}));

describe("admin login page", () => {
  beforeEach(() => {
    getAdminSessionMock.mockReset();
    redirectMock.mockClear();
    loginActionMock.mockReset();
  });

  it("redirects authenticated users to the sanitized redirect target", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });

    const { default: AdminLoginPage } = await import("./page");

    await expect(
      AdminLoginPage({
        params: Promise.resolve({ adminPath: "admin" }),
        searchParams: Promise.resolve({ redirect: "/admin/posts/42" }),
      }),
    ).rejects.toMatchObject({
      destination: "/admin/posts/42",
    });
  });

  it("renders the invalid credential message and falls back to a safe redirect", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: false });

    const { default: AdminLoginPage } = await import("./page");
    const element = await AdminLoginPage({
      params: Promise.resolve({ adminPath: "admin" }),
      searchParams: Promise.resolve({
        redirect: "//evil.example.com/steal",
        error: "invalid_credentials",
      }),
    });

    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("邮箱或密码错误。");
    expect(markup).toContain("/admin");
    expect(markup).not.toContain("evil.example.com");
  });
});

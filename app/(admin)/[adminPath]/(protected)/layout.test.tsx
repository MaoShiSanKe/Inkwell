import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

class RedirectSignal extends Error {
  constructor(readonly destination: string) {
    super(destination);
  }
}

const { isAdminAuthenticatedMock, redirectMock } = vi.hoisted(() => ({
  isAdminAuthenticatedMock: vi.fn(),
  redirectMock: vi.fn((destination: string) => {
    throw new RedirectSignal(destination);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth", () => ({
  isAdminAuthenticated: isAdminAuthenticatedMock,
}));

describe("protected admin layout", () => {
  beforeEach(() => {
    isAdminAuthenticatedMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects unauthenticated users to the admin login page", async () => {
    isAdminAuthenticatedMock.mockResolvedValue(false);

    const { default: ProtectedAdminLayout } = await import("./layout");

    await expect(
      ProtectedAdminLayout({
        children: <div>Protected content</div>,
        params: Promise.resolve({ adminPath: "admin" }),
      }),
    ).rejects.toMatchObject({
      destination: "/admin/login?redirect=%2Fadmin",
    });
  });

  it("renders children for authenticated users", async () => {
    isAdminAuthenticatedMock.mockResolvedValue(true);

    const { default: ProtectedAdminLayout } = await import("./layout");
    const element = await ProtectedAdminLayout({
      children: <div>Protected content</div>,
      params: Promise.resolve({ adminPath: "admin" }),
    });

    expect(renderToStaticMarkup(element)).toContain("Protected content");
  });
});

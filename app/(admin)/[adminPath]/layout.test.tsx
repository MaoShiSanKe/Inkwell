import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

class NotFoundSignal extends Error {
  constructor() {
    super("not-found");
  }
}

const { getAdminPathMock, notFoundMock } = vi.hoisted(() => ({
  getAdminPathMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new NotFoundSignal();
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/lib/settings", () => ({
  getAdminPath: getAdminPathMock,
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <div>theme-toggle</div>,
}));

describe("admin layout", () => {
  beforeEach(() => {
    getAdminPathMock.mockReset();
    notFoundMock.mockClear();
  });

  it("calls notFound when the route admin path does not match settings", async () => {
    getAdminPathMock.mockResolvedValue("admin");

    const { default: AdminLayout } = await import("./layout");

    await expect(
      AdminLayout({
        children: <div>Hidden admin content</div>,
        params: Promise.resolve({ adminPath: "dashboard" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSignal);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders children and theme toggle when the route admin path matches settings", async () => {
    getAdminPathMock.mockResolvedValue("admin");

    const { default: AdminLayout } = await import("./layout");
    const element = await AdminLayout({
      children: <div>Visible admin content</div>,
      params: Promise.resolve({ adminPath: "admin" }),
    });

    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("theme-toggle");
    expect(markup).toContain("Visible admin content");
  });
});

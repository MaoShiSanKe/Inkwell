import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listAdminSiteNavigationMock } = vi.hoisted(() => ({
  listAdminSiteNavigationMock: vi.fn(),
}));

vi.mock("@/lib/admin/site-navigation", () => ({
  listAdminSiteNavigation: listAdminSiteNavigationMock,
}));

vi.mock("./actions", () => ({
  deleteSiteNavigationAction: vi.fn(),
}));

describe("admin site navigation page", () => {
  beforeEach(() => {
    listAdminSiteNavigationMock.mockReset();
  });

  it("renders empty state", async () => {
    listAdminSiteNavigationMock.mockResolvedValue([]);

    const { default: AdminSiteNavigationPage } = await import("./page");
    const element = await AdminSiteNavigationPage({
      params: Promise.resolve({ adminPath: "admin" }),
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("站点导航");
    expect(markup).toContain("还没有导航项");
    expect(markup).toContain("/admin/site-navigation/new");
  });

  it("renders navigation rows", async () => {
    listAdminSiteNavigationMock.mockResolvedValue([
      {
        id: 1,
        label: "关于",
        url: "/about",
        sortOrder: 1,
        openInNewTab: false,
        visible: true,
        updatedAt: new Date("2026-04-05T10:00:00.000Z"),
      },
    ]);

    const { default: AdminSiteNavigationPage } = await import("./page");
    const element = await AdminSiteNavigationPage({
      params: Promise.resolve({ adminPath: "admin" }),
      searchParams: Promise.resolve({ created: "1" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("导航项已创建成功。");
    expect(markup).toContain("关于");
    expect(markup).toContain("/about");
    expect(markup).toContain("显示");
    expect(markup).toContain("否");
    expect(markup).toContain("/admin/site-navigation/1");
  });
});

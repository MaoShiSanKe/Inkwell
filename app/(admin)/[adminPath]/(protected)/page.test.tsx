import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminSessionMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("../actions", () => ({
  logoutAction: vi.fn(),
}));

describe("admin dashboard page", () => {
  beforeEach(() => {
    getAdminSessionMock.mockReset();
  });

  it("renders admin management entry cards", async () => {
    getAdminSessionMock.mockResolvedValue({
      isAuthenticated: true,
      userId: 7,
      role: "editor",
    });

    const { default: AdminPage } = await import("./page");
    const element = await AdminPage({
      params: Promise.resolve({ adminPath: "admin" }),
    });

    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("页面管理");
    expect(markup).toContain("友链管理");
    expect(markup).toContain("评论管理");
    expect(markup).toContain("分类管理");
    expect(markup).toContain("媒体库");
    expect(markup).toContain("标签管理");
    expect(markup).toContain("系列管理");
    expect(markup).toContain("站点导航");
    expect(markup).toContain("后台设置");
    expect(markup).toContain("订阅者管理");
    expect(markup).toContain("IP 黑名单");
    expect(markup).toContain("/admin/pages");
    expect(markup).toContain("/admin/friend-links");
    expect(markup).toContain("/admin/comments");
    expect(markup).toContain("/admin/categories");
    expect(markup).toContain("/admin/media");
    expect(markup).toContain("/admin/tags");
    expect(markup).toContain("/admin/series");
    expect(markup).toContain("/admin/site-navigation");
    expect(markup).toContain("/admin/settings");
    expect(markup).toContain("/admin/subscribers");
    expect(markup).toContain("/admin/ip-blacklist");
  });
});

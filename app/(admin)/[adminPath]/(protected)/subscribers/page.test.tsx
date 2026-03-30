import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminSessionMock, listAdminSubscribersMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  listAdminSubscribersMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("@/lib/admin/subscribers", () => ({
  listAdminSubscribers: listAdminSubscribersMock,
}));

vi.mock("@/components/admin/subscriber-manager", () => ({
  SubscriberManager: () => <div>subscriber-manager</div>,
}));

describe("admin subscribers page", () => {
  beforeEach(() => {
    getAdminSessionMock.mockReset();
    listAdminSubscribersMock.mockReset();
  });

  it("renders the subscriber management page", async () => {
    listAdminSubscribersMock.mockResolvedValue([
      {
        id: 1,
        email: "reader@example.com",
        displayName: "Reader",
        createdAt: new Date("2026-03-30T12:00:00.000Z"),
      },
    ]);

    const { default: AdminSubscribersPage } = await import("./page");
    const element = await AdminSubscribersPage({
      params: Promise.resolve({ adminPath: "admin" }),
      searchParams: Promise.resolve({ deleted: "1" }),
    });
    const markup = await import("react-dom/server").then(({ renderToStaticMarkup }) =>
      renderToStaticMarkup(element),
    );

    expect(markup).toContain("订阅者管理");
    expect(markup).toContain("subscriber-manager");
    expect(markup).toContain("订阅者已删除。");
    expect(markup).toContain("/admin");
  });
});

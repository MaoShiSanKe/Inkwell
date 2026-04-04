import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminSettingsFormValuesMock, getAdminEmailNotificationsMock, listAdminPagesMock } = vi.hoisted(() => ({
  getAdminSettingsFormValuesMock: vi.fn(),
  getAdminEmailNotificationsMock: vi.fn(),
  listAdminPagesMock: vi.fn(),
}));

vi.mock("@/lib/admin/settings", () => ({
  getAdminSettingsFormValues: getAdminSettingsFormValuesMock,
  getAdminEmailNotifications: getAdminEmailNotificationsMock,
}));

vi.mock("@/lib/admin/pages", () => ({
  listAdminPages: listAdminPagesMock,
}));

vi.mock("@/components/admin/settings-form", () => ({
  SettingsForm: ({
    adminPath,
    initialValues,
    emailNotifications,
    pageOptions,
  }: {
    adminPath: string;
    initialValues: Record<string, string>;
    emailNotifications: Array<{ scenario: string; enabled: boolean }>;
    pageOptions: Array<{ id: number; slug: string }>;
  }) => (
    <div
      data-admin-path={adminPath}
      data-initial-values={JSON.stringify(initialValues)}
      data-email-notifications={JSON.stringify(emailNotifications)}
      data-page-options={JSON.stringify(pageOptions)}
    >
      Settings form
    </div>
  ),
}));

describe("admin settings page", () => {
  beforeEach(() => {
    getAdminSettingsFormValuesMock.mockReset();
    getAdminEmailNotificationsMock.mockReset();
    listAdminPagesMock.mockReset();
    listAdminPagesMock.mockResolvedValue([{ id: 1, title: "About", slug: "about", status: "published" }]);
  });

  it("renders current settings, email notifications, and success banners", async () => {
    getAdminSettingsFormValuesMock.mockResolvedValue({
      admin_path: "admin",
      revision_limit: "20",
      revision_ttl_days: "30",
      excerpt_length: "150",
      comment_moderation: "pending",
    });
    getAdminEmailNotificationsMock.mockResolvedValue([
      {
        scenario: "comment_pending",
        description: "Notify admins",
        enabled: true,
      },
    ]);

    const { default: AdminSettingsPage } = await import("./page");
    const element = await AdminSettingsPage({
      params: Promise.resolve({ adminPath: "admin" }),
      searchParams: Promise.resolve({ saved: "1", adminPathChanged: "1" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("后台设置");
    expect(markup).toContain("设置已保存成功。");
    expect(markup).toContain("后台路径已更新");
    expect(markup).toContain("邮件通知场景");
    expect(markup).toContain("Settings form");
    expect(markup).toContain("/admin");
    expect(markup).toContain("comment_pending");
  });
});

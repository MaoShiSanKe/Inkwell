import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminSettingsFormValuesMock } = vi.hoisted(() => ({
  getAdminSettingsFormValuesMock: vi.fn(),
}));

vi.mock("@/lib/admin/settings", () => ({
  getAdminSettingsFormValues: getAdminSettingsFormValuesMock,
}));

vi.mock("@/components/admin/settings-form", () => ({
  SettingsForm: ({ adminPath, initialValues }: { adminPath: string; initialValues: Record<string, string> }) => (
    <div data-admin-path={adminPath} data-initial-values={JSON.stringify(initialValues)}>
      Settings form
    </div>
  ),
}));

describe("admin settings page", () => {
  beforeEach(() => {
    getAdminSettingsFormValuesMock.mockReset();
  });

  it("renders current settings and success banners", async () => {
    getAdminSettingsFormValuesMock.mockResolvedValue({
      admin_path: "admin",
      revision_limit: "20",
      revision_ttl_days: "30",
      excerpt_length: "150",
      comment_moderation: "pending",
    });

    const { default: AdminSettingsPage } = await import("./page");
    const element = await AdminSettingsPage({
      params: Promise.resolve({ adminPath: "admin" }),
      searchParams: Promise.resolve({ saved: "1", adminPathChanged: "1" }),
    });

    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("后台设置");
    expect(markup).toContain("设置已保存成功。");
    expect(markup).toContain("后台路径已更新");
    expect(markup).toContain("Settings form");
    expect(markup).toContain("/admin");
  });
});

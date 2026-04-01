import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createEmailNotificationsFormState,
  initialSettingsFormState,
} from "@/lib/admin/settings-form";

const { updateAdminSettingsMock, updateAdminEmailNotificationsMock } = vi.hoisted(() => ({
  updateAdminSettingsMock: vi.fn(),
  updateAdminEmailNotificationsMock: vi.fn(),
}));

const { getAdminSessionMock, getAdminPathMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  getAdminPathMock: vi.fn(),
}));

class RedirectSignal extends Error {
  constructor(readonly destination: string) {
    super(destination);
  }
}

const { redirectMock, revalidatePathMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((destination: string) => {
    throw new RedirectSignal(destination);
  }),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/admin/settings", () => ({
  updateAdminSettings: updateAdminSettingsMock,
  updateAdminEmailNotifications: updateAdminEmailNotificationsMock,
  getAdminEmailNotifications: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("@/lib/settings", () => ({
  getAdminPath: getAdminPathMock,
}));

describe("admin settings actions", () => {
  beforeEach(() => {
    updateAdminSettingsMock.mockReset();
    updateAdminEmailNotificationsMock.mockReset();
    getAdminSessionMock.mockReset();
    getAdminPathMock.mockReset();
    getAdminPathMock.mockResolvedValue("admin");
    redirectMock.mockClear();
    revalidatePathMock.mockClear();
  });

  it("redirects unauthenticated saves to the configured admin login", async () => {
    getAdminPathMock.mockResolvedValue("dashboard");
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: false });

    const { saveSettingsAction } = await import("./actions");

    await expect(
      saveSettingsAction(initialSettingsFormState, createFormData()),
    ).rejects.toMatchObject({
      destination: "/dashboard/login?redirect=%2Fdashboard%2Fsettings",
    });

    expect(updateAdminSettingsMock).not.toHaveBeenCalled();
  });

  it("returns form state when validation fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminSettingsMock.mockResolvedValue({
      success: false,
      values: {
        ...initialSettingsFormState.values,
        admin_path: "Invalid Path",
      },
      errors: {
        admin_path: "后台路径不能为空，且只能包含小写字母、数字和短横线。",
      },
    });

    const { saveSettingsAction } = await import("./actions");
    const result = await saveSettingsAction(
      initialSettingsFormState,
      createFormData({ admin_path: "Invalid Path" }),
    );

    expect(result).toMatchObject({
      values: {
        admin_path: "Invalid Path",
      },
      errors: {
        admin_path: "后台路径不能为空，且只能包含小写字母、数字和短横线。",
      },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("passes SMTP, public layout, and notice window fields through settings save payload", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminSettingsMock.mockResolvedValue({
      success: false,
      values: initialSettingsFormState.values,
      errors: {},
    });

    const { saveSettingsAction } = await import("./actions");
    await saveSettingsAction(initialSettingsFormState, createFormData());

    expect(updateAdminSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        smtp_host: "smtp.example.com",
        smtp_port: "587",
        smtp_secure: "false",
        smtp_username: "mailer@example.com",
        smtp_password: "smtp-password",
        smtp_from_email: "noreply@example.com",
        smtp_from_name: "Inkwell Robot",
        umami_enabled: "true",
        umami_website_id: "550e8400-e29b-41d4-a716-446655440000",
        umami_script_url: "https://umami.example.com/script.js",
        public_head_html: '<meta name="inkwell-public-head" content="ok" />',
        public_footer_html: '<div data-testid="inkwell-public-footer">footer snippet</div>',
        public_custom_css: ".inkwell-public-home { color: rgb(255, 0, 0); }",
        public_notice_enabled: "true",
        public_notice_variant: "warning",
        public_notice_dismissible: "true",
        public_notice_version: "2026-04-maintenance",
        public_notice_start_at: "2026-04-01T20:00",
        public_notice_start_at_iso: "2026-04-01T12:00:00.000Z",
        public_notice_end_at: "2026-04-02T08:00",
        public_notice_end_at_iso: "2026-04-02T00:00:00.000Z",
        public_notice_title: "系统维护通知",
        public_notice_body: "今晚 23:00-23:30 将进行短暂维护。",
        public_notice_link_label: "查看详情",
        public_notice_link_url: "/docs/deployment",
      }),
    );
  });

  it("revalidates current and next admin settings routes after a successful save", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminSettingsMock.mockResolvedValue({
      success: true,
      nextAdminPath: "dashboard",
      previousAdminPath: "admin",
      adminPathChanged: true,
      publicLayoutChanged: false,
    });

    const { saveSettingsAction } = await import("./actions");

    await expect(
      saveSettingsAction(initialSettingsFormState, createFormData()),
    ).rejects.toMatchObject({
      destination: "/dashboard/settings?saved=1&adminPathChanged=1",
    });

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/admin");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/settings");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/dashboard");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(4, "/dashboard/settings");
  });

  it("revalidates the public layout when public layout settings change", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminSettingsMock.mockResolvedValue({
      success: true,
      nextAdminPath: "admin",
      previousAdminPath: "admin",
      adminPathChanged: false,
      publicLayoutChanged: true,
    });

    const { saveSettingsAction } = await import("./actions");

    await expect(
      saveSettingsAction(initialSettingsFormState, createFormData()),
    ).rejects.toMatchObject({
      destination: "/admin/settings?saved=1",
    });

    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });

  it("redirects back to same admin path when settings save does not change admin_path", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminSettingsMock.mockResolvedValue({
      success: true,
      nextAdminPath: "admin",
      previousAdminPath: "admin",
      adminPathChanged: false,
      publicLayoutChanged: false,
    });

    const { saveSettingsAction } = await import("./actions");

    await expect(
      saveSettingsAction(initialSettingsFormState, createFormData()),
    ).rejects.toMatchObject({
      destination: "/admin/settings?saved=1",
    });
  });

  it("returns updated email notification state after a successful save", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminEmailNotificationsMock.mockResolvedValue({
      success: true,
      scenarios: [
        {
          scenario: "comment_pending",
          description: "Notify admins",
          enabled: false,
        },
      ],
    });

    const { saveEmailNotificationsAction } = await import("./actions");
    const result = await saveEmailNotificationsAction(
      createEmailNotificationsFormState([
        {
          scenario: "comment_pending",
          description: "Notify admins",
          enabled: true,
        },
      ]),
      createEmailFormData({ comment_pending: false }),
    );

    expect(result).toEqual({
      scenarios: [
        {
          scenario: "comment_pending",
          description: "Notify admins",
          enabled: false,
        },
      ],
      error: undefined,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/settings");
  });

  it("returns email notification error state when save fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminEmailNotificationsMock.mockResolvedValue({
      success: false,
      scenarios: [
        {
          scenario: "comment_pending",
          description: "Notify admins",
          enabled: true,
        },
      ],
      error: "保存邮件通知设置失败，请稍后重试。",
    });

    const { saveEmailNotificationsAction } = await import("./actions");
    const result = await saveEmailNotificationsAction(
      createEmailNotificationsFormState([
        {
          scenario: "comment_pending",
          description: "Notify admins",
          enabled: true,
        },
      ]),
      createEmailFormData(),
    );

    expect(result).toEqual({
      scenarios: [
        {
          scenario: "comment_pending",
          description: "Notify admins",
          enabled: true,
        },
      ],
      error: "保存邮件通知设置失败，请稍后重试。",
    });
  });
});

function createFormData(
  overrides: Partial<{
    adminPath: string;
    admin_path: string;
    revision_limit: string;
    revision_ttl_days: string;
    excerpt_length: string;
    comment_moderation: string;
    smtp_host: string;
    smtp_port: string;
    smtp_secure: string;
    smtp_username: string;
    smtp_password: string;
    smtp_from_email: string;
    smtp_from_name: string;
    umami_enabled: string;
    umami_website_id: string;
    umami_script_url: string;
    public_head_html: string;
    public_footer_html: string;
    public_custom_css: string;
    public_notice_enabled: string;
    public_notice_variant: string;
    public_notice_dismissible: string;
    public_notice_version: string;
    public_notice_start_at: string;
    public_notice_start_at_iso: string;
    public_notice_end_at: string;
    public_notice_end_at_iso: string;
    public_notice_title: string;
    public_notice_body: string;
    public_notice_link_label: string;
    public_notice_link_url: string;
  }> = {},
) {
  const values = {
    adminPath: "admin",
    admin_path: "dashboard",
    revision_limit: "25",
    revision_ttl_days: "45",
    excerpt_length: "180",
    comment_moderation: "approved",
    smtp_host: "smtp.example.com",
    smtp_port: "587",
    smtp_secure: "false",
    smtp_username: "mailer@example.com",
    smtp_password: "smtp-password",
    smtp_from_email: "noreply@example.com",
    smtp_from_name: "Inkwell Robot",
    umami_enabled: "true",
    umami_website_id: "550e8400-e29b-41d4-a716-446655440000",
    umami_script_url: "https://umami.example.com/script.js",
    public_head_html: '<meta name="inkwell-public-head" content="ok" />',
    public_footer_html: '<div data-testid="inkwell-public-footer">footer snippet</div>',
    public_custom_css: ".inkwell-public-home { color: rgb(255, 0, 0); }",
    public_notice_enabled: "true",
    public_notice_variant: "warning",
    public_notice_dismissible: "true",
    public_notice_version: "2026-04-maintenance",
    public_notice_start_at: "2026-04-01T20:00",
    public_notice_start_at_iso: "2026-04-01T12:00:00.000Z",
    public_notice_end_at: "2026-04-02T08:00",
    public_notice_end_at_iso: "2026-04-02T00:00:00.000Z",
    public_notice_title: "系统维护通知",
    public_notice_body: "今晚 23:00-23:30 将进行短暂维护。",
    public_notice_link_label: "查看详情",
    public_notice_link_url: "/docs/deployment",
    ...overrides,
  };

  const formData = new FormData();
  formData.set("adminPath", values.adminPath);
  formData.set("admin_path", values.admin_path);
  formData.set("revision_limit", values.revision_limit);
  formData.set("revision_ttl_days", values.revision_ttl_days);
  formData.set("excerpt_length", values.excerpt_length);
  formData.set("comment_moderation", values.comment_moderation);
  formData.set("smtp_host", values.smtp_host);
  formData.set("smtp_port", values.smtp_port);
  formData.set("smtp_secure", values.smtp_secure);
  formData.set("smtp_username", values.smtp_username);
  formData.set("smtp_password", values.smtp_password);
  formData.set("smtp_from_email", values.smtp_from_email);
  formData.set("smtp_from_name", values.smtp_from_name);
  formData.set("umami_enabled", values.umami_enabled);
  formData.set("umami_website_id", values.umami_website_id);
  formData.set("umami_script_url", values.umami_script_url);
  formData.set("public_head_html", values.public_head_html);
  formData.set("public_footer_html", values.public_footer_html);
  formData.set("public_custom_css", values.public_custom_css);
  formData.set("public_notice_enabled", values.public_notice_enabled);
  formData.set("public_notice_variant", values.public_notice_variant);
  formData.set("public_notice_dismissible", values.public_notice_dismissible);
  formData.set("public_notice_version", values.public_notice_version);
  formData.set("public_notice_start_at", values.public_notice_start_at);
  formData.set("public_notice_start_at_iso", values.public_notice_start_at_iso);
  formData.set("public_notice_end_at", values.public_notice_end_at);
  formData.set("public_notice_end_at_iso", values.public_notice_end_at_iso);
  formData.set("public_notice_title", values.public_notice_title);
  formData.set("public_notice_body", values.public_notice_body);
  formData.set("public_notice_link_label", values.public_notice_link_label);
  formData.set("public_notice_link_url", values.public_notice_link_url);
  return formData;
}

function createEmailFormData(
  overrides: Partial<Record<"comment_pending" | "comment_approved" | "comment_reply" | "post_published", boolean>> = {},
) {
  const values = {
    comment_pending: true,
    comment_approved: true,
    comment_reply: true,
    post_published: false,
    ...overrides,
  };

  const formData = new FormData();
  formData.set("adminPath", "admin");

  for (const [key, enabled] of Object.entries(values)) {
    if (enabled) {
      formData.set(key, "on");
    }
  }

  return formData;
}

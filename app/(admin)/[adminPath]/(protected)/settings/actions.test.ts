import { beforeEach, describe, expect, it, vi } from "vitest";

import { initialSettingsFormState } from "@/lib/admin/settings-form";

const { updateAdminSettingsMock } = vi.hoisted(() => ({
  updateAdminSettingsMock: vi.fn(),
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

  it("revalidates current and next admin settings routes after a successful save", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminSettingsMock.mockResolvedValue({
      success: true,
      nextAdminPath: "dashboard",
      previousAdminPath: "admin",
      adminPathChanged: true,
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

  it("redirects back to same admin path when settings save does not change admin_path", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminSettingsMock.mockResolvedValue({
      success: true,
      nextAdminPath: "admin",
      previousAdminPath: "admin",
      adminPathChanged: false,
    });

    const { saveSettingsAction } = await import("./actions");

    await expect(
      saveSettingsAction(initialSettingsFormState, createFormData()),
    ).rejects.toMatchObject({
      destination: "/admin/settings?saved=1",
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
  }> = {},
) {
  const values = {
    adminPath: "admin",
    admin_path: "dashboard",
    revision_limit: "25",
    revision_ttl_days: "45",
    excerpt_length: "180",
    comment_moderation: "approved",
    ...overrides,
  };

  const formData = new FormData();
  formData.set("adminPath", values.adminPath);
  formData.set("admin_path", values.admin_path);
  formData.set("revision_limit", values.revision_limit);
  formData.set("revision_ttl_days", values.revision_ttl_days);
  formData.set("excerpt_length", values.excerpt_length);
  formData.set("comment_moderation", values.comment_moderation);
  return formData;
}

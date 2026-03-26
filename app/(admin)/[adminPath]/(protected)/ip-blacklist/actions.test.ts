import { beforeEach, describe, expect, it, vi } from "vitest";

import { initialIpBlacklistFormState } from "@/lib/admin/ip-blacklist-form";

const { createAdminIpBlacklistEntryMock, deleteAdminIpBlacklistEntryMock } = vi.hoisted(() => ({
  createAdminIpBlacklistEntryMock: vi.fn(),
  deleteAdminIpBlacklistEntryMock: vi.fn(),
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

vi.mock("@/lib/admin/ip-blacklist", () => ({
  createAdminIpBlacklistEntry: createAdminIpBlacklistEntryMock,
  deleteAdminIpBlacklistEntry: deleteAdminIpBlacklistEntryMock,
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("@/lib/settings", () => ({
  getAdminPath: getAdminPathMock,
}));

describe("admin ip blacklist actions", () => {
  beforeEach(() => {
    createAdminIpBlacklistEntryMock.mockReset();
    deleteAdminIpBlacklistEntryMock.mockReset();
    getAdminSessionMock.mockReset();
    getAdminPathMock.mockReset();
    getAdminPathMock.mockResolvedValue("admin");
    redirectMock.mockClear();
    revalidatePathMock.mockClear();
  });

  it("redirects unauthenticated creates to the configured admin login", async () => {
    getAdminPathMock.mockResolvedValue("dashboard");
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: false });

    const { createIpBlacklistAction } = await import("./actions");

    await expect(
      createIpBlacklistAction(initialIpBlacklistFormState, createFormData()),
    ).rejects.toMatchObject({
      destination: "/dashboard/login?redirect=%2Fdashboard%2Fip-blacklist",
    });

    expect(createAdminIpBlacklistEntryMock).not.toHaveBeenCalled();
  });

  it("returns form state when validation fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    createAdminIpBlacklistEntryMock.mockResolvedValue({
      success: false,
      values: {
        ...initialIpBlacklistFormState.values,
        network: "invalid",
      },
      errors: {
        network: "请输入有效的 IP 或 CIDR。",
      },
    });

    const { createIpBlacklistAction } = await import("./actions");
    const result = await createIpBlacklistAction(
      initialIpBlacklistFormState,
      createFormData({ network: "invalid" }),
    );

    expect(result).toMatchObject({
      values: {
        network: "invalid",
      },
      errors: {
        network: "请输入有效的 IP 或 CIDR。",
      },
    });
  });

  it("revalidates and redirects after a successful create", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    createAdminIpBlacklistEntryMock.mockResolvedValue({
      success: true,
      entryId: 7,
    });

    const { createIpBlacklistAction } = await import("./actions");

    await expect(
      createIpBlacklistAction(initialIpBlacklistFormState, createFormData()),
    ).rejects.toMatchObject({
      destination: "/admin/ip-blacklist?created=1",
    });

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/admin");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/ip-blacklist");
  });

  it("redirects with an error flag when delete fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    deleteAdminIpBlacklistEntryMock.mockResolvedValue({
      success: false,
      error: "黑名单记录不存在。",
    });

    const { deleteIpBlacklistAction } = await import("./actions");

    await expect(deleteIpBlacklistAction(createDeleteFormData())).rejects.toMatchObject({
      destination: "/admin/ip-blacklist?error=delete_failed",
    });
  });
});

function createFormData(
  overrides: Partial<{
    adminPath: string;
    network: string;
    reason: string;
  }> = {},
) {
  const values = {
    adminPath: "admin",
    network: "203.0.113.10",
    reason: "spam crawler",
    ...overrides,
  };

  const formData = new FormData();
  formData.set("adminPath", values.adminPath);
  formData.set("network", values.network);
  formData.set("reason", values.reason);
  return formData;
}

function createDeleteFormData(
  overrides: Partial<{
    adminPath: string;
    entryId: string;
  }> = {},
) {
  const values = {
    adminPath: "admin",
    entryId: "7",
    ...overrides,
  };

  const formData = new FormData();
  formData.set("adminPath", values.adminPath);
  formData.set("entryId", values.entryId);
  return formData;
}

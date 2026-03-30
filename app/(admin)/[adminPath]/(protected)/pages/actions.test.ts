import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminPathMock, getAdminSessionMock, redirectMock } = vi.hoisted(() => ({
  getAdminPathMock: vi.fn(),
  getAdminSessionMock: vi.fn(),
  redirectMock: vi.fn((destination: string) => {
    throw new RedirectSignal(destination);
  }),
}));

class RedirectSignal extends Error {
  constructor(readonly destination: string) {
    super(destination);
  }
}

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/settings", () => ({
  getAdminPath: getAdminPathMock,
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("@/lib/admin/pages", () => ({
  createAdminPage: vi.fn().mockResolvedValue({ success: true, pageId: 1, affectedSlugs: ["about"] }),
  updateAdminPage: vi.fn().mockResolvedValue({ success: true, pageId: 1, affectedSlugs: ["about"] }),
  moveAdminPageToTrash: vi.fn().mockResolvedValue({ success: true, pageId: 1, affectedSlugs: ["about"] }),
  restoreAdminPageFromTrash: vi.fn().mockResolvedValue({ success: true, pageId: 1, affectedSlugs: ["about"] }),
}));

describe("admin custom page actions", () => {
  beforeEach(() => {
    getAdminPathMock.mockReset();
    getAdminPathMock.mockResolvedValue("admin");
    getAdminSessionMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects unauthenticated users to admin login on create", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: false });
    const formData = new FormData();
    formData.set("adminPath", "admin");

    const { createPageAction } = await import("./actions");

    await expect(createPageAction({ values: {} as never, errors: {} }, formData)).rejects.toMatchObject({
      destination: "/admin/login?redirect=%2Fadmin%2Fpages%2Fnew",
    });
  });
});

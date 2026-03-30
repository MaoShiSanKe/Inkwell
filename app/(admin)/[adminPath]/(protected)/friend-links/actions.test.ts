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

vi.mock("@/lib/admin/friend-links", () => ({
  createAdminFriendLink: vi.fn().mockResolvedValue({ success: true, friendLinkId: 1 }),
  updateAdminFriendLink: vi.fn().mockResolvedValue({ success: true, friendLinkId: 1 }),
  moveAdminFriendLinkToTrash: vi.fn().mockResolvedValue({ success: true, friendLinkId: 1 }),
  restoreAdminFriendLinkFromTrash: vi.fn().mockResolvedValue({ success: true, friendLinkId: 1 }),
}));

describe("admin friend-link actions", () => {
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

    const { createFriendLinkAction } = await import("./actions");

    await expect(
      createFriendLinkAction({ values: {} as never, errors: {} }, formData),
    ).rejects.toMatchObject({
      destination: "/admin/login?redirect=%2Fadmin%2Ffriend-links%2Fnew",
    });
  });
});

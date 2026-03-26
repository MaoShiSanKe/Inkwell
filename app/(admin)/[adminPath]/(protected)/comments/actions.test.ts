import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  approveAdminCommentMock,
  markAdminCommentAsSpamMock,
  moveAdminCommentToTrashMock,
  restoreAdminCommentFromTrashMock,
} = vi.hoisted(() => ({
  approveAdminCommentMock: vi.fn(),
  markAdminCommentAsSpamMock: vi.fn(),
  moveAdminCommentToTrashMock: vi.fn(),
  restoreAdminCommentFromTrashMock: vi.fn(),
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

vi.mock("@/lib/admin/comments", () => ({
  approveAdminComment: approveAdminCommentMock,
  markAdminCommentAsSpam: markAdminCommentAsSpamMock,
  moveAdminCommentToTrash: moveAdminCommentToTrashMock,
  restoreAdminCommentFromTrash: restoreAdminCommentFromTrashMock,
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("@/lib/settings", () => ({
  getAdminPath: getAdminPathMock,
}));

describe("admin comment actions", () => {
  beforeEach(() => {
    approveAdminCommentMock.mockReset();
    markAdminCommentAsSpamMock.mockReset();
    moveAdminCommentToTrashMock.mockReset();
    restoreAdminCommentFromTrashMock.mockReset();
    getAdminSessionMock.mockReset();
    getAdminPathMock.mockReset();
    getAdminPathMock.mockResolvedValue("admin");
    redirectMock.mockClear();
    revalidatePathMock.mockClear();
  });

  it("redirects unauthenticated approve requests to the configured admin login", async () => {
    getAdminPathMock.mockResolvedValue("dashboard");
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: false });

    const { approveCommentAction } = await import("./actions");

    await expect(
      approveCommentAction(createCommentActionFormData({ adminPath: "admin", commentId: "42" })),
    ).rejects.toMatchObject({
      destination: "/dashboard/login?redirect=%2Fdashboard%2Fcomments",
    });

    expect(approveAdminCommentMock).not.toHaveBeenCalled();
  });

  it("revalidates admin and public paths after a successful approval", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    approveAdminCommentMock.mockResolvedValue({
      success: true,
      commentId: 42,
      postId: 7,
      postSlug: "hello-world",
      status: "approved",
    });

    const { approveCommentAction } = await import("./actions");

    await expect(
      approveCommentAction(createCommentActionFormData({ adminPath: "admin", commentId: "42" })),
    ).rejects.toMatchObject({
      destination: "/admin/comments?approved=1",
    });

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/admin");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/comments");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/post/hello-world");
  });

  it("redirects to spam_failed when spam marking fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    markAdminCommentAsSpamMock.mockResolvedValue({
      success: false,
      error: "failed",
    });

    const { markCommentAsSpamAction } = await import("./actions");

    await expect(
      markCommentAsSpamAction(createCommentActionFormData({ adminPath: "admin", commentId: "15" })),
    ).rejects.toMatchObject({
      destination: "/admin/comments?error=spam_failed",
    });

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("redirects to trash_failed when trashing fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    moveAdminCommentToTrashMock.mockResolvedValue({
      success: false,
      error: "failed",
    });

    const { moveCommentToTrashAction } = await import("./actions");

    await expect(
      moveCommentToTrashAction(createCommentActionFormData({ adminPath: "admin", commentId: "15" })),
    ).rejects.toMatchObject({
      destination: "/admin/comments?error=trash_failed",
    });
  });

  it("redirects to restore_failed when the status changed concurrently", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    restoreAdminCommentFromTrashMock.mockResolvedValue({
      success: false,
      error: "评论状态已被其他管理员更新，请刷新后重试。",
    });

    const { restoreCommentAction } = await import("./actions");

    await expect(
      restoreCommentAction(createCommentActionFormData({ adminPath: "admin", commentId: "18" })),
    ).rejects.toMatchObject({
      destination: "/admin/comments?error=restore_failed",
    });
  });

  it("revalidates admin and public paths after a successful restore", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    restoreAdminCommentFromTrashMock.mockResolvedValue({
      success: true,
      commentId: 18,
      postId: 7,
      postSlug: "restored-post",
      status: "pending",
    });

    const { restoreCommentAction } = await import("./actions");

    await expect(
      restoreCommentAction(createCommentActionFormData({ adminPath: "admin", commentId: "18" })),
    ).rejects.toMatchObject({
      destination: "/admin/comments?restored=1",
    });

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/admin");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/comments");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/post/restored-post");
  });
});

function createCommentActionFormData(
  overrides: Partial<{
    adminPath: string;
    commentId: string;
  }> = {},
) {
  const values = {
    adminPath: "admin",
    commentId: "1",
    ...overrides,
  };

  const formData = new FormData();
  formData.set("adminPath", values.adminPath);
  formData.set("commentId", values.commentId);
  return formData;
}

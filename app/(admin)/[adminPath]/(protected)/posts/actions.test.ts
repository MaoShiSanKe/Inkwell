import { beforeEach, describe, expect, it, vi } from "vitest";

import { initialPostFormState } from "@/lib/admin/post-form";

const { createAdminPostMock, moveAdminPostToTrashMock, restoreAdminPostFromTrashMock, updateAdminPostMock } =
  vi.hoisted(() => ({
    createAdminPostMock: vi.fn(),
    moveAdminPostToTrashMock: vi.fn(),
    restoreAdminPostFromTrashMock: vi.fn(),
    updateAdminPostMock: vi.fn(),
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

vi.mock("@/lib/admin/posts", () => ({
  createAdminPost: createAdminPostMock,
  updateAdminPost: updateAdminPostMock,
  moveAdminPostToTrash: moveAdminPostToTrashMock,
  restoreAdminPostFromTrash: restoreAdminPostFromTrashMock,
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("@/lib/settings", () => ({
  getAdminPath: getAdminPathMock,
}));

describe("admin post actions", () => {
  beforeEach(() => {
    createAdminPostMock.mockReset();
    moveAdminPostToTrashMock.mockReset();
    restoreAdminPostFromTrashMock.mockReset();
    updateAdminPostMock.mockReset();
    getAdminSessionMock.mockReset();
    getAdminPathMock.mockReset();
    getAdminPathMock.mockResolvedValue("admin");
    redirectMock.mockClear();
    revalidatePathMock.mockClear();
  });

  it("redirects unauthenticated create requests to the configured admin login", async () => {
    getAdminPathMock.mockResolvedValue("dashboard");
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: false });

    const { createPostAction } = await import("./actions");

    await expect(
      createPostAction(initialPostFormState, createFormData({ adminPath: "admin" })),
    ).rejects.toMatchObject({
      destination: "/dashboard/login?redirect=%2Fdashboard%2Fposts%2Fnew",
    });

    expect(createAdminPostMock).not.toHaveBeenCalled();
  });

  it("returns form state when updateAdminPost reports validation errors", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminPostMock.mockResolvedValue({
      success: false,
      values: {
        ...initialPostFormState.values,
        title: "Invalid title",
        slug: "invalid-slug",
      },
      errors: {
        slug: "该 slug 已存在，请更换。",
      },
    });

    const { updatePostAction } = await import("./actions");
    const result = await updatePostAction(
      initialPostFormState,
      createFormData({
        adminPath: "admin",
        postId: "42",
        title: "Invalid title",
        slug: "invalid-slug",
      }),
    );

    expect(result).toMatchObject({
      values: {
        title: "Invalid title",
        slug: "invalid-slug",
      },
      errors: {
        slug: "该 slug 已存在，请更换。",
      },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("passes ogImageMediaId through create and update payloads", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    createAdminPostMock.mockResolvedValue({
      success: false,
      values: {
        ...initialPostFormState.values,
        ogImageMediaId: "12",
      },
      errors: {
        ogImageMediaId: "所选 OG 图片不存在。",
      },
    });
    updateAdminPostMock.mockResolvedValue({
      success: false,
      values: {
        ...initialPostFormState.values,
        ogImageMediaId: "12",
      },
      errors: {
        ogImageMediaId: "所选 OG 图片不存在。",
      },
    });

    const { createPostAction, updatePostAction } = await import("./actions");

    await createPostAction(
      initialPostFormState,
      createFormData({ postId: "", ogImageMediaId: "12" }),
    );
    await updatePostAction(
      initialPostFormState,
      createFormData({ postId: "42", ogImageMediaId: "12" }),
    );

    expect(createAdminPostMock).toHaveBeenCalledWith(
      expect.objectContaining({ ogImageMediaId: "12" }),
    );
    expect(updateAdminPostMock).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ ogImageMediaId: "12" }),
    );
  });

  it("revalidates admin and public paths then redirects after a successful update", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminPostMock.mockResolvedValue({
      success: true,
      postId: 42,
      affectedSlugs: ["old-slug", " renamed-slug ", "old-slug", ""],
    });

    const { updatePostAction } = await import("./actions");

    await expect(
      updatePostAction(
        initialPostFormState,
        createFormData({
          adminPath: "admin",
          postId: "42",
          title: "Updated title",
          slug: "renamed-slug",
          status: "published",
        }),
      ),
    ).rejects.toMatchObject({
      destination: "/admin/posts?updated=1",
    });

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/admin/posts");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/post/old-slug");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/post/renamed-slug");
  });

  it("redirects unauthenticated updates to the post-specific login URL", async () => {
    getAdminPathMock.mockResolvedValue("dashboard");
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: false });

    const { updatePostAction } = await import("./actions");

    await expect(
      updatePostAction(
        initialPostFormState,
        createFormData({
          adminPath: "admin",
          postId: "99",
        }),
      ),
    ).rejects.toMatchObject({
      destination: "/dashboard/login?redirect=%2Fdashboard%2Fposts%2F99",
    });
  });

  it("redirects to the error flag when moving a post to trash fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    moveAdminPostToTrashMock.mockResolvedValue({
      success: false,
      error: "移入回收站失败。",
    });

    const { movePostToTrashAction } = await import("./actions");

    await expect(
      movePostToTrashAction(
        createFormData({
          adminPath: "admin",
          postId: "7",
        }),
      ),
    ).rejects.toMatchObject({
      destination: "/admin/posts?error=trash_failed",
    });

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("revalidates the list, edit page, and blog slugs after a successful restore", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    restoreAdminPostFromTrashMock.mockResolvedValue({
      success: true,
      postId: 7,
      affectedSlugs: ["trashed-slug", " old-alias ", "trashed-slug"],
    });

    const { restorePostAction } = await import("./actions");

    await expect(
      restorePostAction(
        createFormData({
          adminPath: "admin",
          postId: "7",
        }),
      ),
    ).rejects.toMatchObject({
      destination: "/admin/posts?restored=1",
    });

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/admin/posts");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/posts/7");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/post/trashed-slug");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(4, "/post/old-alias");
  });
});

function createFormData(
  overrides: Partial<{
    adminPath: string;
    postId: string;
    title: string;
    slug: string;
    categoryId: string;
    excerpt: string;
    content: string;
    status: "draft" | "published";
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
    ogImageMediaId: string;
    canonicalUrl: string;
    breadcrumbEnabled: boolean;
    noindex: boolean;
    nofollow: boolean;
  }> = {},
) {
  const values = {
    adminPath: "admin",
    postId: "1",
    title: "Title",
    slug: "slug",
    categoryId: "",
    excerpt: "",
    content: "content",
    status: "draft" as const,
    metaTitle: "",
    metaDescription: "",
    ogTitle: "",
    ogDescription: "",
    ogImageMediaId: "",
    canonicalUrl: "",
    breadcrumbEnabled: false,
    noindex: false,
    nofollow: false,
    ...overrides,
  };

  const formData = new FormData();
  formData.set("adminPath", values.adminPath);
  formData.set("postId", values.postId);
  formData.set("title", values.title);
  formData.set("slug", values.slug);
  formData.set("categoryId", values.categoryId);
  formData.set("excerpt", values.excerpt);
  formData.set("content", values.content);
  formData.set("status", values.status);
  formData.set("metaTitle", values.metaTitle);
  formData.set("metaDescription", values.metaDescription);
  formData.set("ogTitle", values.ogTitle);
  formData.set("ogDescription", values.ogDescription);
  formData.set("ogImageMediaId", values.ogImageMediaId);
  formData.set("canonicalUrl", values.canonicalUrl);

  if (values.breadcrumbEnabled) {
    formData.set("breadcrumbEnabled", "on");
  }

  if (values.noindex) {
    formData.set("noindex", "on");
  }

  if (values.nofollow) {
    formData.set("nofollow", "on");
  }

  return formData;
}

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  initialExternalImageFormState,
  initialLocalImageUploadState,
} from "@/lib/admin/media-form";

const { createAdminExternalImageMock, deleteAdminMediaMock, uploadAdminLocalImageMock } =
  vi.hoisted(() => ({
    createAdminExternalImageMock: vi.fn(),
    deleteAdminMediaMock: vi.fn(),
    uploadAdminLocalImageMock: vi.fn(),
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

vi.mock("@/lib/admin/media", () => ({
  createAdminExternalImage: createAdminExternalImageMock,
  deleteAdminMedia: deleteAdminMediaMock,
  uploadAdminLocalImage: uploadAdminLocalImageMock,
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("@/lib/settings", () => ({
  getAdminPath: getAdminPathMock,
}));

describe("admin media actions", () => {
  beforeEach(() => {
    createAdminExternalImageMock.mockReset();
    deleteAdminMediaMock.mockReset();
    uploadAdminLocalImageMock.mockReset();
    getAdminSessionMock.mockReset();
    getAdminPathMock.mockReset();
    getAdminPathMock.mockResolvedValue("admin");
    redirectMock.mockClear();
    revalidatePathMock.mockClear();
  });

  it("redirects unauthenticated uploads to the configured admin login", async () => {
    getAdminPathMock.mockResolvedValue("dashboard");
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: false });

    const { uploadLocalImageAction } = await import("./actions");

    await expect(
      uploadLocalImageAction(initialLocalImageUploadState, createLocalFormData()),
    ).rejects.toMatchObject({
      destination: "/dashboard/login?redirect=%2Fdashboard%2Fmedia",
    });

    expect(uploadAdminLocalImageMock).not.toHaveBeenCalled();
  });

  it("returns external image form state when validation fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    createAdminExternalImageMock.mockResolvedValue({
      success: false,
      values: {
        ...initialExternalImageFormState.values,
        externalUrl: "invalid-url",
      },
      errors: {
        externalUrl: "图片地址格式无效。",
      },
    });

    const { createExternalImageAction } = await import("./actions");
    const result = await createExternalImageAction(
      initialExternalImageFormState,
      createExternalFormData({
        externalUrl: "invalid-url",
      }),
    );

    expect(result).toMatchObject({
      values: {
        externalUrl: "invalid-url",
      },
      errors: {
        externalUrl: "图片地址格式无效。",
      },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("revalidates media and post editor paths after a successful local upload", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    uploadAdminLocalImageMock.mockResolvedValue({
      success: true,
      mediaId: 42,
    });

    const { uploadLocalImageAction } = await import("./actions");

    await expect(
      uploadLocalImageAction(initialLocalImageUploadState, createLocalFormData()),
    ).rejects.toMatchObject({
      destination: "/admin/media?uploaded=1",
    });

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/admin/media");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/posts/new");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/admin/posts/[postId]", "page");
  });

  it("revalidates media and post editor paths after a successful external create", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    createAdminExternalImageMock.mockResolvedValue({
      success: true,
      mediaId: 7,
    });

    const { createExternalImageAction } = await import("./actions");

    await expect(
      createExternalImageAction(initialExternalImageFormState, createExternalFormData()),
    ).rejects.toMatchObject({
      destination: "/admin/media?created=1",
    });

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/admin/media");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/posts/new");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/admin/posts/[postId]", "page");
  });

  it("redirects with an error flag when deleting media fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    deleteAdminMediaMock.mockResolvedValue({
      success: false,
      error: "删除媒体失败，请稍后重试。",
    });

    const { deleteMediaAction } = await import("./actions");

    await expect(deleteMediaAction(createDeleteFormData())).rejects.toMatchObject({
      destination: "/admin/media?error=delete_failed",
    });

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("revalidates admin and public post paths after a successful delete", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    deleteAdminMediaMock.mockResolvedValue({
      success: true,
      mediaId: 7,
      affectedSlugs: [" post-one ", "post-two", "post-one"],
    });

    const { deleteMediaAction } = await import("./actions");

    await expect(deleteMediaAction(createDeleteFormData())).rejects.toMatchObject({
      destination: "/admin/media?deleted=1",
    });

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/admin/media");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/posts/new");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/admin/posts/[postId]", "page");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(4, "/post/post-one");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(5, "/post/post-two");
  });
});

function createLocalFormData(
  overrides: Partial<{
    adminPath: string;
    altText: string;
    caption: string;
    image: File;
  }> = {},
) {
  const values = {
    adminPath: "admin",
    altText: "Local alt",
    caption: "",
    image: new File(["pixel"], "upload.png", { type: "image/png" }),
    ...overrides,
  };

  const formData = new FormData();
  formData.set("adminPath", values.adminPath);
  formData.set("altText", values.altText);
  formData.set("caption", values.caption);
  formData.set("image", values.image);
  return formData;
}

function createExternalFormData(
  overrides: Partial<{
    adminPath: string;
    externalUrl: string;
    altText: string;
    caption: string;
    width: string;
    height: string;
  }> = {},
) {
  const values = {
    adminPath: "admin",
    externalUrl: "https://cdn.example.com/hero.png",
    altText: "External alt",
    caption: "",
    width: "1200",
    height: "630",
    ...overrides,
  };

  const formData = new FormData();
  formData.set("adminPath", values.adminPath);
  formData.set("externalUrl", values.externalUrl);
  formData.set("altText", values.altText);
  formData.set("caption", values.caption);
  formData.set("width", values.width);
  formData.set("height", values.height);
  return formData;
}

function createDeleteFormData(
  overrides: Partial<{
    adminPath: string;
    mediaId: string;
  }> = {},
) {
  const values = {
    adminPath: "admin",
    mediaId: "7",
    ...overrides,
  };

  const formData = new FormData();
  formData.set("adminPath", values.adminPath);
  formData.set("mediaId", values.mediaId);
  return formData;
}

import { beforeEach, describe, expect, it, vi } from "vitest";

import { initialTaxonomyFormState } from "@/lib/admin/taxonomy-form";

const { createAdminTaxonomyMock, deleteAdminTaxonomyMock, updateAdminTaxonomyMock } =
  vi.hoisted(() => ({
    createAdminTaxonomyMock: vi.fn(),
    deleteAdminTaxonomyMock: vi.fn(),
    updateAdminTaxonomyMock: vi.fn(),
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

vi.mock("@/lib/admin/taxonomies", () => ({
  createAdminTaxonomy: createAdminTaxonomyMock,
  updateAdminTaxonomy: updateAdminTaxonomyMock,
  deleteAdminTaxonomy: deleteAdminTaxonomyMock,
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("@/lib/settings", () => ({
  getAdminPath: getAdminPathMock,
}));

describe("admin tag actions", () => {
  beforeEach(() => {
    createAdminTaxonomyMock.mockReset();
    updateAdminTaxonomyMock.mockReset();
    deleteAdminTaxonomyMock.mockReset();
    getAdminSessionMock.mockReset();
    getAdminPathMock.mockReset();
    getAdminPathMock.mockResolvedValue("admin");
    redirectMock.mockClear();
    revalidatePathMock.mockClear();
  });

  it("redirects unauthenticated create requests to the configured admin login", async () => {
    getAdminPathMock.mockResolvedValue("dashboard");
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: false });

    const { createTagAction } = await import("./actions");

    await expect(
      createTagAction(initialTaxonomyFormState, createFormData({ adminPath: "admin" })),
    ).rejects.toMatchObject({
      destination: "/dashboard/login?redirect=%2Fdashboard%2Ftags%2Fnew",
    });
  });

  it("returns form state when tag validation fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminTaxonomyMock.mockResolvedValue({
      success: false,
      values: {
        ...initialTaxonomyFormState.values,
        name: "React",
        slug: "react",
      },
      errors: {
        name: "该名称已存在，请更换。",
      },
    });

    const { updateTagAction } = await import("./actions");
    const result = await updateTagAction(
      initialTaxonomyFormState,
      createFormData({ taxonomyId: "8", name: "React", slug: "react" }),
    );

    expect(result).toMatchObject({
      errors: {
        name: "该名称已存在，请更换。",
      },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("revalidates related paths and redirects after a successful create", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    createAdminTaxonomyMock.mockResolvedValue({
      success: true,
      taxonomyId: 8,
      slug: "react",
    });

    const { createTagAction } = await import("./actions");

    await expect(
      createTagAction(initialTaxonomyFormState, createFormData({ name: "React", slug: "react" })),
    ).rejects.toMatchObject({
      destination: "/admin/tags?created=1",
    });

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/admin/tags");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/tags/new");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/admin/tags/8");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(4, "/admin/posts/new");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(5, "/admin/posts/[postId]", "page");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(6, "/tag/react");
  });

  it("redirects to the error flag when deleting a tag fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    deleteAdminTaxonomyMock.mockResolvedValue({
      success: false,
      error: "该标签仍被文章使用，无法删除。",
    });

    const { deleteTagAction } = await import("./actions");

    await expect(deleteTagAction(createFormData({ taxonomyId: "8" }))).rejects.toMatchObject({
      destination: "/admin/tags?error=delete_failed",
    });
  });
});

function createFormData(
  overrides: Partial<{
    adminPath: string;
    taxonomyId: string;
    name: string;
    slug: string;
    description: string;
  }> = {},
) {
  const values = {
    adminPath: "admin",
    taxonomyId: "1",
    name: "Tag",
    slug: "tag",
    description: "",
    ...overrides,
  };

  const formData = new FormData();
  formData.set("adminPath", values.adminPath);
  formData.set("taxonomyId", values.taxonomyId);
  formData.set("name", values.name);
  formData.set("slug", values.slug);
  formData.set("description", values.description);
  return formData;
}

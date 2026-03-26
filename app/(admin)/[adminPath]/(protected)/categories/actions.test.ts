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

describe("admin category actions", () => {
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

    const { createCategoryAction } = await import("./actions");

    await expect(
      createCategoryAction(initialTaxonomyFormState, createFormData({ adminPath: "admin" })),
    ).rejects.toMatchObject({
      destination: "/dashboard/login?redirect=%2Fdashboard%2Fcategories%2Fnew",
    });

    expect(createAdminTaxonomyMock).not.toHaveBeenCalled();
  });

  it("returns form state when category validation fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    createAdminTaxonomyMock.mockResolvedValue({
      success: false,
      values: {
        ...initialTaxonomyFormState.values,
        name: "Child",
        slug: "child",
        parentId: "3",
      },
      errors: {
        parentId: "父分类必须是顶级分类，不能创建三级分类。",
      },
    });

    const { createCategoryAction } = await import("./actions");
    const result = await createCategoryAction(
      initialTaxonomyFormState,
      createFormData({ name: "Child", slug: "child", parentId: "3" }),
    );

    expect(result).toMatchObject({
      values: {
        name: "Child",
        slug: "child",
        parentId: "3",
      },
      errors: {
        parentId: "父分类必须是顶级分类，不能创建三级分类。",
      },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("revalidates related paths and redirects after a successful update", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminTaxonomyMock.mockResolvedValue({
      success: true,
      taxonomyId: 42,
      slug: "frontend",
    });

    const { updateCategoryAction } = await import("./actions");

    await expect(
      updateCategoryAction(
        initialTaxonomyFormState,
        createFormData({ taxonomyId: "42", name: "Frontend", slug: "frontend" }),
      ),
    ).rejects.toMatchObject({
      destination: "/admin/categories?updated=1",
    });

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/admin/categories");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/categories/new");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/admin/categories/42");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(4, "/admin/posts/new");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(5, "/admin/posts/[postId]", "page");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(6, "/category/frontend");
  });

  it("redirects unauthenticated updates to the category-specific login URL", async () => {
    getAdminPathMock.mockResolvedValue("dashboard");
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: false });

    const { updateCategoryAction } = await import("./actions");

    await expect(
      updateCategoryAction(
        initialTaxonomyFormState,
        createFormData({ adminPath: "admin", taxonomyId: "99" }),
      ),
    ).rejects.toMatchObject({
      destination: "/dashboard/login?redirect=%2Fdashboard%2Fcategories%2F99",
    });
  });

  it("redirects to the error flag when deleting a category fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    deleteAdminTaxonomyMock.mockResolvedValue({
      success: false,
      error: "该分类仍被文章使用，无法删除。",
    });

    const { deleteCategoryAction } = await import("./actions");

    await expect(
      deleteCategoryAction(createFormData({ taxonomyId: "7" })),
    ).rejects.toMatchObject({
      destination: "/admin/categories?error=delete_failed",
    });

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("revalidates list and dependent pages after a successful delete", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    deleteAdminTaxonomyMock.mockResolvedValue({
      success: true,
      taxonomyId: 7,
      slug: "legacy-category",
    });

    const { deleteCategoryAction } = await import("./actions");

    await expect(
      deleteCategoryAction(createFormData({ taxonomyId: "7", slug: "ignored" })),
    ).rejects.toMatchObject({
      destination: "/admin/categories?deleted=1",
    });

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/admin/categories");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/categories/new");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/admin/categories/7");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(4, "/admin/posts/new");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(5, "/admin/posts/[postId]", "page");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(6, "/category/legacy-category");
  });
});

function createFormData(
  overrides: Partial<{
    adminPath: string;
    taxonomyId: string;
    name: string;
    slug: string;
    description: string;
    parentId: string;
  }> = {},
) {
  const values = {
    adminPath: "admin",
    taxonomyId: "1",
    name: "Category",
    slug: "category",
    description: "",
    parentId: "",
    ...overrides,
  };

  const formData = new FormData();
  formData.set("adminPath", values.adminPath);
  formData.set("taxonomyId", values.taxonomyId);
  formData.set("name", values.name);
  formData.set("slug", values.slug);
  formData.set("description", values.description);
  formData.set("parentId", values.parentId);
  return formData;
}

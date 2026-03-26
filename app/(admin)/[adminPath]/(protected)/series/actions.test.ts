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

describe("admin series actions", () => {
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

    const { createSeriesAction } = await import("./actions");

    await expect(
      createSeriesAction(initialTaxonomyFormState, createFormData({ adminPath: "admin" })),
    ).rejects.toMatchObject({
      destination: "/dashboard/login?redirect=%2Fdashboard%2Fseries%2Fnew",
    });
  });

  it("returns form state when series validation fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    createAdminTaxonomyMock.mockResolvedValue({
      success: false,
      values: {
        ...initialTaxonomyFormState.values,
        name: "Frontend",
        slug: "frontend",
      },
      errors: {
        slug: "该 slug 已存在，请更换。",
      },
    });

    const { createSeriesAction } = await import("./actions");
    const result = await createSeriesAction(
      initialTaxonomyFormState,
      createFormData({ name: "Frontend", slug: "frontend" }),
    );

    expect(result).toMatchObject({
      errors: {
        slug: "该 slug 已存在，请更换。",
      },
    });
  });

  it("revalidates related paths and redirects after a successful update", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    updateAdminTaxonomyMock.mockResolvedValue({
      success: true,
      taxonomyId: 4,
      slug: "frontend-roadmap",
    });

    const { updateSeriesAction } = await import("./actions");

    await expect(
      updateSeriesAction(
        initialTaxonomyFormState,
        createFormData({ taxonomyId: "4", name: "Frontend", slug: "ignored" }),
      ),
    ).rejects.toMatchObject({
      destination: "/admin/series?updated=1",
    });

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/admin/series");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/series/new");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/admin/series/4");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(4, "/admin/posts/new");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(5, "/admin/posts/[postId]", "page");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(6, "/series/frontend-roadmap");
  });

  it("redirects to the error flag when deleting a series fails", async () => {
    getAdminSessionMock.mockResolvedValue({ isAuthenticated: true });
    deleteAdminTaxonomyMock.mockResolvedValue({
      success: false,
      error: "该系列仍被文章使用，无法删除。",
    });

    const { deleteSeriesAction } = await import("./actions");

    await expect(
      deleteSeriesAction(createFormData({ taxonomyId: "4" })),
    ).rejects.toMatchObject({
      destination: "/admin/series?error=delete_failed",
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
    name: "Series",
    slug: "series",
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

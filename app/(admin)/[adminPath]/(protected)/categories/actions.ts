"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAdminTaxonomy,
  deleteAdminTaxonomy,
  updateAdminTaxonomy,
} from "@/lib/admin/taxonomies";
import { createTaxonomyFormState } from "@/lib/admin/taxonomy-form";
import { requireAuthenticatedAdminPath } from "../action-helpers";

import type { TaxonomyFormState } from "@/lib/admin/taxonomy-form";

function revalidateCategoryPaths(adminPath: string, categoryId?: number, slug?: string) {
  revalidatePath(`/${adminPath}/categories`);
  revalidatePath(`/${adminPath}/categories/new`);

  if (categoryId) {
    revalidatePath(`/${adminPath}/categories/${categoryId}`);
  }

  revalidatePath(`/${adminPath}/posts/new`);
  revalidatePath(`/${adminPath}/posts/[postId]`, "page");

  if (slug?.trim()) {
    revalidatePath(`/category/${slug.trim()}`);
  }
}

export async function createCategoryAction(
  _prevState: TaxonomyFormState,
  formData: FormData,
): Promise<TaxonomyFormState> {
  const effectiveAdminPath = await requireAuthenticatedAdminPath(
    String(formData.get("adminPath") ?? ""),
    (adminPath) => `/${adminPath}/categories/new`,
  );

  const result = await createAdminTaxonomy("category", {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    parentId: String(formData.get("parentId") ?? ""),
  });

  if (!result.success) {
    return createTaxonomyFormState(result.values, result.errors);
  }

  revalidateCategoryPaths(effectiveAdminPath, result.taxonomyId, result.slug);
  redirect(`/${effectiveAdminPath}/categories?created=1`);
}

export async function updateCategoryAction(
  _prevState: TaxonomyFormState,
  formData: FormData,
): Promise<TaxonomyFormState> {
  const effectiveAdminPath = await requireAuthenticatedAdminPath(
    String(formData.get("adminPath") ?? ""),
    (adminPath) => `/${adminPath}/categories/${String(formData.get("taxonomyId") ?? "")}`,
  );
  const taxonomyId = Number.parseInt(String(formData.get("taxonomyId") ?? ""), 10);

  const result = await updateAdminTaxonomy("category", taxonomyId, {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    parentId: String(formData.get("parentId") ?? ""),
  });

  if (!result.success) {
    return createTaxonomyFormState(result.values, result.errors);
  }

  revalidateCategoryPaths(effectiveAdminPath, result.taxonomyId, result.slug);
  redirect(`/${effectiveAdminPath}/categories?updated=1`);
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const effectiveAdminPath = await requireAuthenticatedAdminPath(
    String(formData.get("adminPath") ?? ""),
    (adminPath) => `/${adminPath}/categories`,
  );

  const taxonomyId = Number.parseInt(String(formData.get("taxonomyId") ?? ""), 10);
  const result = await deleteAdminTaxonomy("category", taxonomyId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/categories?error=delete_failed`);
  }

  revalidateCategoryPaths(effectiveAdminPath, result.taxonomyId, result.slug);
  redirect(`/${effectiveAdminPath}/categories?deleted=1`);
}

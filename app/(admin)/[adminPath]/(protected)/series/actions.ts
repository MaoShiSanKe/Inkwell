"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAdminTaxonomy,
  deleteAdminTaxonomy,
  updateAdminTaxonomy,
} from "@/lib/admin/taxonomies";
import { createTaxonomyFormState } from "@/lib/admin/taxonomy-form";
import { getAdminSession } from "@/lib/auth";
import { getAdminPath } from "@/lib/settings";

import type { TaxonomyFormState } from "@/lib/admin/taxonomy-form";

function revalidateSeriesPaths(adminPath: string, taxonomyId?: number, slug?: string) {
  revalidatePath(`/${adminPath}/series`);
  revalidatePath(`/${adminPath}/series/new`);

  if (taxonomyId) {
    revalidatePath(`/${adminPath}/series/${taxonomyId}`);
  }

  revalidatePath(`/${adminPath}/posts/new`);
  revalidatePath(`/${adminPath}/posts/[postId]`, "page");

  if (slug?.trim()) {
    revalidatePath(`/series/${slug.trim()}`);
  }
}

export async function createSeriesAction(
  _prevState: TaxonomyFormState,
  formData: FormData,
): Promise<TaxonomyFormState> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/series/new`)}`,
    );
  }

  const result = await createAdminTaxonomy("series", {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!result.success) {
    return createTaxonomyFormState(result.values, result.errors);
  }

  revalidateSeriesPaths(effectiveAdminPath, result.taxonomyId, result.slug);
  redirect(`/${effectiveAdminPath}/series?created=1`);
}

export async function updateSeriesAction(
  _prevState: TaxonomyFormState,
  formData: FormData,
): Promise<TaxonomyFormState> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/series/${String(formData.get("taxonomyId") ?? "")}`)}`,
    );
  }

  const taxonomyId = Number.parseInt(String(formData.get("taxonomyId") ?? ""), 10);
  const result = await updateAdminTaxonomy("series", taxonomyId, {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!result.success) {
    return createTaxonomyFormState(result.values, result.errors);
  }

  revalidateSeriesPaths(effectiveAdminPath, result.taxonomyId, result.slug);
  redirect(`/${effectiveAdminPath}/series?updated=1`);
}

export async function deleteSeriesAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/series`)}`,
    );
  }

  const taxonomyId = Number.parseInt(String(formData.get("taxonomyId") ?? ""), 10);
  const result = await deleteAdminTaxonomy("series", taxonomyId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/series?error=delete_failed`);
  }

  revalidateSeriesPaths(effectiveAdminPath, result.taxonomyId, result.slug);
  redirect(`/${effectiveAdminPath}/series?deleted=1`);
}

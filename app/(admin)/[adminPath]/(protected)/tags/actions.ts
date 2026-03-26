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

function revalidateTagPaths(adminPath: string, taxonomyId?: number, slug?: string) {
  revalidatePath(`/${adminPath}/tags`);
  revalidatePath(`/${adminPath}/tags/new`);

  if (taxonomyId) {
    revalidatePath(`/${adminPath}/tags/${taxonomyId}`);
  }

  revalidatePath(`/${adminPath}/posts/new`);
  revalidatePath(`/${adminPath}/posts/[postId]`, "page");

  if (slug?.trim()) {
    revalidatePath(`/tag/${slug.trim()}`);
  }
}

export async function createTagAction(
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
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/tags/new`)}`,
    );
  }

  const result = await createAdminTaxonomy("tag", {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!result.success) {
    return createTaxonomyFormState(result.values, result.errors);
  }

  revalidateTagPaths(effectiveAdminPath, result.taxonomyId, result.slug);
  redirect(`/${effectiveAdminPath}/tags?created=1`);
}

export async function updateTagAction(
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
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/tags/${String(formData.get("taxonomyId") ?? "")}`)}`,
    );
  }

  const taxonomyId = Number.parseInt(String(formData.get("taxonomyId") ?? ""), 10);
  const result = await updateAdminTaxonomy("tag", taxonomyId, {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!result.success) {
    return createTaxonomyFormState(result.values, result.errors);
  }

  revalidateTagPaths(effectiveAdminPath, result.taxonomyId, result.slug);
  redirect(`/${effectiveAdminPath}/tags?updated=1`);
}

export async function deleteTagAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/tags`)}`,
    );
  }

  const taxonomyId = Number.parseInt(String(formData.get("taxonomyId") ?? ""), 10);
  const result = await deleteAdminTaxonomy("tag", taxonomyId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/tags?error=delete_failed`);
  }

  revalidateTagPaths(effectiveAdminPath, result.taxonomyId, result.slug);
  redirect(`/${effectiveAdminPath}/tags?deleted=1`);
}

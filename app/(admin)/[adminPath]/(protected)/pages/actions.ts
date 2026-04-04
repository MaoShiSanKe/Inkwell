"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAdminPage,
  moveAdminPageToTrash,
  restoreAdminPageFromTrash,
  updateAdminPage,
} from "@/lib/admin/pages";
import { createPageFormState } from "@/lib/admin/page-form";
import { getAdminSession } from "@/lib/auth";
import { getAdminPath } from "@/lib/settings";

import type { CreatePageActionState, UpdatePageActionState } from "./form-state";

function revalidatePagePaths(slugs: string[]) {
  for (const slug of Array.from(new Set(slugs.map((value) => value.trim()).filter(Boolean)))) {
    revalidatePath(`/${slug}`);
    revalidatePath(`/standalone/${slug}`);
  }

  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

async function requireEffectiveAdminPath(adminPath: string, redirectPath: string) {
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath = adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(`/${effectiveAdminPath}/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  return effectiveAdminPath;
}

export async function createPageAction(
  _prevState: CreatePageActionState,
  formData: FormData,
): Promise<CreatePageActionState> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const effectiveAdminPath = await requireEffectiveAdminPath(adminPath, `/${adminPath}/pages/new`);

  const result = await createAdminPage({
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    content: String(formData.get("content") ?? ""),
    status: String(formData.get("status") ?? "draft") as "draft" | "published" | "trash",
    metaTitle: String(formData.get("metaTitle") ?? ""),
    metaDescription: String(formData.get("metaDescription") ?? ""),
    ogTitle: String(formData.get("ogTitle") ?? ""),
    ogDescription: String(formData.get("ogDescription") ?? ""),
    ogImageMediaId: String(formData.get("ogImageMediaId") ?? ""),
    canonicalUrl: String(formData.get("canonicalUrl") ?? ""),
    noindex: formData.get("noindex") === "on",
    nofollow: formData.get("nofollow") === "on",
  });

  if (!result.success) {
    return createPageFormState(result.values, result.errors);
  }

  revalidatePath(`/${effectiveAdminPath}/pages`);
  revalidatePagePaths(result.affectedSlugs);
  redirect(`/${effectiveAdminPath}/pages?created=1`);
}

export async function updatePageAction(
  _prevState: UpdatePageActionState,
  formData: FormData,
): Promise<UpdatePageActionState> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const pageId = Number.parseInt(String(formData.get("pageId") ?? ""), 10);
  const effectiveAdminPath = await requireEffectiveAdminPath(adminPath, `/${adminPath}/pages/${pageId}`);

  const result = await updateAdminPage(pageId, {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    content: String(formData.get("content") ?? ""),
    status: String(formData.get("status") ?? "draft") as "draft" | "published" | "trash",
    metaTitle: String(formData.get("metaTitle") ?? ""),
    metaDescription: String(formData.get("metaDescription") ?? ""),
    ogTitle: String(formData.get("ogTitle") ?? ""),
    ogDescription: String(formData.get("ogDescription") ?? ""),
    ogImageMediaId: String(formData.get("ogImageMediaId") ?? ""),
    canonicalUrl: String(formData.get("canonicalUrl") ?? ""),
    noindex: formData.get("noindex") === "on",
    nofollow: formData.get("nofollow") === "on",
  });

  if (!result.success) {
    return createPageFormState(result.values, result.errors);
  }

  revalidatePath(`/${effectiveAdminPath}/pages`);
  revalidatePagePaths(result.affectedSlugs);
  redirect(`/${effectiveAdminPath}/pages?updated=1`);
}

export async function movePageToTrashAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const pageId = Number.parseInt(String(formData.get("pageId") ?? ""), 10);
  const effectiveAdminPath = await requireEffectiveAdminPath(adminPath, `/${adminPath}/pages`);
  const result = await moveAdminPageToTrash(pageId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/pages?error=trash_failed`);
  }

  revalidatePath(`/${effectiveAdminPath}/pages`);
  revalidatePath(`/${effectiveAdminPath}/pages/${pageId}`);
  revalidatePagePaths(result.affectedSlugs);
  redirect(`/${effectiveAdminPath}/pages?trashed=1`);
}

export async function restorePageAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const pageId = Number.parseInt(String(formData.get("pageId") ?? ""), 10);
  const effectiveAdminPath = await requireEffectiveAdminPath(adminPath, `/${adminPath}/pages`);
  const result = await restoreAdminPageFromTrash(pageId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/pages?error=restore_failed`);
  }

  revalidatePath(`/${effectiveAdminPath}/pages`);
  revalidatePath(`/${effectiveAdminPath}/pages/${pageId}`);
  revalidatePagePaths(result.affectedSlugs);
  redirect(`/${effectiveAdminPath}/pages?restored=1`);
}

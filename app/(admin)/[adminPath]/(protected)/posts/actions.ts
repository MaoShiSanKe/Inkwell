"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAdminPost,
  moveAdminPostToTrash,
  restoreAdminPostFromTrash,
  restoreAdminPostRevision,
  updateAdminPost,
  type CreateAdminPostResult,
  type UpdateAdminPostResult,
} from "@/lib/admin/posts";
import { createPostFormState, toScheduledAtIso } from "@/lib/admin/post-form";
import { getAdminSession } from "@/lib/auth";
import { getAdminPath } from "@/lib/settings";

import type {
  CreatePostActionState,
  UpdatePostActionState,
} from "./form-state";

function revalidateBlogPostPaths(slugs: string[]) {
  for (const slug of Array.from(
    new Set(slugs.map((value) => value.trim()).filter(Boolean)),
  )) {
    revalidatePath(`/post/${slug}`);
  }
}

export async function createPostAction(
  _prevState: CreatePostActionState,
  formData: FormData,
): Promise<CreatePostActionState> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/posts/new`)}`,
    );
  }

  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  const scheduledAtIso =
    String(formData.get("scheduledAtIso") ?? "") || toScheduledAtIso(scheduledAt);

  const result = (await createAdminPost({
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    content: String(formData.get("content") ?? ""),
    status: String(formData.get("status") ?? "draft") as
      | "draft"
      | "published"
      | "scheduled",
    scheduledAt,
    scheduledAtIso,
    tagIds: formData.getAll("tagIds").map(String),
    seriesIds: formData.getAll("seriesIds").map(String),
    metaTitle: String(formData.get("metaTitle") ?? ""),
    metaDescription: String(formData.get("metaDescription") ?? ""),
    ogTitle: String(formData.get("ogTitle") ?? ""),
    ogDescription: String(formData.get("ogDescription") ?? ""),
    ogImageMediaId: String(formData.get("ogImageMediaId") ?? ""),
    canonicalUrl: String(formData.get("canonicalUrl") ?? ""),
    breadcrumbEnabled: formData.get("breadcrumbEnabled") === "on",
    noindex: formData.get("noindex") === "on",
    nofollow: formData.get("nofollow") === "on",
  })) as CreateAdminPostResult;

  if (!result.success) {
    return createPostFormState(result.values, result.errors);
  }

  revalidatePath(`/${effectiveAdminPath}/posts`);
  revalidateBlogPostPaths(result.affectedSlugs);
  redirect(`/${effectiveAdminPath}/posts?created=1`);
}

export async function updatePostAction(
  _prevState: UpdatePostActionState,
  formData: FormData,
): Promise<UpdatePostActionState> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    const postId = String(formData.get("postId") ?? "");
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/posts/${postId}`)}`,
    );
  }

  const postId = Number.parseInt(String(formData.get("postId") ?? ""), 10);
  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  const scheduledAtIso =
    String(formData.get("scheduledAtIso") ?? "") || toScheduledAtIso(scheduledAt);

  const result = (await updateAdminPost(postId, {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    content: String(formData.get("content") ?? ""),
    status: String(formData.get("status") ?? "draft") as
      | "draft"
      | "published"
      | "scheduled",
    scheduledAt,
    scheduledAtIso,
    tagIds: formData.getAll("tagIds").map(String),
    seriesIds: formData.getAll("seriesIds").map(String),
    metaTitle: String(formData.get("metaTitle") ?? ""),
    metaDescription: String(formData.get("metaDescription") ?? ""),
    ogTitle: String(formData.get("ogTitle") ?? ""),
    ogDescription: String(formData.get("ogDescription") ?? ""),
    ogImageMediaId: String(formData.get("ogImageMediaId") ?? ""),
    canonicalUrl: String(formData.get("canonicalUrl") ?? ""),
    breadcrumbEnabled: formData.get("breadcrumbEnabled") === "on",
    noindex: formData.get("noindex") === "on",
    nofollow: formData.get("nofollow") === "on",
  })) as UpdateAdminPostResult;

  if (!result.success) {
    return createPostFormState(result.values, result.errors);
  }

  revalidatePath(`/${effectiveAdminPath}/posts`);
  revalidateBlogPostPaths(result.affectedSlugs);
  redirect(`/${effectiveAdminPath}/posts?updated=1`);
}

export async function movePostToTrashAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/posts`)}`,
    );
  }

  const postId = Number.parseInt(String(formData.get("postId") ?? ""), 10);
  const result = await moveAdminPostToTrash(postId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/posts?error=trash_failed`);
  }

  revalidatePath(`/${effectiveAdminPath}/posts`);
  revalidatePath(`/${effectiveAdminPath}/posts/${postId}`);
  revalidateBlogPostPaths(result.affectedSlugs);
  redirect(`/${effectiveAdminPath}/posts?trashed=1`);
}

export async function restorePostAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/posts`)}`,
    );
  }

  const postId = Number.parseInt(String(formData.get("postId") ?? ""), 10);
  const result = await restoreAdminPostFromTrash(postId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/posts?error=restore_failed`);
  }

  revalidatePath(`/${effectiveAdminPath}/posts`);
  revalidatePath(`/${effectiveAdminPath}/posts/${postId}`);
  revalidateBlogPostPaths(result.affectedSlugs);
  redirect(`/${effectiveAdminPath}/posts?restored=1`);
}

export async function restorePostRevisionAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/posts`)}`,
    );
  }

  const postId = Number.parseInt(String(formData.get("postId") ?? ""), 10);
  const revisionId = Number.parseInt(String(formData.get("revisionId") ?? ""), 10);
  const result = await restoreAdminPostRevision(postId, revisionId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/posts/${postId}?error=revision_restore_failed`);
  }

  revalidatePath(`/${effectiveAdminPath}/posts`);
  revalidatePath(`/${effectiveAdminPath}/posts/${postId}`);
  revalidateBlogPostPaths(result.affectedSlugs);
  redirect(`/${effectiveAdminPath}/posts/${postId}?revisionRestored=1`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAdminPost,
  updateAdminPost,
  type CreateAdminPostResult,
  type UpdateAdminPostResult,
} from "@/lib/admin/posts";
import { createPostFormState } from "@/lib/admin/post-form";
import { getAdminSession } from "@/lib/auth";
import { getAdminPath } from "@/lib/settings";

import type {
  CreatePostActionState,
  UpdatePostActionState,
} from "./form-state";

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

  const result = (await createAdminPost({
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    content: String(formData.get("content") ?? ""),
    status: String(formData.get("status") ?? "draft") as
      | "draft"
      | "published",
    tagIds: formData.getAll("tagIds").map(String),
    seriesIds: formData.getAll("seriesIds").map(String),
    metaTitle: String(formData.get("metaTitle") ?? ""),
    metaDescription: String(formData.get("metaDescription") ?? ""),
    ogTitle: String(formData.get("ogTitle") ?? ""),
    ogDescription: String(formData.get("ogDescription") ?? ""),
    canonicalUrl: String(formData.get("canonicalUrl") ?? ""),
    breadcrumbEnabled: formData.get("breadcrumbEnabled") === "on",
    noindex: formData.get("noindex") === "on",
    nofollow: formData.get("nofollow") === "on",
  })) as CreateAdminPostResult;

  if (!result.success) {
    return createPostFormState(result.values, result.errors);
  }

  revalidatePath(`/${effectiveAdminPath}/posts`);
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

  const result = (await updateAdminPost(postId, {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    content: String(formData.get("content") ?? ""),
    status: String(formData.get("status") ?? "draft") as
      | "draft"
      | "published",
    tagIds: formData.getAll("tagIds").map(String),
    seriesIds: formData.getAll("seriesIds").map(String),
    metaTitle: String(formData.get("metaTitle") ?? ""),
    metaDescription: String(formData.get("metaDescription") ?? ""),
    ogTitle: String(formData.get("ogTitle") ?? ""),
    ogDescription: String(formData.get("ogDescription") ?? ""),
    canonicalUrl: String(formData.get("canonicalUrl") ?? ""),
    breadcrumbEnabled: formData.get("breadcrumbEnabled") === "on",
    noindex: formData.get("noindex") === "on",
    nofollow: formData.get("nofollow") === "on",
  })) as UpdateAdminPostResult;

  if (!result.success) {
    return createPostFormState(result.values, result.errors);
  }

  revalidatePath(`/${effectiveAdminPath}/posts`);
  redirect(`/${effectiveAdminPath}/posts?updated=1`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  approveAdminComment,
  markAdminCommentAsSpam,
  moveAdminCommentToTrash,
  restoreAdminCommentFromTrash,
} from "@/lib/admin/comments";
import { getAdminSession } from "@/lib/auth";
import { getAdminPath } from "@/lib/settings";

function revalidateCommentPaths(adminPath: string, postSlug?: string) {
  revalidatePath(`/${adminPath}`);
  revalidatePath(`/${adminPath}/comments`);

  if (postSlug?.trim()) {
    revalidatePath(`/post/${postSlug.trim()}`);
  }
}

async function requireAuthenticatedAdmin(adminPath: string) {
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/comments`)}`,
    );
  }

  return effectiveAdminPath;
}

export async function approveCommentAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const effectiveAdminPath = await requireAuthenticatedAdmin(adminPath);
  const commentId = Number.parseInt(String(formData.get("commentId") ?? ""), 10);
  const result = await approveAdminComment(commentId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/comments?error=approve_failed`);
  }

  revalidateCommentPaths(effectiveAdminPath, result.postSlug);
  redirect(`/${effectiveAdminPath}/comments?approved=1`);
}

export async function markCommentAsSpamAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const effectiveAdminPath = await requireAuthenticatedAdmin(adminPath);
  const commentId = Number.parseInt(String(formData.get("commentId") ?? ""), 10);
  const result = await markAdminCommentAsSpam(commentId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/comments?error=spam_failed`);
  }

  revalidateCommentPaths(effectiveAdminPath, result.postSlug);
  redirect(`/${effectiveAdminPath}/comments?spam=1`);
}

export async function moveCommentToTrashAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const effectiveAdminPath = await requireAuthenticatedAdmin(adminPath);
  const commentId = Number.parseInt(String(formData.get("commentId") ?? ""), 10);
  const result = await moveAdminCommentToTrash(commentId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/comments?error=trash_failed`);
  }

  revalidateCommentPaths(effectiveAdminPath, result.postSlug);
  redirect(`/${effectiveAdminPath}/comments?trashed=1`);
}

export async function restoreCommentAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const effectiveAdminPath = await requireAuthenticatedAdmin(adminPath);
  const commentId = Number.parseInt(String(formData.get("commentId") ?? ""), 10);
  const result = await restoreAdminCommentFromTrash(commentId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/comments?error=restore_failed`);
  }

  revalidateCommentPaths(effectiveAdminPath, result.postSlug);
  redirect(`/${effectiveAdminPath}/comments?restored=1`);
}

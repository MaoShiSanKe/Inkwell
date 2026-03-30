"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAdminFriendLink,
  moveAdminFriendLinkToTrash,
  restoreAdminFriendLinkFromTrash,
  updateAdminFriendLink,
} from "@/lib/admin/friend-links";
import { createFriendLinkFormState } from "@/lib/admin/friend-link-form";
import { getAdminSession } from "@/lib/auth";
import { getAdminPath } from "@/lib/settings";

import type {
  CreateFriendLinkActionState,
  UpdateFriendLinkActionState,
} from "./form-state";

function revalidateFriendLinkPaths(adminPath: string, friendLinkId?: number) {
  revalidatePath(`/${adminPath}`);
  revalidatePath(`/${adminPath}/friend-links`);
  revalidatePath(`/${adminPath}/friend-links/new`);

  if (friendLinkId) {
    revalidatePath(`/${adminPath}/friend-links/${friendLinkId}`);
  }

  revalidatePath("/friend-links");
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

export async function createFriendLinkAction(
  _prevState: CreateFriendLinkActionState,
  formData: FormData,
): Promise<CreateFriendLinkActionState> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const effectiveAdminPath = await requireEffectiveAdminPath(
    adminPath,
    `/${adminPath}/friend-links/new`,
  );

  const result = await createAdminFriendLink({
    siteName: String(formData.get("siteName") ?? ""),
    url: String(formData.get("url") ?? ""),
    description: String(formData.get("description") ?? ""),
    logoMediaId: String(formData.get("logoMediaId") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    status: String(formData.get("status") ?? "draft") as "draft" | "published" | "trash",
  });

  if (!result.success) {
    return createFriendLinkFormState(result.values, result.errors);
  }

  revalidateFriendLinkPaths(effectiveAdminPath, result.friendLinkId);
  redirect(`/${effectiveAdminPath}/friend-links?created=1`);
}

export async function updateFriendLinkAction(
  _prevState: UpdateFriendLinkActionState,
  formData: FormData,
): Promise<UpdateFriendLinkActionState> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const friendLinkId = Number.parseInt(String(formData.get("friendLinkId") ?? ""), 10);
  const effectiveAdminPath = await requireEffectiveAdminPath(
    adminPath,
    `/${adminPath}/friend-links/${friendLinkId}`,
  );

  const result = await updateAdminFriendLink(friendLinkId, {
    siteName: String(formData.get("siteName") ?? ""),
    url: String(formData.get("url") ?? ""),
    description: String(formData.get("description") ?? ""),
    logoMediaId: String(formData.get("logoMediaId") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    status: String(formData.get("status") ?? "draft") as "draft" | "published" | "trash",
  });

  if (!result.success) {
    return createFriendLinkFormState(result.values, result.errors);
  }

  revalidateFriendLinkPaths(effectiveAdminPath, result.friendLinkId);
  redirect(`/${effectiveAdminPath}/friend-links?updated=1`);
}

export async function moveFriendLinkToTrashAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const friendLinkId = Number.parseInt(String(formData.get("friendLinkId") ?? ""), 10);
  const effectiveAdminPath = await requireEffectiveAdminPath(adminPath, `/${adminPath}/friend-links`);
  const result = await moveAdminFriendLinkToTrash(friendLinkId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/friend-links?error=trash_failed`);
  }

  revalidateFriendLinkPaths(effectiveAdminPath, result.friendLinkId);
  redirect(`/${effectiveAdminPath}/friend-links?trashed=1`);
}

export async function restoreFriendLinkAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const friendLinkId = Number.parseInt(String(formData.get("friendLinkId") ?? ""), 10);
  const effectiveAdminPath = await requireEffectiveAdminPath(adminPath, `/${adminPath}/friend-links`);
  const result = await restoreAdminFriendLinkFromTrash(friendLinkId);

  if (!result.success) {
    redirect(`/${effectiveAdminPath}/friend-links?error=restore_failed`);
  }

  revalidateFriendLinkPaths(effectiveAdminPath, result.friendLinkId);
  redirect(`/${effectiveAdminPath}/friend-links?restored=1`);
}

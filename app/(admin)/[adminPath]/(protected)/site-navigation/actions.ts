"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAdminSiteNavigation,
  deleteAdminSiteNavigation,
  updateAdminSiteNavigation,
} from "@/lib/admin/site-navigation";
import { createSiteNavigationFormState } from "@/lib/admin/site-navigation-form";
import { getAdminSession } from "@/lib/auth";
import { getAdminPath } from "@/lib/settings";

import type {
  CreateSiteNavigationActionState,
  UpdateSiteNavigationActionState,
} from "./form-state";

function revalidateSiteNavigationPaths(adminPath: string, itemId?: number) {
  revalidatePath(`/${adminPath}`);
  revalidatePath(`/${adminPath}/site-navigation`);
  revalidatePath(`/${adminPath}/site-navigation/new`);

  if (itemId) {
    revalidatePath(`/${adminPath}/site-navigation/${itemId}`);
  }

  revalidatePath("/", "layout");
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

export async function createSiteNavigationAction(
  _prevState: CreateSiteNavigationActionState,
  formData: FormData,
): Promise<CreateSiteNavigationActionState> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const effectiveAdminPath = await requireEffectiveAdminPath(
    adminPath,
    `/${adminPath}/site-navigation/new`,
  );

  const result = await createAdminSiteNavigation({
    label: String(formData.get("label") ?? ""),
    url: String(formData.get("url") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    openInNewTab: String(formData.get("openInNewTab") ?? "false") as "true" | "false",
    visible: String(formData.get("visible") ?? "true") as "true" | "false",
  });

  if (!result.success) {
    return createSiteNavigationFormState(result.values, result.errors);
  }

  revalidateSiteNavigationPaths(effectiveAdminPath, result.itemId);
  redirect(`/${effectiveAdminPath}/site-navigation?created=1`);
}

export async function updateSiteNavigationAction(
  _prevState: UpdateSiteNavigationActionState,
  formData: FormData,
): Promise<UpdateSiteNavigationActionState> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const itemId = Number.parseInt(String(formData.get("itemId") ?? ""), 10);
  const effectiveAdminPath = await requireEffectiveAdminPath(
    adminPath,
    `/${adminPath}/site-navigation/${itemId}`,
  );

  const result = await updateAdminSiteNavigation(itemId, {
    label: String(formData.get("label") ?? ""),
    url: String(formData.get("url") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    openInNewTab: String(formData.get("openInNewTab") ?? "false") as "true" | "false",
    visible: String(formData.get("visible") ?? "true") as "true" | "false",
  });

  if (!result.success) {
    return createSiteNavigationFormState(result.values, result.errors);
  }

  revalidateSiteNavigationPaths(effectiveAdminPath, result.itemId);
  redirect(`/${effectiveAdminPath}/site-navigation?updated=1`);
}

export async function deleteSiteNavigationAction(formData: FormData): Promise<void> {
  const adminPath = String(formData.get("adminPath") ?? "");
  const itemId = Number.parseInt(String(formData.get("itemId") ?? ""), 10);
  const effectiveAdminPath = await requireEffectiveAdminPath(adminPath, `/${adminPath}/site-navigation`);
  const deleted = await deleteAdminSiteNavigation(itemId);

  if (!deleted) {
    redirect(`/${effectiveAdminPath}/site-navigation?error=delete_failed`);
  }

  revalidateSiteNavigationPaths(effectiveAdminPath, itemId);
  redirect(`/${effectiveAdminPath}/site-navigation?deleted=1`);
}

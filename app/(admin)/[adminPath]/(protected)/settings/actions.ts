"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateAdminSettings } from "@/lib/admin/settings";
import {
  createSettingsFormState,
  type SettingsFormState,
} from "@/lib/admin/settings-form";
import { getAdminSession } from "@/lib/auth";
import { getAdminPath } from "@/lib/settings";

function revalidateSettingsPaths(currentAdminPath: string, nextAdminPath: string) {
  const pagePaths = new Set([
    `/${currentAdminPath}`,
    `/${currentAdminPath}/settings`,
    `/${nextAdminPath}`,
    `/${nextAdminPath}/settings`,
  ]);

  for (const path of pagePaths) {
    revalidatePath(path);
  }
}

async function requireAuthenticatedAdmin(adminPath: string) {
  const configuredAdminPath = await getAdminPath();
  const effectiveAdminPath =
    adminPath === configuredAdminPath ? adminPath : configuredAdminPath;
  const session = await getAdminSession();

  if (!session.isAuthenticated) {
    redirect(
      `/${effectiveAdminPath}/login?redirect=${encodeURIComponent(`/${effectiveAdminPath}/settings`)}`,
    );
  }

  return effectiveAdminPath;
}

export async function saveSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const effectiveAdminPath = await requireAuthenticatedAdmin(
    String(formData.get("adminPath") ?? ""),
  );
  const result = await updateAdminSettings({
    admin_path: String(formData.get("admin_path") ?? ""),
    revision_limit: String(formData.get("revision_limit") ?? ""),
    revision_ttl_days: String(formData.get("revision_ttl_days") ?? ""),
    excerpt_length: String(formData.get("excerpt_length") ?? ""),
    comment_moderation: String(formData.get("comment_moderation") ?? "") as
      | "pending"
      | "approved"
      | "",
  });

  if (!result.success) {
    return createSettingsFormState(result.values, result.errors);
  }

  revalidateSettingsPaths(effectiveAdminPath, result.nextAdminPath);
  redirect(
    `/${result.nextAdminPath}/settings?saved=1${result.adminPathChanged ? "&adminPathChanged=1" : ""}`,
  );
}

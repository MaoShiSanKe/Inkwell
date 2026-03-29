"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getAdminEmailNotifications,
  updateAdminEmailNotifications,
  updateAdminSettings,
} from "@/lib/admin/settings";
import {
  createEmailNotificationsFormState,
  createSettingsFormState,
  type EmailNotificationsFormState,
  type SettingsFormState,
} from "@/lib/admin/settings-form";
import { DEFAULT_EMAIL_NOTIFICATION_SCENARIOS } from "@/lib/settings-config";
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
    smtp_host: String(formData.get("smtp_host") ?? ""),
    smtp_port: String(formData.get("smtp_port") ?? ""),
    smtp_secure: String(formData.get("smtp_secure") ?? "false") as "true" | "false",
    smtp_username: String(formData.get("smtp_username") ?? ""),
    smtp_password: String(formData.get("smtp_password") ?? ""),
    smtp_from_email: String(formData.get("smtp_from_email") ?? ""),
    smtp_from_name: String(formData.get("smtp_from_name") ?? ""),
  });

  if (!result.success) {
    return createSettingsFormState(result.values, result.errors);
  }

  revalidateSettingsPaths(effectiveAdminPath, result.nextAdminPath);
  redirect(
    `/${result.nextAdminPath}/settings?saved=1${result.adminPathChanged ? "&adminPathChanged=1" : ""}`,
  );
}

export async function saveEmailNotificationsAction(
  _prevState: EmailNotificationsFormState,
  formData: FormData,
): Promise<EmailNotificationsFormState> {
  const effectiveAdminPath = await requireAuthenticatedAdmin(
    String(formData.get("adminPath") ?? ""),
  );

  const toggles = Object.fromEntries(
    DEFAULT_EMAIL_NOTIFICATION_SCENARIOS.map((scenario) => [
      scenario.scenario,
      formData.get(scenario.scenario) === "on",
    ]),
  );
  const result = await updateAdminEmailNotifications(toggles);

  if (!result.success) {
    return createEmailNotificationsFormState(result.scenarios, result.error);
  }

  revalidateSettingsPaths(effectiveAdminPath, effectiveAdminPath);
  return createEmailNotificationsFormState(result.scenarios);
}

export async function getInitialEmailNotificationsFormState() {
  return createEmailNotificationsFormState(await getAdminEmailNotifications());
}

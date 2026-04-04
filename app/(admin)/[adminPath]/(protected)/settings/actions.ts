"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toScheduledAtIso } from "@/lib/admin/post-form";
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

function revalidatePublicLayoutPaths() {
  revalidatePath("/", "layout");
}

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
  const publicNoticeStartAt = String(formData.get("public_notice_start_at") ?? "");
  const publicNoticeStartAtIso =
    String(formData.get("public_notice_start_at_iso") ?? "") ||
    toScheduledAtIso(publicNoticeStartAt);
  const publicNoticeEndAt = String(formData.get("public_notice_end_at") ?? "");
  const publicNoticeEndAtIso =
    String(formData.get("public_notice_end_at_iso") ?? "") ||
    toScheduledAtIso(publicNoticeEndAt);

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
    umami_enabled: String(formData.get("umami_enabled") ?? "false") as "true" | "false",
    umami_website_id: String(formData.get("umami_website_id") ?? ""),
    umami_script_url: String(formData.get("umami_script_url") ?? ""),
    public_head_html: String(formData.get("public_head_html") ?? ""),
    public_footer_html: String(formData.get("public_footer_html") ?? ""),
    public_custom_css: String(formData.get("public_custom_css") ?? ""),
    site_brand_name: String(formData.get("site_brand_name") ?? ""),
    site_tagline: String(formData.get("site_tagline") ?? ""),
    home_hero_title: String(formData.get("home_hero_title") ?? ""),
    home_hero_description: String(formData.get("home_hero_description") ?? ""),
    home_primary_cta_label: String(formData.get("home_primary_cta_label") ?? ""),
    home_primary_cta_url: String(formData.get("home_primary_cta_url") ?? ""),
    home_featured_links_title: String(formData.get("home_featured_links_title") ?? ""),
    home_featured_links_description: String(formData.get("home_featured_links_description") ?? ""),
    home_featured_link_1_label: String(formData.get("home_featured_link_1_label") ?? ""),
    home_featured_link_1_url: String(formData.get("home_featured_link_1_url") ?? ""),
    home_featured_link_1_description: String(formData.get("home_featured_link_1_description") ?? ""),
    home_featured_link_2_label: String(formData.get("home_featured_link_2_label") ?? ""),
    home_featured_link_2_url: String(formData.get("home_featured_link_2_url") ?? ""),
    home_featured_link_2_description: String(formData.get("home_featured_link_2_description") ?? ""),
    home_featured_link_3_label: String(formData.get("home_featured_link_3_label") ?? ""),
    home_featured_link_3_url: String(formData.get("home_featured_link_3_url") ?? ""),
    home_featured_link_3_description: String(formData.get("home_featured_link_3_description") ?? ""),
    home_posts_variant: String(formData.get("home_posts_variant") ?? "comfortable") as
      | "comfortable"
      | "compact",
    home_featured_links_variant: String(formData.get("home_featured_links_variant") ?? "comfortable") as
      | "comfortable"
      | "compact",
    home_show_post_excerpt: String(formData.get("home_show_post_excerpt") ?? "true") as
      | "true"
      | "false",
    home_show_post_author: String(formData.get("home_show_post_author") ?? "true") as
      | "true"
      | "false",
    home_show_post_category: String(formData.get("home_show_post_category") ?? "true") as
      | "true"
      | "false",
    home_show_post_date: String(formData.get("home_show_post_date") ?? "true") as
      | "true"
      | "false",
    public_archive_posts_variant: String(formData.get("public_archive_posts_variant") ?? "comfortable") as
      | "comfortable"
      | "compact",
    public_longform_variant: String(formData.get("public_longform_variant") ?? "comfortable") as
      | "comfortable"
      | "compact",
    public_layout_width: String(formData.get("public_layout_width") ?? "default") as
      | "narrow"
      | "default"
      | "wide",
    public_surface_variant: String(formData.get("public_surface_variant") ?? "soft") as
      | "soft"
      | "solid",
    public_accent_theme: String(formData.get("public_accent_theme") ?? "slate") as
      | "slate"
      | "blue"
      | "emerald"
      | "amber",
    public_header_show_tagline: String(formData.get("public_header_show_tagline") ?? "true") as
      | "true"
      | "false",
    public_footer_blurb: String(formData.get("public_footer_blurb") ?? ""),
    public_footer_copyright: String(formData.get("public_footer_copyright") ?? ""),
    public_theme_default_mode: String(formData.get("public_theme_default_mode") ?? "system") as
      | "system"
      | "light"
      | "dark",
    public_notice_enabled: String(formData.get("public_notice_enabled") ?? "false") as
      | "true"
      | "false",
    public_notice_variant: String(formData.get("public_notice_variant") ?? "info") as
      | "info"
      | "warning"
      | "success",
    public_notice_dismissible: String(formData.get("public_notice_dismissible") ?? "false") as
      | "true"
      | "false",
    public_notice_version: String(formData.get("public_notice_version") ?? ""),
    public_notice_start_at: publicNoticeStartAt,
    public_notice_start_at_iso: publicNoticeStartAtIso,
    public_notice_end_at: publicNoticeEndAt,
    public_notice_end_at_iso: publicNoticeEndAtIso,
    public_notice_title: String(formData.get("public_notice_title") ?? ""),
    public_notice_body: String(formData.get("public_notice_body") ?? ""),
    public_notice_link_label: String(formData.get("public_notice_link_label") ?? ""),
    public_notice_link_url: String(formData.get("public_notice_link_url") ?? ""),
  });

  if (!result.success) {
    return createSettingsFormState(result.values, result.errors);
  }

  revalidateSettingsPaths(effectiveAdminPath, result.nextAdminPath);

  if (result.publicLayoutChanged) {
    revalidatePublicLayoutPaths();
  }

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

import "server-only";

import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailNotifications } from "@/lib/db/schema";
import {
  DEFAULT_EMAIL_NOTIFICATION_SCENARIOS,
  SETTING_KEYS,
  parseSettingValue,
  type EmailNotificationScenario,
  type SettingValues,
} from "@/lib/settings-config";
import {
  getSettings,
  updateSettings as persistSettings,
} from "@/lib/settings";

import {
  formatScheduledAtInputFromIso,
  toScheduledAtIso,
} from "./post-form";
import {
  type SettingsFormErrors,
  type SettingsFormValues,
} from "./settings-form";

export type UpdateAdminSettingsResult =
  | {
      success: true;
      nextAdminPath: string;
      previousAdminPath: string;
      adminPathChanged: boolean;
      publicLayoutChanged: boolean;
    }
  | {
      success: false;
      values: SettingsFormValues;
      errors: SettingsFormErrors;
    };

export type UpdateAdminEmailNotificationsResult =
  | {
      success: true;
      scenarios: EmailNotificationScenario[];
    }
  | {
      success: false;
      scenarios: EmailNotificationScenario[];
      error: string;
    };

function getInitialValues(input: Partial<SettingsFormValues>): SettingsFormValues {
  const publicNoticeStartAtIso = input.public_notice_start_at_iso?.trim() ?? "";
  const publicNoticeStartAt =
    input.public_notice_start_at?.trim() ?? formatScheduledAtInputFromIso(publicNoticeStartAtIso);
  const publicNoticeEndAtIso = input.public_notice_end_at_iso?.trim() ?? "";
  const publicNoticeEndAt =
    input.public_notice_end_at?.trim() ?? formatScheduledAtInputFromIso(publicNoticeEndAtIso);

  return {
    admin_path: input.admin_path?.trim() ?? "",
    revision_limit: input.revision_limit?.trim() ?? "",
    revision_ttl_days: input.revision_ttl_days?.trim() ?? "",
    excerpt_length: input.excerpt_length?.trim() ?? "",
    comment_moderation:
      input.comment_moderation?.trim() === "approved"
        ? "approved"
        : input.comment_moderation?.trim() === "pending"
          ? "pending"
          : "",
    smtp_host: input.smtp_host?.trim() ?? "",
    smtp_port: input.smtp_port?.trim() ?? "",
    smtp_secure:
      input.smtp_secure?.trim() === "true"
        ? "true"
        : input.smtp_secure?.trim() === "false"
          ? "false"
          : "false",
    smtp_username: input.smtp_username?.trim() ?? "",
    smtp_password: input.smtp_password ?? "",
    smtp_from_email: input.smtp_from_email?.trim().toLowerCase() ?? "",
    smtp_from_name: input.smtp_from_name?.trim() ?? "",
    umami_enabled:
      input.umami_enabled?.trim() === "true"
        ? "true"
        : input.umami_enabled?.trim() === "false"
          ? "false"
          : "false",
    umami_website_id: input.umami_website_id?.trim().toLowerCase() ?? "",
    umami_script_url: input.umami_script_url?.trim() ?? "",
    public_head_html: input.public_head_html?.trim() ?? "",
    public_footer_html: input.public_footer_html?.trim() ?? "",
    public_custom_css: input.public_custom_css?.trim() ?? "",
    site_brand_name: input.site_brand_name?.trim() ?? "Inkwell",
    site_tagline: input.site_tagline?.trim() ?? "",
    home_hero_title: input.home_hero_title?.trim() ?? "最新文章",
    home_hero_description:
      input.home_hero_description?.trim() ?? "浏览站点中已经发布的文章与公开归档。",
    home_primary_cta_label: input.home_primary_cta_label?.trim() ?? "订阅新文章",
    home_primary_cta_url: input.home_primary_cta_url?.trim() ?? "/subscribe",
    home_featured_links_title: input.home_featured_links_title?.trim() ?? "精选入口",
    home_featured_links_description:
      input.home_featured_links_description?.trim() ?? "把高频入口放在首页，减少访客寻找内容的成本。",
    home_featured_link_1_label: input.home_featured_link_1_label?.trim() ?? "查看分类",
    home_featured_link_1_url: input.home_featured_link_1_url?.trim() ?? "/category",
    home_featured_link_1_description:
      input.home_featured_link_1_description?.trim() ?? "按主题浏览已经发布的内容。",
    home_featured_link_2_label: input.home_featured_link_2_label?.trim() ?? "查看标签",
    home_featured_link_2_url: input.home_featured_link_2_url?.trim() ?? "/tag",
    home_featured_link_2_description:
      input.home_featured_link_2_description?.trim() ?? "通过标签快速找到相关话题。",
    home_featured_link_3_label: input.home_featured_link_3_label?.trim() ?? "查看友链",
    home_featured_link_3_url: input.home_featured_link_3_url?.trim() ?? "/friend-links",
    home_featured_link_3_description:
      input.home_featured_link_3_description?.trim() ?? "发现更多值得关注的站点与作者。",
    home_posts_variant:
      input.home_posts_variant?.trim() === "compact" ? "compact" : "comfortable",
    home_show_post_excerpt:
      input.home_show_post_excerpt?.trim() === "false" ? "false" : "true",
    home_show_post_author:
      input.home_show_post_author?.trim() === "false" ? "false" : "true",
    home_show_post_category:
      input.home_show_post_category?.trim() === "false" ? "false" : "true",
    home_show_post_date:
      input.home_show_post_date?.trim() === "false" ? "false" : "true",
    public_archive_posts_variant:
      input.public_archive_posts_variant?.trim() === "compact" ? "compact" : "comfortable",
    public_longform_variant:
      input.public_longform_variant?.trim() === "compact" ? "compact" : "comfortable",
    public_layout_width:
      input.public_layout_width?.trim() === "narrow"
        ? "narrow"
        : input.public_layout_width?.trim() === "wide"
          ? "wide"
          : "default",
    public_surface_variant:
      input.public_surface_variant?.trim() === "solid" ? "solid" : "soft",
    public_accent_theme:
      input.public_accent_theme?.trim() === "blue"
        ? "blue"
        : input.public_accent_theme?.trim() === "emerald"
          ? "emerald"
          : input.public_accent_theme?.trim() === "amber"
            ? "amber"
            : "slate",
    public_header_show_tagline:
      input.public_header_show_tagline?.trim() === "false" ? "false" : "true",
    public_footer_blurb: input.public_footer_blurb?.trim() ?? "",
    public_footer_copyright: input.public_footer_copyright?.trim() ?? "",
    public_theme_default_mode:
      input.public_theme_default_mode?.trim() === "light"
        ? "light"
        : input.public_theme_default_mode?.trim() === "dark"
          ? "dark"
          : "system",
    public_notice_enabled:
      input.public_notice_enabled?.trim() === "true"
        ? "true"
        : input.public_notice_enabled?.trim() === "false"
          ? "false"
          : "false",
    public_notice_variant:
      input.public_notice_variant?.trim() === "warning"
        ? "warning"
        : input.public_notice_variant?.trim() === "success"
          ? "success"
          : "info",
    public_notice_dismissible:
      input.public_notice_dismissible?.trim() === "true"
        ? "true"
        : input.public_notice_dismissible?.trim() === "false"
          ? "false"
          : "false",
    public_notice_version: input.public_notice_version?.trim() ?? "",
    public_notice_start_at: publicNoticeStartAt,
    public_notice_start_at_iso: publicNoticeStartAtIso || toScheduledAtIso(publicNoticeStartAt),
    public_notice_end_at: publicNoticeEndAt,
    public_notice_end_at_iso: publicNoticeEndAtIso || toScheduledAtIso(publicNoticeEndAt),
    public_notice_title: input.public_notice_title?.trim() ?? "",
    public_notice_body: input.public_notice_body?.trim() ?? "",
    public_notice_link_label: input.public_notice_link_label?.trim() ?? "",
    public_notice_link_url: input.public_notice_link_url?.trim() ?? "",
  };
}

function toFormValues(values: SettingValues): SettingsFormValues {
  return {
    admin_path: values.admin_path,
    revision_limit: String(values.revision_limit),
    revision_ttl_days: String(values.revision_ttl_days),
    excerpt_length: String(values.excerpt_length),
    comment_moderation: values.comment_moderation,
    smtp_host: values.smtp_host,
    smtp_port: String(values.smtp_port),
    smtp_secure: values.smtp_secure ? "true" : "false",
    smtp_username: values.smtp_username,
    smtp_password: "",
    smtp_from_email: values.smtp_from_email,
    smtp_from_name: values.smtp_from_name,
    umami_enabled: values.umami_enabled ? "true" : "false",
    umami_website_id: values.umami_website_id,
    umami_script_url: values.umami_script_url,
    public_head_html: values.public_head_html,
    public_footer_html: values.public_footer_html,
    public_custom_css: values.public_custom_css,
    site_brand_name: values.site_brand_name,
    site_tagline: values.site_tagline,
    home_hero_title: values.home_hero_title,
    home_hero_description: values.home_hero_description,
    home_primary_cta_label: values.home_primary_cta_label,
    home_primary_cta_url: values.home_primary_cta_url,
    home_featured_links_title: values.home_featured_links_title,
    home_featured_links_description: values.home_featured_links_description,
    home_featured_link_1_label: values.home_featured_link_1_label,
    home_featured_link_1_url: values.home_featured_link_1_url,
    home_featured_link_1_description: values.home_featured_link_1_description,
    home_featured_link_2_label: values.home_featured_link_2_label,
    home_featured_link_2_url: values.home_featured_link_2_url,
    home_featured_link_2_description: values.home_featured_link_2_description,
    home_featured_link_3_label: values.home_featured_link_3_label,
    home_featured_link_3_url: values.home_featured_link_3_url,
    home_featured_link_3_description: values.home_featured_link_3_description,
    home_posts_variant: values.home_posts_variant,
    home_show_post_excerpt: values.home_show_post_excerpt ? "true" : "false",
    home_show_post_author: values.home_show_post_author ? "true" : "false",
    home_show_post_category: values.home_show_post_category ? "true" : "false",
    home_show_post_date: values.home_show_post_date ? "true" : "false",
    public_archive_posts_variant: values.public_archive_posts_variant,
    public_longform_variant: values.public_longform_variant,
    public_layout_width: values.public_layout_width,
    public_surface_variant: values.public_surface_variant,
    public_accent_theme: values.public_accent_theme,
    public_header_show_tagline: values.public_header_show_tagline ? "true" : "false",
    public_footer_blurb: values.public_footer_blurb,
    public_footer_copyright: values.public_footer_copyright,
    public_theme_default_mode: values.public_theme_default_mode,
    public_notice_enabled: values.public_notice_enabled ? "true" : "false",
    public_notice_variant: values.public_notice_variant,
    public_notice_dismissible: values.public_notice_dismissible ? "true" : "false",
    public_notice_version: values.public_notice_version,
    public_notice_start_at: formatScheduledAtInputFromIso(values.public_notice_start_at),
    public_notice_start_at_iso: values.public_notice_start_at,
    public_notice_end_at: formatScheduledAtInputFromIso(values.public_notice_end_at),
    public_notice_end_at_iso: values.public_notice_end_at,
    public_notice_title: values.public_notice_title,
    public_notice_body: values.public_notice_body,
    public_notice_link_label: values.public_notice_link_label,
    public_notice_link_url: values.public_notice_link_url,
  };
}

function getFieldErrorMessage(key: keyof SettingsFormValues) {
  switch (key) {
    case "admin_path":
      return "后台路径不能为空，且只能包含小写字母、数字和短横线。";
    case "revision_limit":
      return "修订保留数量必须是正整数。";
    case "revision_ttl_days":
      return "修订保留天数必须是非负整数。";
    case "excerpt_length":
      return "自动摘要长度必须是正整数。";
    case "comment_moderation":
      return "评论审核模式无效。";
    case "smtp_host":
      return "SMTP Host 格式无效。";
    case "smtp_port":
      return "SMTP 端口必须是正整数。";
    case "smtp_secure":
      return "SMTP 加密模式无效。";
    case "smtp_username":
      return "SMTP 用户名格式无效。";
    case "smtp_password":
      return "SMTP 密码格式无效。";
    case "smtp_from_email":
      return "发件邮箱格式无效。";
    case "smtp_from_name":
      return "发件人名称格式无效。";
    case "umami_enabled":
      return "Umami 开关无效。";
    case "umami_website_id":
      return "Umami Website ID 格式无效。";
    case "umami_script_url":
      return "Umami 脚本地址无效。";
    case "public_head_html":
      return "页头代码格式无效。";
    case "public_footer_html":
      return "页尾代码格式无效。";
    case "public_custom_css":
      return "公开站点 CSS 格式无效。";
    case "site_brand_name":
      return "站点品牌名称格式无效。";
    case "site_tagline":
      return "站点副标题格式无效。";
    case "home_hero_title":
      return "首页标题格式无效。";
    case "home_hero_description":
      return "首页说明格式无效。";
    case "home_primary_cta_label":
      return "首页主按钮文案格式无效。";
    case "home_primary_cta_url":
      return "首页主按钮链接无效。";
    case "home_featured_links_title":
      return "首页精选入口标题格式无效。";
    case "home_featured_links_description":
      return "首页精选入口说明格式无效。";
    case "home_featured_link_1_label":
    case "home_featured_link_2_label":
    case "home_featured_link_3_label":
      return "首页精选入口文案格式无效。";
    case "home_featured_link_1_url":
    case "home_featured_link_2_url":
    case "home_featured_link_3_url":
      return "首页精选入口链接无效。";
    case "home_featured_link_1_description":
    case "home_featured_link_2_description":
    case "home_featured_link_3_description":
      return "首页精选入口说明格式无效。";
    case "home_posts_variant":
      return "首页文章展示模式无效。";
    case "home_show_post_excerpt":
      return "首页摘要开关无效。";
    case "home_show_post_author":
      return "首页作者开关无效。";
    case "home_show_post_category":
      return "首页分类开关无效。";
    case "home_show_post_date":
      return "首页发布时间开关无效。";
    case "public_archive_posts_variant":
      return "公开归档列表展示模式无效。";
    case "public_longform_variant":
      return "长文页展示模式无效。";
    case "public_layout_width":
      return "公开布局宽度配置无效。";
    case "public_surface_variant":
      return "公开布局表面样式无效。";
    case "public_accent_theme":
      return "公开站点强调色主题无效。";
    case "public_header_show_tagline":
      return "页头副标题开关无效。";
    case "public_footer_blurb":
      return "页脚说明格式无效。";
    case "public_footer_copyright":
      return "页脚版权文案格式无效。";
    case "public_theme_default_mode":
      return "默认主题模式无效。";
    case "public_notice_enabled":
      return "公告开关无效。";
    case "public_notice_variant":
      return "公告样式无效。";
    case "public_notice_dismissible":
      return "公告关闭开关无效。";
    case "public_notice_version":
      return "公告版本格式无效。";
    case "public_notice_start_at":
      return "公告开始时间格式无效。";
    case "public_notice_start_at_iso":
      return "公告开始时间格式无效。";
    case "public_notice_end_at":
      return "公告结束时间格式无效。";
    case "public_notice_end_at_iso":
      return "公告结束时间格式无效。";
    case "public_notice_title":
      return "公告标题格式无效。";
    case "public_notice_body":
      return "公告内容格式无效。";
    case "public_notice_link_label":
      return "公告链接文案格式无效。";
    case "public_notice_link_url":
      return "公告链接地址无效。";
  }
}

function validateSettingsInput(values: SettingsFormValues):
  | { success: true; parsed: SettingValues }
  | { success: false; errors: SettingsFormErrors } {
  const errors: SettingsFormErrors = {};
  const parsed = {} as SettingValues;

  if (values.public_notice_start_at && !values.public_notice_start_at_iso) {
    errors.public_notice_start_at = "公告开始时间格式无效。";
  }

  if (values.public_notice_end_at && !values.public_notice_end_at_iso) {
    errors.public_notice_end_at = "公告结束时间格式无效。";
  }

  const rawSettingInputs: Record<string, string> = {
    admin_path: values.admin_path,
    revision_limit: values.revision_limit,
    revision_ttl_days: values.revision_ttl_days,
    excerpt_length: values.excerpt_length,
    comment_moderation: values.comment_moderation,
    smtp_host: values.smtp_host,
    smtp_port: values.smtp_port,
    smtp_secure: values.smtp_secure,
    smtp_username: values.smtp_username,
    smtp_password: values.smtp_password,
    smtp_from_email: values.smtp_from_email,
    smtp_from_name: values.smtp_from_name,
    umami_enabled: values.umami_enabled,
    umami_website_id: values.umami_website_id,
    umami_script_url: values.umami_script_url,
    public_head_html: values.public_head_html,
    public_footer_html: values.public_footer_html,
    public_custom_css: values.public_custom_css,
    site_brand_name: values.site_brand_name,
    site_tagline: values.site_tagline,
    home_hero_title: values.home_hero_title,
    home_hero_description: values.home_hero_description,
    home_primary_cta_label: values.home_primary_cta_label,
    home_primary_cta_url: values.home_primary_cta_url,
    home_featured_links_title: values.home_featured_links_title,
    home_featured_links_description: values.home_featured_links_description,
    home_featured_link_1_label: values.home_featured_link_1_label,
    home_featured_link_1_url: values.home_featured_link_1_url,
    home_featured_link_1_description: values.home_featured_link_1_description,
    home_featured_link_2_label: values.home_featured_link_2_label,
    home_featured_link_2_url: values.home_featured_link_2_url,
    home_featured_link_2_description: values.home_featured_link_2_description,
    home_featured_link_3_label: values.home_featured_link_3_label,
    home_featured_link_3_url: values.home_featured_link_3_url,
    home_featured_link_3_description: values.home_featured_link_3_description,
    home_posts_variant: values.home_posts_variant,
    home_show_post_excerpt: values.home_show_post_excerpt,
    home_show_post_author: values.home_show_post_author,
    home_show_post_category: values.home_show_post_category,
    home_show_post_date: values.home_show_post_date,
    public_archive_posts_variant: values.public_archive_posts_variant,
    public_longform_variant: values.public_longform_variant,
    public_layout_width: values.public_layout_width,
    public_surface_variant: values.public_surface_variant,
    public_accent_theme: values.public_accent_theme,
    public_header_show_tagline: values.public_header_show_tagline,
    public_footer_blurb: values.public_footer_blurb,
    public_footer_copyright: values.public_footer_copyright,
    public_theme_default_mode: values.public_theme_default_mode,
    public_notice_enabled: values.public_notice_enabled,
    public_notice_variant: values.public_notice_variant,
    public_notice_dismissible: values.public_notice_dismissible,
    public_notice_version: values.public_notice_version,
    public_notice_start_at: values.public_notice_start_at ? values.public_notice_start_at_iso : "",
    public_notice_end_at: values.public_notice_end_at ? values.public_notice_end_at_iso : "",
    public_notice_title: values.public_notice_title,
    public_notice_body: values.public_notice_body,
    public_notice_link_label: values.public_notice_link_label,
    public_notice_link_url: values.public_notice_link_url,
  };

  for (const key of SETTING_KEYS) {
    try {
      parsed[key] = parseSettingValue(key, rawSettingInputs[key]) as never;
    } catch {
      errors[key] = getFieldErrorMessage(key as keyof SettingsFormValues);
    }
  }

  if (Object.keys(errors).length === 0 && parsed.umami_enabled) {
    if (!parsed.umami_website_id) {
      errors.umami_website_id = "启用 Umami 时必须填写 Website ID。";
    }

    if (!parsed.umami_script_url) {
      errors.umami_script_url = "启用 Umami 时必须填写脚本地址。";
    }
  }

  if (!parsed.site_brand_name) {
    errors.site_brand_name = "站点品牌名称不能为空。";
  }

  if (!parsed.home_hero_title) {
    errors.home_hero_title = "首页标题不能为空。";
  }

  if (!parsed.home_primary_cta_label) {
    errors.home_primary_cta_label = "首页主按钮文案不能为空。";
  }

  if (!parsed.home_primary_cta_url) {
    errors.home_primary_cta_url = "首页主按钮链接不能为空。";
  }

  if (
    Object.keys(errors).length === 0 &&
    parsed.public_notice_start_at &&
    parsed.public_notice_end_at &&
    new Date(parsed.public_notice_end_at).getTime() <=
      new Date(parsed.public_notice_start_at).getTime()
  ) {
    errors.public_notice_end_at = "公告结束时间必须晚于开始时间。";
  }

  if (Object.keys(errors).length === 0 && parsed.public_notice_enabled) {
    if (!parsed.public_notice_body) {
      errors.public_notice_body = "启用站点公告时必须填写公告内容。";
    }

    if (parsed.public_notice_dismissible && !parsed.public_notice_version) {
      errors.public_notice_version = "允许访客关闭公告时必须填写公告版本。";
    }

    const hasLinkLabel = Boolean(parsed.public_notice_link_label);
    const hasLinkUrl = Boolean(parsed.public_notice_link_url);

    if (hasLinkLabel !== hasLinkUrl) {
      errors.public_notice_link_label = "公告链接文案和地址必须同时填写。";
      errors.public_notice_link_url = "公告链接文案和地址必须同时填写。";
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    parsed,
  };
}

function mergeEmailNotificationRows(rows: Array<{
  scenario: string;
  description: string | null;
  enabled: boolean;
}>): EmailNotificationScenario[] {
  const overrides = new Map(
    rows.map((row) => [
      row.scenario,
      {
        description: row.description,
        enabled: row.enabled,
      },
    ]),
  );

  return DEFAULT_EMAIL_NOTIFICATION_SCENARIOS.map((defaultScenario) => {
    const override = overrides.get(defaultScenario.scenario);

    return {
      scenario: defaultScenario.scenario,
      description: override?.description?.trim() || defaultScenario.description,
      enabled: override?.enabled ?? defaultScenario.enabled,
    };
  });
}

export async function getAdminSettingsFormValues(): Promise<SettingsFormValues> {
  const values = await getSettings();
  return toFormValues(values);
}

export async function getAdminEmailNotifications(): Promise<EmailNotificationScenario[]> {
  const rows = await db
    .select({
      scenario: emailNotifications.scenario,
      description: emailNotifications.description,
      enabled: emailNotifications.enabled,
    })
    .from(emailNotifications);

  return mergeEmailNotificationRows(rows);
}

export async function updateAdminEmailNotifications(
  input: Record<string, boolean>,
): Promise<UpdateAdminEmailNotificationsResult> {
  const session = await getAdminSession();
  const currentScenarios = await getAdminEmailNotifications();

  if (!session.isAuthenticated) {
    return {
      success: false,
      scenarios: currentScenarios,
      error: "当前会话无效，请重新登录。",
    };
  }

  try {
    for (const scenario of DEFAULT_EMAIL_NOTIFICATION_SCENARIOS) {
      await db
        .insert(emailNotifications)
        .values({
          scenario: scenario.scenario,
          description: scenario.description,
          enabled: input[scenario.scenario] ?? false,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: emailNotifications.scenario,
          set: {
            description: scenario.description,
            enabled: input[scenario.scenario] ?? false,
            updatedAt: new Date(),
          },
        });
    }

    return {
      success: true,
      scenarios: await getAdminEmailNotifications(),
    };
  } catch {
    return {
      success: false,
      scenarios: currentScenarios,
      error: "保存邮件通知设置失败，请稍后重试。",
    };
  }
}

export async function updateAdminSettings(
  input: Partial<SettingsFormValues>,
): Promise<UpdateAdminSettingsResult> {
  const session = await getAdminSession();
  const values = getInitialValues(input);

  if (!session.isAuthenticated) {
    return {
      success: false,
      values,
      errors: {
        form: "当前会话无效，请重新登录。",
      },
    };
  }

  const validation = validateSettingsInput(values);

  if (!validation.success) {
    return {
      success: false,
      values,
      errors: validation.errors,
    };
  }

  try {
    const currentSettings = await getSettings();
    const nextSettings: SettingValues = {
      ...validation.parsed,
      smtp_password: validation.parsed.smtp_password || currentSettings.smtp_password,
    };
    await persistSettings(nextSettings);

    return {
      success: true,
      nextAdminPath: nextSettings.admin_path,
      previousAdminPath: currentSettings.admin_path,
      adminPathChanged: nextSettings.admin_path !== currentSettings.admin_path,
      publicLayoutChanged:
        nextSettings.umami_enabled !== currentSettings.umami_enabled ||
        nextSettings.umami_website_id !== currentSettings.umami_website_id ||
        nextSettings.umami_script_url !== currentSettings.umami_script_url ||
        nextSettings.public_head_html !== currentSettings.public_head_html ||
        nextSettings.public_footer_html !== currentSettings.public_footer_html ||
        nextSettings.public_custom_css !== currentSettings.public_custom_css ||
        nextSettings.site_brand_name !== currentSettings.site_brand_name ||
        nextSettings.site_tagline !== currentSettings.site_tagline ||
        nextSettings.home_hero_title !== currentSettings.home_hero_title ||
        nextSettings.home_hero_description !== currentSettings.home_hero_description ||
        nextSettings.home_primary_cta_label !== currentSettings.home_primary_cta_label ||
        nextSettings.home_primary_cta_url !== currentSettings.home_primary_cta_url ||
        nextSettings.home_featured_links_title !== currentSettings.home_featured_links_title ||
        nextSettings.home_featured_links_description !== currentSettings.home_featured_links_description ||
        nextSettings.home_featured_link_1_label !== currentSettings.home_featured_link_1_label ||
        nextSettings.home_featured_link_1_url !== currentSettings.home_featured_link_1_url ||
        nextSettings.home_featured_link_1_description !== currentSettings.home_featured_link_1_description ||
        nextSettings.home_featured_link_2_label !== currentSettings.home_featured_link_2_label ||
        nextSettings.home_featured_link_2_url !== currentSettings.home_featured_link_2_url ||
        nextSettings.home_featured_link_2_description !== currentSettings.home_featured_link_2_description ||
        nextSettings.home_featured_link_3_label !== currentSettings.home_featured_link_3_label ||
        nextSettings.home_featured_link_3_url !== currentSettings.home_featured_link_3_url ||
        nextSettings.home_featured_link_3_description !== currentSettings.home_featured_link_3_description ||
        nextSettings.home_posts_variant !== currentSettings.home_posts_variant ||
        nextSettings.home_show_post_excerpt !== currentSettings.home_show_post_excerpt ||
        nextSettings.home_show_post_author !== currentSettings.home_show_post_author ||
        nextSettings.home_show_post_category !== currentSettings.home_show_post_category ||
        nextSettings.home_show_post_date !== currentSettings.home_show_post_date ||
        nextSettings.public_archive_posts_variant !== currentSettings.public_archive_posts_variant ||
        nextSettings.public_longform_variant !== currentSettings.public_longform_variant ||
        nextSettings.public_layout_width !== currentSettings.public_layout_width ||
        nextSettings.public_surface_variant !== currentSettings.public_surface_variant ||
        nextSettings.public_accent_theme !== currentSettings.public_accent_theme ||
        nextSettings.public_header_show_tagline !== currentSettings.public_header_show_tagline ||
        nextSettings.public_footer_blurb !== currentSettings.public_footer_blurb ||
        nextSettings.public_footer_copyright !== currentSettings.public_footer_copyright ||
        nextSettings.public_theme_default_mode !== currentSettings.public_theme_default_mode ||
        nextSettings.public_notice_enabled !== currentSettings.public_notice_enabled ||
        nextSettings.public_notice_variant !== currentSettings.public_notice_variant ||
        nextSettings.public_notice_dismissible !== currentSettings.public_notice_dismissible ||
        nextSettings.public_notice_version !== currentSettings.public_notice_version ||
        nextSettings.public_notice_start_at !== currentSettings.public_notice_start_at ||
        nextSettings.public_notice_end_at !== currentSettings.public_notice_end_at ||
        nextSettings.public_notice_title !== currentSettings.public_notice_title ||
        nextSettings.public_notice_body !== currentSettings.public_notice_body ||
        nextSettings.public_notice_link_label !== currentSettings.public_notice_link_label ||
        nextSettings.public_notice_link_url !== currentSettings.public_notice_link_url,
    };
  } catch {
    return {
      success: false,
      values,
      errors: {
        form: "保存设置失败，请稍后重试。",
      },
    };
  }
}

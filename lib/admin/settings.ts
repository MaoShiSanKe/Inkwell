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

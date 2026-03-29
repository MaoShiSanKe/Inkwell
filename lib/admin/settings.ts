import "server-only";

import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailNotifications } from "@/lib/db/schema";
import {
  DEFAULT_EMAIL_NOTIFICATION_SCENARIOS,
  type EmailNotificationScenario,
  parseSettingValue,
  type SettingValues,
} from "@/lib/settings-config";
import {
  getSettings,
  updateSettings as persistSettings,
} from "@/lib/settings";

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
  }
}

function validateSettingsInput(values: SettingsFormValues):
  | { success: true; parsed: SettingValues }
  | { success: false; errors: SettingsFormErrors } {
  const errors: SettingsFormErrors = {};
  const parsed = {} as SettingValues;

  for (const key of Object.keys(values) as Array<keyof SettingsFormValues>) {
    try {
      parsed[key] = parseSettingValue(key, values[key]) as never;
    } catch {
      errors[key] = getFieldErrorMessage(key);
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

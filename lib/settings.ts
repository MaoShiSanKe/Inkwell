import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db } from "./db";
import { settings, users } from "./db/schema";
import {
  DEFAULT_SETTINGS,
  SETTING_KEYS,
  parseSettingValue,
  serializeSettingValue,
  settingDefinitions,
  type PublicCodeSettings,
  type PublicNoticeSettings,
  type SettingKey,
  type SettingValues,
  type SmtpSettings,
  type UmamiSettings,
} from "./settings-config";

function assignSettingValue<K extends SettingKey>(
  target: SettingValues,
  key: K,
  value: SettingValues[K],
) {
  target[key] = value;
}

export async function getSetting<K extends SettingKey>(
  key: K,
): Promise<SettingValues[K]> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  if (!row) {
    return DEFAULT_SETTINGS[key];
  }

  try {
    return parseSettingValue(key, row.value);
  } catch {
    return DEFAULT_SETTINGS[key];
  }
}

export async function getSettings(): Promise<SettingValues> {
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, SETTING_KEYS));

  const mergedSettings: SettingValues = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    const key = row.key as SettingKey;

    try {
      assignSettingValue(mergedSettings, key, parseSettingValue(key, row.value));
    } catch {
      assignSettingValue(mergedSettings, key, DEFAULT_SETTINGS[key]);
    }
  }

  return mergedSettings;
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: SettingValues[K],
): Promise<void> {
  const serializedValue = serializeSettingValue(key, value);
  const updatedAt = new Date();

  await db
    .insert(settings)
    .values({
      key,
      value: serializedValue,
      isSecret: settingDefinitions[key].isSecret,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: serializedValue,
        isSecret: settingDefinitions[key].isSecret,
        updatedAt,
      },
    });
}

export async function updateSettings(
  values: Partial<SettingValues>,
): Promise<void> {
  for (const key of Object.keys(values) as SettingKey[]) {
    const value = values[key];

    if (value === undefined) {
      continue;
    }

    await setSetting(key, value);
  }
}

export async function getAdminPath() {
  return getSetting("admin_path");
}

export async function getRevisionLimit() {
  return getSetting("revision_limit");
}

export async function getRevisionTtlDays() {
  return getSetting("revision_ttl_days");
}

export async function getExcerptLength() {
  return getSetting("excerpt_length");
}

export async function getCommentModeration() {
  return getSetting("comment_moderation");
}

export async function getSmtpSettings(): Promise<SmtpSettings> {
  const values = await getSettings();

  return {
    smtp_host: values.smtp_host,
    smtp_port: values.smtp_port,
    smtp_secure: values.smtp_secure,
    smtp_username: values.smtp_username,
    smtp_password: values.smtp_password,
    smtp_from_email: values.smtp_from_email,
    smtp_from_name: values.smtp_from_name,
  };
}

export async function getUmamiSettings(): Promise<UmamiSettings> {
  const values = await getSettings();

  return {
    umami_enabled: values.umami_enabled,
    umami_website_id: values.umami_website_id,
    umami_script_url: values.umami_script_url,
  };
}

export async function getPublicCodeSettings(): Promise<PublicCodeSettings> {
  const values = await getSettings();

  return {
    public_head_html: values.public_head_html,
    public_footer_html: values.public_footer_html,
    public_custom_css: values.public_custom_css,
  };
}

export async function getPublicNoticeSettings(): Promise<PublicNoticeSettings> {
  const values = await getSettings();

  return {
    public_notice_enabled: values.public_notice_enabled,
    public_notice_variant: values.public_notice_variant,
    public_notice_dismissible: values.public_notice_dismissible,
    public_notice_version: values.public_notice_version,
    public_notice_start_at: values.public_notice_start_at,
    public_notice_end_at: values.public_notice_end_at,
    public_notice_title: values.public_notice_title,
    public_notice_body: values.public_notice_body,
    public_notice_link_label: values.public_notice_link_label,
    public_notice_link_url: values.public_notice_link_url,
  };
}

export async function listNotificationAdminRecipients() {
  return db
    .select({
      email: users.email,
      displayName: users.displayName,
      role: users.role,
    })
    .from(users)
    .where(inArray(users.role, ["super_admin", "editor"]));
}

export async function listSubscriberNotificationRecipients() {
  return db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.role, "subscriber"));
}

export function getSiteOrigin() {
  const siteOrigin = process.env.NEXTAUTH_URL?.trim();

  if (!siteOrigin) {
    return null;
  }

  try {
    return new URL(siteOrigin).origin;
  } catch {
    return null;
  }
}

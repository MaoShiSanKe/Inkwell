export type CommentModerationMode = "pending" | "approved";
export type PublicNoticeVariant = "info" | "warning" | "success";

export type EmailNotificationScenario = {
  scenario: string;
  description: string;
  enabled: boolean;
};

type SettingDefinition<T> = {
  defaultValue: T;
  isSecret: boolean;
  parse: (value: string) => T;
  serialize: (value: T) => string;
};

function defineSetting<T>(definition: SettingDefinition<T>) {
  return definition;
}

function parsePositiveInteger(value: string, key: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return parsed;
}

function parseNonNegativeInteger(value: string, key: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${key} must be a non-negative integer.`);
  }

  return parsed;
}

function parseBooleanString(value: string, key: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  throw new Error(`${key} must be either 'true' or 'false'.`);
}

function parseOptionalText(value: string) {
  return value.trim();
}

function parseOptionalEmail(value: string, key: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error(`${key} must be a valid email address.`);
  }

  return normalized;
}

function parseOptionalUuid(value: string, key: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new Error(`${key} must be a valid UUID.`);
  }

  return normalized;
}

function parseOptionalScriptUrl(value: string, key: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("/")) {
    if (normalized.startsWith("//")) {
      throw new Error(`${key} must be a safe script URL.`);
    }

    return normalized;
  }

  try {
    const url = new URL(normalized);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`${key} must use http or https.`);
    }

    return normalized;
  } catch {
    throw new Error(`${key} must be a valid script URL.`);
  }
}

function parseOptionalIsoDatetime(value: string, key: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} must be a valid datetime.`);
  }

  return date.toISOString();
}

function validateAdminPath(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("admin_path cannot be empty.");
  }

  if (!/^[a-z0-9-]+$/.test(normalized)) {
    throw new Error(
      "admin_path must contain only lowercase letters, numbers, and hyphens.",
    );
  }

  return normalized;
}

function parseCommentModeration(value: string): CommentModerationMode {
  if (value !== "pending" && value !== "approved") {
    throw new Error("comment_moderation must be either 'pending' or 'approved'.");
  }

  return value;
}

function parsePublicNoticeVariant(value: string): PublicNoticeVariant {
  if (value !== "info" && value !== "warning" && value !== "success") {
    throw new Error("public_notice_variant must be one of info, warning, or success.");
  }

  return value;
}

export const settingDefinitions = {
  admin_path: defineSetting({
    defaultValue: "admin",
    isSecret: false,
    parse: (value: string) => validateAdminPath(value),
    serialize: (value: string) => validateAdminPath(value),
  }),
  revision_limit: defineSetting({
    defaultValue: 20,
    isSecret: false,
    parse: (value: string) => parsePositiveInteger(value, "revision_limit"),
    serialize: (value: number) => String(value),
  }),
  revision_ttl_days: defineSetting({
    defaultValue: 30,
    isSecret: false,
    parse: (value: string) => parseNonNegativeInteger(value, "revision_ttl_days"),
    serialize: (value: number) => String(value),
  }),
  excerpt_length: defineSetting({
    defaultValue: 150,
    isSecret: false,
    parse: (value: string) => parsePositiveInteger(value, "excerpt_length"),
    serialize: (value: number) => String(value),
  }),
  comment_moderation: defineSetting({
    defaultValue: "pending" as CommentModerationMode,
    isSecret: false,
    parse: (value: string) => parseCommentModeration(value),
    serialize: (value: CommentModerationMode) => parseCommentModeration(value),
  }),
  smtp_host: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  smtp_port: defineSetting({
    defaultValue: 587,
    isSecret: false,
    parse: (value: string) => parsePositiveInteger(value, "smtp_port"),
    serialize: (value: number) => String(value),
  }),
  smtp_secure: defineSetting({
    defaultValue: false,
    isSecret: false,
    parse: (value: string) => parseBooleanString(value, "smtp_secure"),
    serialize: (value: boolean) => String(value),
  }),
  smtp_username: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  smtp_password: defineSetting({
    defaultValue: "",
    isSecret: true,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => value,
  }),
  smtp_from_email: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalEmail(value, "smtp_from_email"),
    serialize: (value: string) => parseOptionalEmail(value, "smtp_from_email"),
  }),
  smtp_from_name: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  umami_enabled: defineSetting({
    defaultValue: false,
    isSecret: false,
    parse: (value: string) => parseBooleanString(value, "umami_enabled"),
    serialize: (value: boolean) => String(value),
  }),
  umami_website_id: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalUuid(value, "umami_website_id"),
    serialize: (value: string) => parseOptionalUuid(value, "umami_website_id"),
  }),
  umami_script_url: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalScriptUrl(value, "umami_script_url"),
    serialize: (value: string) => parseOptionalScriptUrl(value, "umami_script_url"),
  }),
  public_head_html: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  public_footer_html: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  public_custom_css: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  public_notice_enabled: defineSetting({
    defaultValue: false,
    isSecret: false,
    parse: (value: string) => parseBooleanString(value, "public_notice_enabled"),
    serialize: (value: boolean) => String(value),
  }),
  public_notice_variant: defineSetting({
    defaultValue: "info" as PublicNoticeVariant,
    isSecret: false,
    parse: (value: string) => parsePublicNoticeVariant(value),
    serialize: (value: PublicNoticeVariant) => parsePublicNoticeVariant(value),
  }),
  public_notice_dismissible: defineSetting({
    defaultValue: false,
    isSecret: false,
    parse: (value: string) => parseBooleanString(value, "public_notice_dismissible"),
    serialize: (value: boolean) => String(value),
  }),
  public_notice_version: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  public_notice_start_at: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalIsoDatetime(value, "public_notice_start_at"),
    serialize: (value: string) => parseOptionalIsoDatetime(value, "public_notice_start_at"),
  }),
  public_notice_end_at: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalIsoDatetime(value, "public_notice_end_at"),
    serialize: (value: string) => parseOptionalIsoDatetime(value, "public_notice_end_at"),
  }),
  public_notice_title: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  public_notice_body: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  public_notice_link_label: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  public_notice_link_url: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalScriptUrl(value, "public_notice_link_url"),
    serialize: (value: string) => parseOptionalScriptUrl(value, "public_notice_link_url"),
  }),
};

export type SettingKey = keyof typeof settingDefinitions;

type InferSettingValue<T> = T extends SettingDefinition<infer TValue>
  ? TValue
  : never;

export type SettingValues = {
  [K in SettingKey]: InferSettingValue<(typeof settingDefinitions)[K]>;
};

export type SmtpSettings = Pick<
  SettingValues,
  | "smtp_host"
  | "smtp_port"
  | "smtp_secure"
  | "smtp_username"
  | "smtp_password"
  | "smtp_from_email"
  | "smtp_from_name"
>;

export type UmamiSettings = Pick<
  SettingValues,
  | "umami_enabled"
  | "umami_website_id"
  | "umami_script_url"
>;

export type PublicCodeSettings = Pick<
  SettingValues,
  | "public_head_html"
  | "public_footer_html"
  | "public_custom_css"
>;

export type PublicNoticeSettings = Pick<
  SettingValues,
  | "public_notice_enabled"
  | "public_notice_variant"
  | "public_notice_dismissible"
  | "public_notice_version"
  | "public_notice_start_at"
  | "public_notice_end_at"
  | "public_notice_title"
  | "public_notice_body"
  | "public_notice_link_label"
  | "public_notice_link_url"
>;

export const SETTING_KEYS = Object.keys(settingDefinitions) as SettingKey[];

export const DEFAULT_SETTINGS: SettingValues = {
  admin_path: settingDefinitions.admin_path.defaultValue,
  revision_limit: settingDefinitions.revision_limit.defaultValue,
  revision_ttl_days: settingDefinitions.revision_ttl_days.defaultValue,
  excerpt_length: settingDefinitions.excerpt_length.defaultValue,
  comment_moderation: settingDefinitions.comment_moderation.defaultValue,
  smtp_host: settingDefinitions.smtp_host.defaultValue,
  smtp_port: settingDefinitions.smtp_port.defaultValue,
  smtp_secure: settingDefinitions.smtp_secure.defaultValue,
  smtp_username: settingDefinitions.smtp_username.defaultValue,
  smtp_password: settingDefinitions.smtp_password.defaultValue,
  smtp_from_email: settingDefinitions.smtp_from_email.defaultValue,
  smtp_from_name: settingDefinitions.smtp_from_name.defaultValue,
  umami_enabled: settingDefinitions.umami_enabled.defaultValue,
  umami_website_id: settingDefinitions.umami_website_id.defaultValue,
  umami_script_url: settingDefinitions.umami_script_url.defaultValue,
  public_head_html: settingDefinitions.public_head_html.defaultValue,
  public_footer_html: settingDefinitions.public_footer_html.defaultValue,
  public_custom_css: settingDefinitions.public_custom_css.defaultValue,
  public_notice_enabled: settingDefinitions.public_notice_enabled.defaultValue,
  public_notice_variant: settingDefinitions.public_notice_variant.defaultValue,
  public_notice_dismissible: settingDefinitions.public_notice_dismissible.defaultValue,
  public_notice_version: settingDefinitions.public_notice_version.defaultValue,
  public_notice_start_at: settingDefinitions.public_notice_start_at.defaultValue,
  public_notice_end_at: settingDefinitions.public_notice_end_at.defaultValue,
  public_notice_title: settingDefinitions.public_notice_title.defaultValue,
  public_notice_body: settingDefinitions.public_notice_body.defaultValue,
  public_notice_link_label: settingDefinitions.public_notice_link_label.defaultValue,
  public_notice_link_url: settingDefinitions.public_notice_link_url.defaultValue,
};

export const DEFAULT_EMAIL_NOTIFICATION_SCENARIOS: EmailNotificationScenario[] = [
  {
    scenario: "comment_pending",
    description: "Notify administrators when a new comment is awaiting moderation.",
    enabled: true,
  },
  {
    scenario: "comment_approved",
    description: "Notify comment authors when their comment has been approved.",
    enabled: true,
  },
  {
    scenario: "comment_reply",
    description: "Notify original comment authors when they receive a reply.",
    enabled: true,
  },
  {
    scenario: "post_published",
    description: "Notify subscribers when a post is published.",
    enabled: false,
  },
];

export function parseSettingValue<K extends SettingKey>(
  key: K,
  value: string,
): SettingValues[K] {
  return settingDefinitions[key].parse(value) as SettingValues[K];
}

export function serializeSettingValue<K extends SettingKey>(
  key: K,
  value: SettingValues[K],
): string {
  return settingDefinitions[key].serialize(value as never);
}

export function getDefaultSettingRows() {
  return SETTING_KEYS.map((key) => ({
    key,
    value: serializeSettingValue(key, DEFAULT_SETTINGS[key]),
    isSecret: settingDefinitions[key].isSecret,
  }));
}

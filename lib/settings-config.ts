export type CommentModerationMode = "pending" | "approved";

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
};

export type SettingKey = keyof typeof settingDefinitions;

type InferSettingValue<T> = T extends SettingDefinition<infer TValue>
  ? TValue
  : never;

export type SettingValues = {
  [K in SettingKey]: InferSettingValue<(typeof settingDefinitions)[K]>;
};

export const SETTING_KEYS = Object.keys(settingDefinitions) as SettingKey[];

export const DEFAULT_SETTINGS: SettingValues = {
  admin_path: settingDefinitions.admin_path.defaultValue,
  revision_limit: settingDefinitions.revision_limit.defaultValue,
  revision_ttl_days: settingDefinitions.revision_ttl_days.defaultValue,
  excerpt_length: settingDefinitions.excerpt_length.defaultValue,
  comment_moderation: settingDefinitions.comment_moderation.defaultValue,
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

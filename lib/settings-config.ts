export type CommentModerationMode = "pending" | "approved";
export type PublicNoticeVariant = "info" | "warning" | "success";
export type HomePostsVariant = "comfortable" | "compact";
export type PublicArchivePostsVariant = "comfortable" | "compact";
export type PublicLongformVariant = "comfortable" | "compact";
export type PublicLayoutWidth = "narrow" | "default" | "wide";
export type PublicSurfaceVariant = "soft" | "solid";
export type PublicAccentTheme = "slate" | "blue" | "emerald" | "amber";
export type PublicThemeDefaultMode = "system" | "light" | "dark";

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

function parseOptionalUrl(value: string, key: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("/")) {
    if (normalized.startsWith("//")) {
      throw new Error(`${key} must be a safe URL.`);
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
    throw new Error(`${key} must be a valid URL.`);
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

function parseHomePostsVariant(value: string): HomePostsVariant {
  if (value !== "comfortable" && value !== "compact") {
    throw new Error("home_posts_variant must be either comfortable or compact.");
  }

  return value;
}

function parsePublicArchivePostsVariant(value: string): PublicArchivePostsVariant {
  if (value !== "comfortable" && value !== "compact") {
    throw new Error("public_archive_posts_variant must be either comfortable or compact.");
  }

  return value;
}

function parsePublicLongformVariant(value: string): PublicLongformVariant {
  if (value !== "comfortable" && value !== "compact") {
    throw new Error("public_longform_variant must be either comfortable or compact.");
  }

  return value;
}

function parsePublicLayoutWidth(value: string): PublicLayoutWidth {
  if (value !== "narrow" && value !== "default" && value !== "wide") {
    throw new Error("public_layout_width must be one of narrow, default, or wide.");
  }

  return value;
}

function parsePublicSurfaceVariant(value: string): PublicSurfaceVariant {
  if (value !== "soft" && value !== "solid") {
    throw new Error("public_surface_variant must be either soft or solid.");
  }

  return value;
}

function parsePublicAccentTheme(value: string): PublicAccentTheme {
  if (value !== "slate" && value !== "blue" && value !== "emerald" && value !== "amber") {
    throw new Error("public_accent_theme must be one of slate, blue, emerald, or amber.");
  }

  return value;
}

function parsePublicThemeDefaultMode(value: string): PublicThemeDefaultMode {
  if (value !== "system" && value !== "light" && value !== "dark") {
    throw new Error("public_theme_default_mode must be one of system, light, or dark.");
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
  site_brand_name: defineSetting({
    defaultValue: "Inkwell",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  site_tagline: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  home_hero_title: defineSetting({
    defaultValue: "最新文章",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  home_hero_description: defineSetting({
    defaultValue: "浏览站点中已经发布的文章与公开归档。",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  home_primary_cta_label: defineSetting({
    defaultValue: "订阅新文章",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  home_primary_cta_url: defineSetting({
    defaultValue: "/subscribe",
    isSecret: false,
    parse: (value: string) => parseOptionalUrl(value, "home_primary_cta_url"),
    serialize: (value: string) => parseOptionalUrl(value, "home_primary_cta_url"),
  }),
  home_featured_links_title: defineSetting({
    defaultValue: "精选入口",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  home_featured_links_description: defineSetting({
    defaultValue: "把高频入口放在首页，减少访客寻找内容的成本。",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  home_featured_link_1_label: defineSetting({
    defaultValue: "查看分类",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  home_featured_link_1_url: defineSetting({
    defaultValue: "/category",
    isSecret: false,
    parse: (value: string) => parseOptionalUrl(value, "home_featured_link_1_url"),
    serialize: (value: string) => parseOptionalUrl(value, "home_featured_link_1_url"),
  }),
  home_featured_link_1_description: defineSetting({
    defaultValue: "按主题浏览已经发布的内容。",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  home_featured_link_2_label: defineSetting({
    defaultValue: "查看标签",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  home_featured_link_2_url: defineSetting({
    defaultValue: "/tag",
    isSecret: false,
    parse: (value: string) => parseOptionalUrl(value, "home_featured_link_2_url"),
    serialize: (value: string) => parseOptionalUrl(value, "home_featured_link_2_url"),
  }),
  home_featured_link_2_description: defineSetting({
    defaultValue: "通过标签快速找到相关话题。",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  home_featured_link_3_label: defineSetting({
    defaultValue: "查看友链",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  home_featured_link_3_url: defineSetting({
    defaultValue: "/friend-links",
    isSecret: false,
    parse: (value: string) => parseOptionalUrl(value, "home_featured_link_3_url"),
    serialize: (value: string) => parseOptionalUrl(value, "home_featured_link_3_url"),
  }),
  home_featured_link_3_description: defineSetting({
    defaultValue: "发现更多值得关注的站点与作者。",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  home_posts_variant: defineSetting({
    defaultValue: "comfortable" as HomePostsVariant,
    isSecret: false,
    parse: (value: string) => parseHomePostsVariant(value),
    serialize: (value: HomePostsVariant) => parseHomePostsVariant(value),
  }),
  home_show_post_excerpt: defineSetting({
    defaultValue: true,
    isSecret: false,
    parse: (value: string) => parseBooleanString(value, "home_show_post_excerpt"),
    serialize: (value: boolean) => String(value),
  }),
  home_show_post_author: defineSetting({
    defaultValue: true,
    isSecret: false,
    parse: (value: string) => parseBooleanString(value, "home_show_post_author"),
    serialize: (value: boolean) => String(value),
  }),
  home_show_post_category: defineSetting({
    defaultValue: true,
    isSecret: false,
    parse: (value: string) => parseBooleanString(value, "home_show_post_category"),
    serialize: (value: boolean) => String(value),
  }),
  home_show_post_date: defineSetting({
    defaultValue: true,
    isSecret: false,
    parse: (value: string) => parseBooleanString(value, "home_show_post_date"),
    serialize: (value: boolean) => String(value),
  }),
  public_archive_posts_variant: defineSetting({
    defaultValue: "comfortable" as PublicArchivePostsVariant,
    isSecret: false,
    parse: (value: string) => parsePublicArchivePostsVariant(value),
    serialize: (value: PublicArchivePostsVariant) => parsePublicArchivePostsVariant(value),
  }),
  public_longform_variant: defineSetting({
    defaultValue: "comfortable" as PublicLongformVariant,
    isSecret: false,
    parse: (value: string) => parsePublicLongformVariant(value),
    serialize: (value: PublicLongformVariant) => parsePublicLongformVariant(value),
  }),
  public_layout_width: defineSetting({
    defaultValue: "default" as PublicLayoutWidth,
    isSecret: false,
    parse: (value: string) => parsePublicLayoutWidth(value),
    serialize: (value: PublicLayoutWidth) => parsePublicLayoutWidth(value),
  }),
  public_surface_variant: defineSetting({
    defaultValue: "soft" as PublicSurfaceVariant,
    isSecret: false,
    parse: (value: string) => parsePublicSurfaceVariant(value),
    serialize: (value: PublicSurfaceVariant) => parsePublicSurfaceVariant(value),
  }),
  public_accent_theme: defineSetting({
    defaultValue: "slate" as PublicAccentTheme,
    isSecret: false,
    parse: (value: string) => parsePublicAccentTheme(value),
    serialize: (value: PublicAccentTheme) => parsePublicAccentTheme(value),
  }),
  public_header_show_tagline: defineSetting({
    defaultValue: true,
    isSecret: false,
    parse: (value: string) => parseBooleanString(value, "public_header_show_tagline"),
    serialize: (value: boolean) => String(value),
  }),
  public_footer_blurb: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  public_footer_copyright: defineSetting({
    defaultValue: "",
    isSecret: false,
    parse: (value: string) => parseOptionalText(value),
    serialize: (value: string) => parseOptionalText(value),
  }),
  public_theme_default_mode: defineSetting({
    defaultValue: "system" as PublicThemeDefaultMode,
    isSecret: false,
    parse: (value: string) => parsePublicThemeDefaultMode(value),
    serialize: (value: PublicThemeDefaultMode) => parsePublicThemeDefaultMode(value),
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

export type ThemeFrameworkSettings = Pick<
  SettingValues,
  | "site_brand_name"
  | "site_tagline"
  | "home_hero_title"
  | "home_hero_description"
  | "home_primary_cta_label"
  | "home_primary_cta_url"
  | "home_featured_links_title"
  | "home_featured_links_description"
  | "home_featured_link_1_label"
  | "home_featured_link_1_url"
  | "home_featured_link_1_description"
  | "home_featured_link_2_label"
  | "home_featured_link_2_url"
  | "home_featured_link_2_description"
  | "home_featured_link_3_label"
  | "home_featured_link_3_url"
  | "home_featured_link_3_description"
  | "home_posts_variant"
  | "home_show_post_excerpt"
  | "home_show_post_author"
  | "home_show_post_category"
  | "home_show_post_date"
  | "public_archive_posts_variant"
  | "public_longform_variant"
  | "public_layout_width"
  | "public_surface_variant"
  | "public_accent_theme"
  | "public_header_show_tagline"
  | "public_footer_blurb"
  | "public_footer_copyright"
  | "public_theme_default_mode"
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
  site_brand_name: settingDefinitions.site_brand_name.defaultValue,
  site_tagline: settingDefinitions.site_tagline.defaultValue,
  home_hero_title: settingDefinitions.home_hero_title.defaultValue,
  home_hero_description: settingDefinitions.home_hero_description.defaultValue,
  home_primary_cta_label: settingDefinitions.home_primary_cta_label.defaultValue,
  home_primary_cta_url: settingDefinitions.home_primary_cta_url.defaultValue,
  home_featured_links_title: settingDefinitions.home_featured_links_title.defaultValue,
  home_featured_links_description: settingDefinitions.home_featured_links_description.defaultValue,
  home_featured_link_1_label: settingDefinitions.home_featured_link_1_label.defaultValue,
  home_featured_link_1_url: settingDefinitions.home_featured_link_1_url.defaultValue,
  home_featured_link_1_description: settingDefinitions.home_featured_link_1_description.defaultValue,
  home_featured_link_2_label: settingDefinitions.home_featured_link_2_label.defaultValue,
  home_featured_link_2_url: settingDefinitions.home_featured_link_2_url.defaultValue,
  home_featured_link_2_description: settingDefinitions.home_featured_link_2_description.defaultValue,
  home_featured_link_3_label: settingDefinitions.home_featured_link_3_label.defaultValue,
  home_featured_link_3_url: settingDefinitions.home_featured_link_3_url.defaultValue,
  home_featured_link_3_description: settingDefinitions.home_featured_link_3_description.defaultValue,
  home_posts_variant: settingDefinitions.home_posts_variant.defaultValue,
  home_show_post_excerpt: settingDefinitions.home_show_post_excerpt.defaultValue,
  home_show_post_author: settingDefinitions.home_show_post_author.defaultValue,
  home_show_post_category: settingDefinitions.home_show_post_category.defaultValue,
  home_show_post_date: settingDefinitions.home_show_post_date.defaultValue,
  public_archive_posts_variant: settingDefinitions.public_archive_posts_variant.defaultValue,
  public_longform_variant: settingDefinitions.public_longform_variant.defaultValue,
  public_layout_width: settingDefinitions.public_layout_width.defaultValue,
  public_surface_variant: settingDefinitions.public_surface_variant.defaultValue,
  public_accent_theme: settingDefinitions.public_accent_theme.defaultValue,
  public_header_show_tagline: settingDefinitions.public_header_show_tagline.defaultValue,
  public_footer_blurb: settingDefinitions.public_footer_blurb.defaultValue,
  public_footer_copyright: settingDefinitions.public_footer_copyright.defaultValue,
  public_theme_default_mode: settingDefinitions.public_theme_default_mode.defaultValue,
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

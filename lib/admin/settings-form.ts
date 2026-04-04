import type {
  EmailNotificationScenario,
  HomeFeaturedLinksVariant,
  HomePostsVariant,
  PublicAccentTheme,
  PublicArchivePostsVariant,
  PublicLayoutWidth,
  PublicLongformVariant,
  PublicNoticeVariant,
  PublicSurfaceVariant,
  PublicThemeDefaultMode,
} from "@/lib/settings-config";

export type SettingsFormValues = {
  admin_path: string;
  revision_limit: string;
  revision_ttl_days: string;
  excerpt_length: string;
  comment_moderation: "pending" | "approved" | "";
  smtp_host: string;
  smtp_port: string;
  smtp_secure: "true" | "false";
  smtp_username: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  umami_enabled: "true" | "false";
  umami_website_id: string;
  umami_script_url: string;
  public_head_html: string;
  public_footer_html: string;
  public_custom_css: string;
  site_brand_name: string;
  site_tagline: string;
  home_hero_title: string;
  home_hero_description: string;
  home_primary_cta_label: string;
  home_primary_cta_url: string;
  home_featured_links_title: string;
  home_featured_links_description: string;
  home_featured_link_1_label: string;
  home_featured_link_1_url: string;
  home_featured_link_1_description: string;
  home_featured_link_2_label: string;
  home_featured_link_2_url: string;
  home_featured_link_2_description: string;
  home_featured_link_3_label: string;
  home_featured_link_3_url: string;
  home_featured_link_3_description: string;
  home_posts_variant: HomePostsVariant;
  home_featured_links_variant: HomeFeaturedLinksVariant;
  home_show_post_excerpt: "true" | "false";
  home_show_post_author: "true" | "false";
  home_show_post_category: "true" | "false";
  home_show_post_date: "true" | "false";
  public_archive_posts_variant: PublicArchivePostsVariant;
  public_longform_variant: PublicLongformVariant;
  public_layout_width: PublicLayoutWidth;
  public_surface_variant: PublicSurfaceVariant;
  public_accent_theme: PublicAccentTheme;
  public_header_show_tagline: "true" | "false";
  public_footer_blurb: string;
  public_footer_copyright: string;
  public_theme_default_mode: PublicThemeDefaultMode;
  public_notice_enabled: "true" | "false";
  public_notice_variant: PublicNoticeVariant;
  public_notice_dismissible: "true" | "false";
  public_notice_version: string;
  public_notice_start_at: string;
  public_notice_start_at_iso: string;
  public_notice_end_at: string;
  public_notice_end_at_iso: string;
  public_notice_title: string;
  public_notice_body: string;
  public_notice_link_label: string;
  public_notice_link_url: string;
};

export type SettingsFormErrors = Partial<
  Record<keyof SettingsFormValues | "form", string>
>;

export type SettingsFormState = {
  values: SettingsFormValues;
  errors: SettingsFormErrors;
};

export type EmailNotificationsFormState = {
  scenarios: EmailNotificationScenario[];
  error?: string;
};

export const initialSettingsFormValues: SettingsFormValues = {
  admin_path: "admin",
  revision_limit: "20",
  revision_ttl_days: "30",
  excerpt_length: "150",
  comment_moderation: "pending",
  smtp_host: "",
  smtp_port: "587",
  smtp_secure: "false",
  smtp_username: "",
  smtp_password: "",
  smtp_from_email: "",
  smtp_from_name: "",
  umami_enabled: "false",
  umami_website_id: "",
  umami_script_url: "",
  public_head_html: "",
  public_footer_html: "",
  public_custom_css: "",
  site_brand_name: "Inkwell",
  site_tagline: "",
  home_hero_title: "最新文章",
  home_hero_description: "浏览站点中已经发布的文章与公开归档。",
  home_primary_cta_label: "订阅新文章",
  home_primary_cta_url: "/subscribe",
  home_featured_links_title: "精选入口",
  home_featured_links_description: "把高频入口放在首页，减少访客寻找内容的成本。",
  home_featured_link_1_label: "查看分类",
  home_featured_link_1_url: "/category",
  home_featured_link_1_description: "按主题浏览已经发布的内容。",
  home_featured_link_2_label: "查看标签",
  home_featured_link_2_url: "/tag",
  home_featured_link_2_description: "通过标签快速找到相关话题。",
  home_featured_link_3_label: "查看友链",
  home_featured_link_3_url: "/friend-links",
  home_featured_link_3_description: "发现更多值得关注的站点与作者。",
  home_posts_variant: "comfortable",
  home_featured_links_variant: "comfortable",
  home_show_post_excerpt: "true",
  home_show_post_author: "true",
  home_show_post_category: "true",
  home_show_post_date: "true",
  public_archive_posts_variant: "comfortable",
  public_longform_variant: "comfortable",
  public_layout_width: "default",
  public_surface_variant: "soft",
  public_accent_theme: "slate",
  public_header_show_tagline: "true",
  public_footer_blurb: "",
  public_footer_copyright: "",
  public_theme_default_mode: "system",
  public_notice_enabled: "false",
  public_notice_variant: "info",
  public_notice_dismissible: "false",
  public_notice_version: "",
  public_notice_start_at: "",
  public_notice_start_at_iso: "",
  public_notice_end_at: "",
  public_notice_end_at_iso: "",
  public_notice_title: "",
  public_notice_body: "",
  public_notice_link_label: "",
  public_notice_link_url: "",
};

export const initialSettingsFormState: SettingsFormState = {
  values: initialSettingsFormValues,
  errors: {},
};

export function createSettingsFormState(
  values: Partial<SettingsFormValues> = {},
  errors: SettingsFormErrors = {},
): SettingsFormState {
  return {
    values: {
      ...initialSettingsFormValues,
      ...values,
    },
    errors,
  };
}

export function createEmailNotificationsFormState(
  scenarios: EmailNotificationScenario[] = [],
  error?: string,
): EmailNotificationsFormState {
  return {
    scenarios,
    error,
  };
}

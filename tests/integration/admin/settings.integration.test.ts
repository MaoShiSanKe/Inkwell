import { eq, inArray } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emailNotifications, settings } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
const SETTINGS_KEYS = [
  "admin_path",
  "revision_limit",
  "revision_ttl_days",
  "excerpt_length",
  "comment_moderation",
  "smtp_host",
  "smtp_port",
  "smtp_secure",
  "smtp_username",
  "smtp_password",
  "smtp_from_email",
  "smtp_from_name",
  "umami_enabled",
  "umami_website_id",
  "umami_script_url",
  "public_head_html",
  "public_footer_html",
  "public_custom_css",
  "site_brand_name",
  "site_tagline",
  "home_hero_title",
  "home_hero_description",
  "home_primary_cta_label",
  "home_primary_cta_url",
  "home_featured_links_title",
  "home_featured_links_description",
  "home_featured_link_1_label",
  "home_featured_link_1_url",
  "home_featured_link_1_description",
  "home_featured_link_2_label",
  "home_featured_link_2_url",
  "home_featured_link_2_description",
  "home_featured_link_3_label",
  "home_featured_link_3_url",
  "home_featured_link_3_description",
  "home_recommended_pages_title",
  "home_recommended_pages_description",
  "home_recommended_page_1_id",
  "home_recommended_page_2_id",
  "home_recommended_page_3_id",
  "home_posts_variant",
  "home_featured_links_variant",
  "home_show_post_excerpt",
  "home_show_post_author",
  "home_show_post_category",
  "home_show_post_date",
  "public_archive_posts_variant",
  "public_longform_variant",
  "public_layout_width",
  "public_surface_variant",
  "public_accent_theme",
  "public_header_show_tagline",
  "public_footer_blurb",
  "public_footer_copyright",
  "public_theme_default_mode",
  "public_notice_enabled",
  "public_notice_variant",
  "public_notice_dismissible",
  "public_notice_version",
  "public_notice_start_at",
  "public_notice_end_at",
  "public_notice_title",
  "public_notice_body",
  "public_notice_link_label",
  "public_notice_link_url",
] as const;
const EMAIL_SCENARIOS = [
  "comment_pending",
  "comment_approved",
  "comment_reply",
  "post_published",
] as const;

const { getAdminSessionMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

describe("admin settings write paths", () => {
  let originalSettings: Record<(typeof SETTINGS_KEYS)[number], string | null>;
  let originalEmailNotifications: Record<(typeof EMAIL_SCENARIOS)[number], boolean | null>;

  beforeEach(async () => {
    await cleanupIntegrationTables();
    originalSettings = await snapshotSettings();
    originalEmailNotifications = await snapshotEmailNotifications();
    getAdminSessionMock.mockReset();
    getAdminSessionMock.mockResolvedValue({
      isAuthenticated: true,
      userId: 1,
      role: "editor",
    });
  });

  afterEach(async () => {
    await restoreSettings(originalSettings);
    await restoreEmailNotifications(originalEmailNotifications);
    await cleanupIntegrationTables();
  });

  it("loads default form values when no rows exist", async () => {
    const { getAdminSettingsFormValues } = await import("@/lib/admin/settings");
    const values = await getAdminSettingsFormValues();

    expect(values).toEqual({
      admin_path: originalSettings.admin_path ?? "admin",
      revision_limit: originalSettings.revision_limit ?? "20",
      revision_ttl_days: originalSettings.revision_ttl_days ?? "30",
      excerpt_length: originalSettings.excerpt_length ?? "150",
      comment_moderation:
        (originalSettings.comment_moderation as "pending" | "approved" | null) ?? "pending",
      smtp_host: originalSettings.smtp_host ?? "",
      smtp_port: originalSettings.smtp_port ?? "587",
      smtp_secure: (originalSettings.smtp_secure === "true" ? "true" : "false") as "true" | "false",
      smtp_username: originalSettings.smtp_username ?? "",
      smtp_password: "",
      smtp_from_email: originalSettings.smtp_from_email ?? "",
      smtp_from_name: originalSettings.smtp_from_name ?? "",
      umami_enabled: (originalSettings.umami_enabled === "true" ? "true" : "false") as "true" | "false",
      umami_website_id: originalSettings.umami_website_id ?? "",
      umami_script_url: originalSettings.umami_script_url ?? "",
      public_head_html: originalSettings.public_head_html ?? "",
      public_footer_html: originalSettings.public_footer_html ?? "",
      public_custom_css: originalSettings.public_custom_css ?? "",
      site_brand_name: originalSettings.site_brand_name ?? "Inkwell",
      site_tagline: originalSettings.site_tagline ?? "",
      home_hero_title: originalSettings.home_hero_title ?? "最新文章",
      home_hero_description:
        originalSettings.home_hero_description ?? "浏览站点中已经发布的文章与公开归档。",
      home_primary_cta_label: originalSettings.home_primary_cta_label ?? "订阅新文章",
      home_primary_cta_url: originalSettings.home_primary_cta_url ?? "/subscribe",
      home_featured_links_title: originalSettings.home_featured_links_title ?? "精选入口",
      home_featured_links_description:
        originalSettings.home_featured_links_description ?? "把高频入口放在首页，减少访客寻找内容的成本。",
      home_featured_link_1_label: originalSettings.home_featured_link_1_label ?? "查看分类",
      home_featured_link_1_url: originalSettings.home_featured_link_1_url ?? "/category",
      home_featured_link_1_description:
        originalSettings.home_featured_link_1_description ?? "按主题浏览已经发布的内容。",
      home_featured_link_2_label: originalSettings.home_featured_link_2_label ?? "查看标签",
      home_featured_link_2_url: originalSettings.home_featured_link_2_url ?? "/tag",
      home_featured_link_2_description:
        originalSettings.home_featured_link_2_description ?? "通过标签快速找到相关话题。",
      home_featured_link_3_label: originalSettings.home_featured_link_3_label ?? "查看友链",
      home_featured_link_3_url: originalSettings.home_featured_link_3_url ?? "/friend-links",
      home_featured_link_3_description:
        originalSettings.home_featured_link_3_description ?? "发现更多值得关注的站点与作者。",
      home_recommended_pages_title: originalSettings.home_recommended_pages_title ?? "推荐页面",
      home_recommended_pages_description:
        originalSettings.home_recommended_pages_description ?? "把值得长期展示的独立页面放在首页，帮助访客更快进入核心内容。",
      home_recommended_page_1_id: originalSettings.home_recommended_page_1_id ?? "",
      home_recommended_page_2_id: originalSettings.home_recommended_page_2_id ?? "",
      home_recommended_page_3_id: originalSettings.home_recommended_page_3_id ?? "",
      home_posts_variant:
        (originalSettings.home_posts_variant as "comfortable" | "compact" | null) ??
        "comfortable",
      home_featured_links_variant:
        (originalSettings.home_featured_links_variant as "comfortable" | "compact" | null) ??
        "comfortable",
      home_show_post_excerpt:
        (originalSettings.home_show_post_excerpt === "false" ? "false" : "true") as "true" | "false",
      home_show_post_author:
        (originalSettings.home_show_post_author === "false" ? "false" : "true") as "true" | "false",
      home_show_post_category:
        (originalSettings.home_show_post_category === "false" ? "false" : "true") as "true" | "false",
      home_show_post_date:
        (originalSettings.home_show_post_date === "false" ? "false" : "true") as "true" | "false",
      public_archive_posts_variant:
        (originalSettings.public_archive_posts_variant as "comfortable" | "compact" | null) ??
        "comfortable",
      public_longform_variant:
        (originalSettings.public_longform_variant as "comfortable" | "compact" | null) ??
        "comfortable",
      public_layout_width:
        (originalSettings.public_layout_width as "narrow" | "default" | "wide" | null) ??
        "default",
      public_surface_variant:
        (originalSettings.public_surface_variant as "soft" | "solid" | null) ?? "soft",
      public_accent_theme:
        (originalSettings.public_accent_theme as "slate" | "blue" | "emerald" | "amber" | null) ??
        "slate",
      public_header_show_tagline:
        (originalSettings.public_header_show_tagline === "false" ? "false" : "true") as "true" | "false",
      public_footer_blurb: originalSettings.public_footer_blurb ?? "",
      public_footer_copyright: originalSettings.public_footer_copyright ?? "",
      public_theme_default_mode:
        (originalSettings.public_theme_default_mode as "system" | "light" | "dark" | null) ??
        "system",
      public_notice_enabled: (originalSettings.public_notice_enabled === "true" ? "true" : "false") as "true" | "false",
      public_notice_variant:
        (originalSettings.public_notice_variant as "info" | "warning" | "success" | null) ??
        "info",
      public_notice_dismissible:
        (originalSettings.public_notice_dismissible === "true" ? "true" : "false") as "true" | "false",
      public_notice_version: originalSettings.public_notice_version ?? "",
      public_notice_start_at: formatDatetimeLocalInput(originalSettings.public_notice_start_at),
      public_notice_start_at_iso: originalSettings.public_notice_start_at ?? "",
      public_notice_end_at: formatDatetimeLocalInput(originalSettings.public_notice_end_at),
      public_notice_end_at_iso: originalSettings.public_notice_end_at ?? "",
      public_notice_title: originalSettings.public_notice_title ?? "",
      public_notice_body: originalSettings.public_notice_body ?? "",
      public_notice_link_label: originalSettings.public_notice_link_label ?? "",
      public_notice_link_url: originalSettings.public_notice_link_url ?? "",
    });
  });

  it("persists theme framework settings", async () => {
    const { updateAdminSettings } = await import("@/lib/admin/settings");
    const result = await updateAdminSettings({
      admin_path: `${INTEGRATION_PREFIX}panel`,
      revision_limit: "25",
      revision_ttl_days: "45",
      excerpt_length: "180",
      comment_moderation: "approved",
      smtp_host: "smtp.example.com",
      smtp_port: "465",
      smtp_secure: "true",
      smtp_username: "mailer@example.com",
      smtp_password: "super-secret",
      smtp_from_email: "noreply@example.com",
      smtp_from_name: "Inkwell Mailer",
      umami_enabled: "false",
      umami_website_id: "",
      umami_script_url: "",
      public_head_html: "",
      public_footer_html: "",
      public_custom_css: "",
      site_brand_name: "Inkwell Daily",
      site_tagline: "静态前端，动态内容。",
      home_hero_title: "最新文章与精选内容",
      home_hero_description: "浏览站点中已经发布的文章、专题与长期归档。",
      home_primary_cta_label: "立即订阅",
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
      home_recommended_pages_title: "推荐页面",
      home_recommended_pages_description: "优先展示长期页面入口。",
      home_recommended_page_1_id: "11",
      home_recommended_page_2_id: "12",
      home_recommended_page_3_id: "",
      home_posts_variant: "compact",
      home_featured_links_variant: "compact",
      home_show_post_excerpt: "false",
      home_show_post_author: "true",
      home_show_post_category: "true",
      home_show_post_date: "false",
      public_archive_posts_variant: "compact",
      public_longform_variant: "compact",
      public_layout_width: "wide",
      public_surface_variant: "solid",
      public_accent_theme: "blue",
      public_header_show_tagline: "true",
      public_footer_blurb: "面向长期维护的内容站点。",
      public_footer_copyright: "© Inkwell",
      public_theme_default_mode: "dark",
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
    });

    expect(result).toEqual({
      success: true,
      previousAdminPath: originalSettings.admin_path ?? "admin",
      nextAdminPath: `${INTEGRATION_PREFIX}panel`,
      adminPathChanged: (originalSettings.admin_path ?? "admin") !== `${INTEGRATION_PREFIX}panel`,
      publicLayoutChanged: true,
    });

    const rows = await getSettingRows([...SETTINGS_KEYS]);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "site_brand_name", value: "Inkwell Daily" }),
        expect.objectContaining({ key: "home_hero_title", value: "最新文章与精选内容" }),
        expect.objectContaining({ key: "home_featured_links_title", value: "精选入口" }),
        expect.objectContaining({ key: "home_featured_link_1_url", value: "/category" }),
        expect.objectContaining({ key: "home_recommended_pages_title", value: "推荐页面" }),
        expect.objectContaining({ key: "home_recommended_page_1_id", value: "11" }),
        expect.objectContaining({ key: "home_posts_variant", value: "compact" }),
        expect.objectContaining({ key: "home_featured_links_variant", value: "compact" }),
        expect.objectContaining({ key: "public_archive_posts_variant", value: "compact" }),
        expect.objectContaining({ key: "public_longform_variant", value: "compact" }),
        expect.objectContaining({ key: "public_layout_width", value: "wide" }),
        expect.objectContaining({ key: "public_theme_default_mode", value: "dark" }),
      ]),
    );
  });

  it("persists notice dismissal and time window settings", async () => {
    const { updateAdminSettings } = await import("@/lib/admin/settings");
    const result = await updateAdminSettings({
      admin_path: `${INTEGRATION_PREFIX}panel`,
      revision_limit: "25",
      revision_ttl_days: "45",
      excerpt_length: "180",
      comment_moderation: "approved",
      smtp_host: "smtp.example.com",
      smtp_port: "465",
      smtp_secure: "true",
      smtp_username: "mailer@example.com",
      smtp_password: "super-secret",
      smtp_from_email: "noreply@example.com",
      smtp_from_name: "Inkwell Mailer",
      umami_enabled: "false",
      umami_website_id: "",
      umami_script_url: "",
      public_head_html: "",
      public_footer_html: "",
      public_custom_css: "",
      site_brand_name: originalSettings.site_brand_name ?? "Inkwell",
      site_tagline: originalSettings.site_tagline ?? "",
      home_hero_title: originalSettings.home_hero_title ?? "最新文章",
      home_hero_description:
        originalSettings.home_hero_description ?? "浏览站点中已经发布的文章与公开归档。",
      home_primary_cta_label: originalSettings.home_primary_cta_label ?? "订阅新文章",
      home_primary_cta_url: originalSettings.home_primary_cta_url ?? "/subscribe",
      home_featured_links_title: originalSettings.home_featured_links_title ?? "精选入口",
      home_featured_links_description:
        originalSettings.home_featured_links_description ?? "把高频入口放在首页，减少访客寻找内容的成本。",
      home_featured_link_1_label: originalSettings.home_featured_link_1_label ?? "查看分类",
      home_featured_link_1_url: originalSettings.home_featured_link_1_url ?? "/category",
      home_featured_link_1_description:
        originalSettings.home_featured_link_1_description ?? "按主题浏览已经发布的内容。",
      home_featured_link_2_label: originalSettings.home_featured_link_2_label ?? "查看标签",
      home_featured_link_2_url: originalSettings.home_featured_link_2_url ?? "/tag",
      home_featured_link_2_description:
        originalSettings.home_featured_link_2_description ?? "通过标签快速找到相关话题。",
      home_featured_link_3_label: originalSettings.home_featured_link_3_label ?? "查看友链",
      home_featured_link_3_url: originalSettings.home_featured_link_3_url ?? "/friend-links",
      home_featured_link_3_description:
        originalSettings.home_featured_link_3_description ?? "发现更多值得关注的站点与作者。",
      home_recommended_pages_title: originalSettings.home_recommended_pages_title ?? "推荐页面",
      home_recommended_pages_description:
        originalSettings.home_recommended_pages_description ?? "把值得长期展示的独立页面放在首页，帮助访客更快进入核心内容。",
      home_recommended_page_1_id: originalSettings.home_recommended_page_1_id ?? "",
      home_recommended_page_2_id: originalSettings.home_recommended_page_2_id ?? "",
      home_recommended_page_3_id: originalSettings.home_recommended_page_3_id ?? "",
      home_posts_variant:
        (originalSettings.home_posts_variant as "comfortable" | "compact" | null) ?? "comfortable",
      home_show_post_excerpt:
        (originalSettings.home_show_post_excerpt === "false" ? "false" : "true") as "true" | "false",
      home_show_post_author:
        (originalSettings.home_show_post_author === "false" ? "false" : "true") as "true" | "false",
      home_show_post_category:
        (originalSettings.home_show_post_category === "false" ? "false" : "true") as "true" | "false",
      home_show_post_date:
        (originalSettings.home_show_post_date === "false" ? "false" : "true") as "true" | "false",
      public_archive_posts_variant:
        (originalSettings.public_archive_posts_variant as "comfortable" | "compact" | null) ??
        "comfortable",
      public_longform_variant:
        (originalSettings.public_longform_variant as "comfortable" | "compact" | null) ??
        "comfortable",
      public_layout_width:
        (originalSettings.public_layout_width as "narrow" | "default" | "wide" | null) ?? "default",
      public_surface_variant:
        (originalSettings.public_surface_variant as "soft" | "solid" | null) ?? "soft",
      public_accent_theme:
        (originalSettings.public_accent_theme as "slate" | "blue" | "emerald" | "amber" | null) ?? "slate",
      public_header_show_tagline:
        (originalSettings.public_header_show_tagline === "false" ? "false" : "true") as "true" | "false",
      public_footer_blurb: originalSettings.public_footer_blurb ?? "",
      public_footer_copyright: originalSettings.public_footer_copyright ?? "",
      public_theme_default_mode:
        (originalSettings.public_theme_default_mode as "system" | "light" | "dark" | null) ?? "system",
      public_notice_enabled: "true",
      public_notice_variant: "warning",
      public_notice_dismissible: "true",
      public_notice_version: "2026-04-maintenance",
      public_notice_start_at: "2026-04-01T20:00",
      public_notice_start_at_iso: "2026-04-01T12:00:00.000Z",
      public_notice_end_at: "2026-04-02T08:00",
      public_notice_end_at_iso: "2026-04-02T00:00:00.000Z",
      public_notice_title: "系统维护通知",
      public_notice_body: "今晚 23:00-23:30 将进行短暂维护。",
      public_notice_link_label: "查看详情",
      public_notice_link_url: "/docs/deployment",
    });

    expect(result).toEqual({
      success: true,
      previousAdminPath: originalSettings.admin_path ?? "admin",
      nextAdminPath: `${INTEGRATION_PREFIX}panel`,
      adminPathChanged: (originalSettings.admin_path ?? "admin") !== `${INTEGRATION_PREFIX}panel`,
      publicLayoutChanged: true,
    });

    const rows = await getSettingRows([...SETTINGS_KEYS]);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "public_notice_dismissible", value: "true" }),
        expect.objectContaining({ key: "public_notice_version", value: "2026-04-maintenance" }),
        expect.objectContaining({ key: "public_notice_start_at", value: "2026-04-01T12:00:00.000Z" }),
        expect.objectContaining({ key: "public_notice_end_at", value: "2026-04-02T00:00:00.000Z" }),
      ]),
    );
  });

  it("returns no public layout change when theme and notice settings stay the same", async () => {
    await setSettingRow("public_notice_enabled", "true");
    await setSettingRow("public_notice_variant", "warning");
    await setSettingRow("public_notice_dismissible", "true");
    await setSettingRow("public_notice_version", "2026-04-maintenance");
    await setSettingRow("public_notice_start_at", "2026-04-01T12:00:00.000Z");
    await setSettingRow("public_notice_end_at", "2026-04-02T00:00:00.000Z");
    await setSettingRow("public_notice_title", "系统维护通知");
    await setSettingRow("public_notice_body", "今晚 23:00-23:30 将进行短暂维护。");
    await setSettingRow("public_notice_link_label", "查看详情");
    await setSettingRow("public_notice_link_url", "/docs/deployment");
    await setSettingRow("site_brand_name", "Inkwell Daily");
    await setSettingRow("home_hero_title", "最新文章与精选内容");
    await setSettingRow("public_layout_width", "wide");

    const { updateAdminSettings } = await import("@/lib/admin/settings");
    const result = await updateAdminSettings({
      admin_path: originalSettings.admin_path ?? "admin",
      revision_limit: originalSettings.revision_limit ?? "20",
      revision_ttl_days: originalSettings.revision_ttl_days ?? "30",
      excerpt_length: originalSettings.excerpt_length ?? "150",
      comment_moderation:
        (originalSettings.comment_moderation as "pending" | "approved" | null) ?? "pending",
      smtp_host: originalSettings.smtp_host ?? "",
      smtp_port: originalSettings.smtp_port ?? "587",
      smtp_secure: (originalSettings.smtp_secure === "true" ? "true" : "false") as "true" | "false",
      smtp_username: originalSettings.smtp_username ?? "",
      smtp_password: "",
      smtp_from_email: originalSettings.smtp_from_email ?? "",
      smtp_from_name: originalSettings.smtp_from_name ?? "",
      umami_enabled: (originalSettings.umami_enabled === "true" ? "true" : "false") as "true" | "false",
      umami_website_id: originalSettings.umami_website_id ?? "",
      umami_script_url: originalSettings.umami_script_url ?? "",
      public_head_html: originalSettings.public_head_html ?? "",
      public_footer_html: originalSettings.public_footer_html ?? "",
      public_custom_css: originalSettings.public_custom_css ?? "",
      site_brand_name: "Inkwell Daily",
      site_tagline: originalSettings.site_tagline ?? "",
      home_hero_title: "最新文章与精选内容",
      home_hero_description:
        originalSettings.home_hero_description ?? "浏览站点中已经发布的文章与公开归档。",
      home_primary_cta_label: originalSettings.home_primary_cta_label ?? "订阅新文章",
      home_primary_cta_url: originalSettings.home_primary_cta_url ?? "/subscribe",
      home_featured_links_title: originalSettings.home_featured_links_title ?? "精选入口",
      home_featured_links_description:
        originalSettings.home_featured_links_description ?? "把高频入口放在首页，减少访客寻找内容的成本。",
      home_featured_link_1_label: originalSettings.home_featured_link_1_label ?? "查看分类",
      home_featured_link_1_url: originalSettings.home_featured_link_1_url ?? "/category",
      home_featured_link_1_description:
        originalSettings.home_featured_link_1_description ?? "按主题浏览已经发布的内容。",
      home_featured_link_2_label: originalSettings.home_featured_link_2_label ?? "查看标签",
      home_featured_link_2_url: originalSettings.home_featured_link_2_url ?? "/tag",
      home_featured_link_2_description:
        originalSettings.home_featured_link_2_description ?? "通过标签快速找到相关话题。",
      home_featured_link_3_label: originalSettings.home_featured_link_3_label ?? "查看友链",
      home_featured_link_3_url: originalSettings.home_featured_link_3_url ?? "/friend-links",
      home_featured_link_3_description:
        originalSettings.home_featured_link_3_description ?? "发现更多值得关注的站点与作者。",
      home_recommended_pages_title: originalSettings.home_recommended_pages_title ?? "推荐页面",
      home_recommended_pages_description:
        originalSettings.home_recommended_pages_description ?? "把值得长期展示的独立页面放在首页，帮助访客更快进入核心内容。",
      home_recommended_page_1_id: originalSettings.home_recommended_page_1_id ?? "",
      home_recommended_page_2_id: originalSettings.home_recommended_page_2_id ?? "",
      home_recommended_page_3_id: originalSettings.home_recommended_page_3_id ?? "",
      home_posts_variant:
        (originalSettings.home_posts_variant as "comfortable" | "compact" | null) ?? "comfortable",
      home_show_post_excerpt:
        (originalSettings.home_show_post_excerpt === "false" ? "false" : "true") as "true" | "false",
      home_show_post_author:
        (originalSettings.home_show_post_author === "false" ? "false" : "true") as "true" | "false",
      home_show_post_category:
        (originalSettings.home_show_post_category === "false" ? "false" : "true") as "true" | "false",
      home_show_post_date:
        (originalSettings.home_show_post_date === "false" ? "false" : "true") as "true" | "false",
      public_archive_posts_variant:
        (originalSettings.public_archive_posts_variant as "comfortable" | "compact" | null) ??
        "comfortable",
      public_layout_width: "wide",
      public_surface_variant:
        (originalSettings.public_surface_variant as "soft" | "solid" | null) ?? "soft",
      public_accent_theme:
        (originalSettings.public_accent_theme as "slate" | "blue" | "emerald" | "amber" | null) ?? "slate",
      public_header_show_tagline:
        (originalSettings.public_header_show_tagline === "false" ? "false" : "true") as "true" | "false",
      public_footer_blurb: originalSettings.public_footer_blurb ?? "",
      public_footer_copyright: originalSettings.public_footer_copyright ?? "",
      public_theme_default_mode:
        (originalSettings.public_theme_default_mode as "system" | "light" | "dark" | null) ?? "system",
      public_notice_enabled: "true",
      public_notice_variant: "warning",
      public_notice_dismissible: "true",
      public_notice_version: "2026-04-maintenance",
      public_notice_start_at: "2026-04-01T20:00",
      public_notice_start_at_iso: "2026-04-01T12:00:00.000Z",
      public_notice_end_at: "2026-04-02T08:00",
      public_notice_end_at_iso: "2026-04-02T00:00:00.000Z",
      public_notice_title: "系统维护通知",
      public_notice_body: "今晚 23:00-23:30 将进行短暂维护。",
      public_notice_link_label: "查看详情",
      public_notice_link_url: "/docs/deployment",
    });

    expect(result).toMatchObject({ success: true, publicLayoutChanged: false });
  });

  it("requires notice version when dismissal is enabled", async () => {
    const { updateAdminSettings } = await import("@/lib/admin/settings");
    const result = await updateAdminSettings({
      admin_path: originalSettings.admin_path ?? "admin",
      revision_limit: originalSettings.revision_limit ?? "20",
      revision_ttl_days: originalSettings.revision_ttl_days ?? "30",
      excerpt_length: originalSettings.excerpt_length ?? "150",
      comment_moderation:
        (originalSettings.comment_moderation as "pending" | "approved" | null) ?? "pending",
      smtp_host: originalSettings.smtp_host ?? "",
      smtp_port: originalSettings.smtp_port ?? "587",
      smtp_secure: (originalSettings.smtp_secure === "true" ? "true" : "false") as "true" | "false",
      smtp_username: originalSettings.smtp_username ?? "",
      smtp_password: "",
      smtp_from_email: originalSettings.smtp_from_email ?? "",
      smtp_from_name: originalSettings.smtp_from_name ?? "",
      umami_enabled: (originalSettings.umami_enabled === "true" ? "true" : "false") as "true" | "false",
      umami_website_id: originalSettings.umami_website_id ?? "",
      umami_script_url: originalSettings.umami_script_url ?? "",
      public_head_html: "",
      public_footer_html: "",
      public_custom_css: "",
      site_brand_name: originalSettings.site_brand_name ?? "Inkwell",
      site_tagline: originalSettings.site_tagline ?? "",
      home_hero_title: originalSettings.home_hero_title ?? "最新文章",
      home_hero_description:
        originalSettings.home_hero_description ?? "浏览站点中已经发布的文章与公开归档。",
      home_primary_cta_label: originalSettings.home_primary_cta_label ?? "订阅新文章",
      home_primary_cta_url: originalSettings.home_primary_cta_url ?? "/subscribe",
      home_featured_links_title: originalSettings.home_featured_links_title ?? "精选入口",
      home_featured_links_description:
        originalSettings.home_featured_links_description ?? "把高频入口放在首页，减少访客寻找内容的成本。",
      home_featured_link_1_label: originalSettings.home_featured_link_1_label ?? "查看分类",
      home_featured_link_1_url: originalSettings.home_featured_link_1_url ?? "/category",
      home_featured_link_1_description:
        originalSettings.home_featured_link_1_description ?? "按主题浏览已经发布的内容。",
      home_featured_link_2_label: originalSettings.home_featured_link_2_label ?? "查看标签",
      home_featured_link_2_url: originalSettings.home_featured_link_2_url ?? "/tag",
      home_featured_link_2_description:
        originalSettings.home_featured_link_2_description ?? "通过标签快速找到相关话题。",
      home_featured_link_3_label: originalSettings.home_featured_link_3_label ?? "查看友链",
      home_featured_link_3_url: originalSettings.home_featured_link_3_url ?? "/friend-links",
      home_featured_link_3_description:
        originalSettings.home_featured_link_3_description ?? "发现更多值得关注的站点与作者。",
      home_recommended_pages_title: originalSettings.home_recommended_pages_title ?? "推荐页面",
      home_recommended_pages_description:
        originalSettings.home_recommended_pages_description ?? "把值得长期展示的独立页面放在首页，帮助访客更快进入核心内容。",
      home_recommended_page_1_id: originalSettings.home_recommended_page_1_id ?? "",
      home_recommended_page_2_id: originalSettings.home_recommended_page_2_id ?? "",
      home_recommended_page_3_id: originalSettings.home_recommended_page_3_id ?? "",
      home_posts_variant:
        (originalSettings.home_posts_variant as "comfortable" | "compact" | null) ?? "comfortable",
      home_show_post_excerpt:
        (originalSettings.home_show_post_excerpt === "false" ? "false" : "true") as "true" | "false",
      home_show_post_author:
        (originalSettings.home_show_post_author === "false" ? "false" : "true") as "true" | "false",
      home_show_post_category:
        (originalSettings.home_show_post_category === "false" ? "false" : "true") as "true" | "false",
      home_show_post_date:
        (originalSettings.home_show_post_date === "false" ? "false" : "true") as "true" | "false",
      public_archive_posts_variant:
        (originalSettings.public_archive_posts_variant as "comfortable" | "compact" | null) ??
        "comfortable",
      public_longform_variant:
        (originalSettings.public_longform_variant as "comfortable" | "compact" | null) ??
        "comfortable",
      public_layout_width:
        (originalSettings.public_layout_width as "narrow" | "default" | "wide" | null) ?? "default",
      public_surface_variant:
        (originalSettings.public_surface_variant as "soft" | "solid" | null) ?? "soft",
      public_accent_theme:
        (originalSettings.public_accent_theme as "slate" | "blue" | "emerald" | "amber" | null) ?? "slate",
      public_header_show_tagline:
        (originalSettings.public_header_show_tagline === "false" ? "false" : "true") as "true" | "false",
      public_footer_blurb: originalSettings.public_footer_blurb ?? "",
      public_footer_copyright: originalSettings.public_footer_copyright ?? "",
      public_theme_default_mode:
        (originalSettings.public_theme_default_mode as "system" | "light" | "dark" | null) ?? "system",
      public_notice_enabled: "true",
      public_notice_variant: "info",
      public_notice_dismissible: "true",
      public_notice_version: "",
      public_notice_start_at: "",
      public_notice_start_at_iso: "",
      public_notice_end_at: "",
      public_notice_end_at_iso: "",
      public_notice_title: "提醒",
      public_notice_body: "内容",
      public_notice_link_label: "",
      public_notice_link_url: "",
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        public_notice_version: "允许访客关闭公告时必须填写公告版本。",
      },
    });
  });

  it("rejects notice window when end time is not after start time", async () => {
    const { updateAdminSettings } = await import("@/lib/admin/settings");
    const result = await updateAdminSettings({
      admin_path: originalSettings.admin_path ?? "admin",
      revision_limit: originalSettings.revision_limit ?? "20",
      revision_ttl_days: originalSettings.revision_ttl_days ?? "30",
      excerpt_length: originalSettings.excerpt_length ?? "150",
      comment_moderation:
        (originalSettings.comment_moderation as "pending" | "approved" | null) ?? "pending",
      smtp_host: originalSettings.smtp_host ?? "",
      smtp_port: originalSettings.smtp_port ?? "587",
      smtp_secure: (originalSettings.smtp_secure === "true" ? "true" : "false") as "true" | "false",
      smtp_username: originalSettings.smtp_username ?? "",
      smtp_password: "",
      smtp_from_email: originalSettings.smtp_from_email ?? "",
      smtp_from_name: originalSettings.smtp_from_name ?? "",
      umami_enabled: (originalSettings.umami_enabled === "true" ? "true" : "false") as "true" | "false",
      umami_website_id: originalSettings.umami_website_id ?? "",
      umami_script_url: originalSettings.umami_script_url ?? "",
      public_head_html: "",
      public_footer_html: "",
      public_custom_css: "",
      site_brand_name: originalSettings.site_brand_name ?? "Inkwell",
      site_tagline: originalSettings.site_tagline ?? "",
      home_hero_title: originalSettings.home_hero_title ?? "最新文章",
      home_hero_description:
        originalSettings.home_hero_description ?? "浏览站点中已经发布的文章与公开归档。",
      home_primary_cta_label: originalSettings.home_primary_cta_label ?? "订阅新文章",
      home_primary_cta_url: originalSettings.home_primary_cta_url ?? "/subscribe",
      home_featured_links_title: originalSettings.home_featured_links_title ?? "精选入口",
      home_featured_links_description:
        originalSettings.home_featured_links_description ?? "把高频入口放在首页，减少访客寻找内容的成本。",
      home_featured_link_1_label: originalSettings.home_featured_link_1_label ?? "查看分类",
      home_featured_link_1_url: originalSettings.home_featured_link_1_url ?? "/category",
      home_featured_link_1_description:
        originalSettings.home_featured_link_1_description ?? "按主题浏览已经发布的内容。",
      home_featured_link_2_label: originalSettings.home_featured_link_2_label ?? "查看标签",
      home_featured_link_2_url: originalSettings.home_featured_link_2_url ?? "/tag",
      home_featured_link_2_description:
        originalSettings.home_featured_link_2_description ?? "通过标签快速找到相关话题。",
      home_featured_link_3_label: originalSettings.home_featured_link_3_label ?? "查看友链",
      home_featured_link_3_url: originalSettings.home_featured_link_3_url ?? "/friend-links",
      home_featured_link_3_description:
        originalSettings.home_featured_link_3_description ?? "发现更多值得关注的站点与作者。",
      home_recommended_pages_title: originalSettings.home_recommended_pages_title ?? "推荐页面",
      home_recommended_pages_description:
        originalSettings.home_recommended_pages_description ?? "把值得长期展示的独立页面放在首页，帮助访客更快进入核心内容。",
      home_recommended_page_1_id: originalSettings.home_recommended_page_1_id ?? "",
      home_recommended_page_2_id: originalSettings.home_recommended_page_2_id ?? "",
      home_recommended_page_3_id: originalSettings.home_recommended_page_3_id ?? "",
      home_posts_variant:
        (originalSettings.home_posts_variant as "comfortable" | "compact" | null) ?? "comfortable",
      home_show_post_excerpt:
        (originalSettings.home_show_post_excerpt === "false" ? "false" : "true") as "true" | "false",
      home_show_post_author:
        (originalSettings.home_show_post_author === "false" ? "false" : "true") as "true" | "false",
      home_show_post_category:
        (originalSettings.home_show_post_category === "false" ? "false" : "true") as "true" | "false",
      home_show_post_date:
        (originalSettings.home_show_post_date === "false" ? "false" : "true") as "true" | "false",
      public_archive_posts_variant:
        (originalSettings.public_archive_posts_variant as "comfortable" | "compact" | null) ??
        "comfortable",
      public_longform_variant:
        (originalSettings.public_longform_variant as "comfortable" | "compact" | null) ??
        "comfortable",
      public_layout_width:
        (originalSettings.public_layout_width as "narrow" | "default" | "wide" | null) ?? "default",
      public_surface_variant:
        (originalSettings.public_surface_variant as "soft" | "solid" | null) ?? "soft",
      public_accent_theme:
        (originalSettings.public_accent_theme as "slate" | "blue" | "emerald" | "amber" | null) ?? "slate",
      public_header_show_tagline:
        (originalSettings.public_header_show_tagline === "false" ? "false" : "true") as "true" | "false",
      public_footer_blurb: originalSettings.public_footer_blurb ?? "",
      public_footer_copyright: originalSettings.public_footer_copyright ?? "",
      public_theme_default_mode:
        (originalSettings.public_theme_default_mode as "system" | "light" | "dark" | null) ?? "system",
      public_notice_enabled: "true",
      public_notice_variant: "info",
      public_notice_dismissible: "false",
      public_notice_version: "",
      public_notice_start_at: "2026-04-01T20:00",
      public_notice_start_at_iso: "2026-04-01T12:00:00.000Z",
      public_notice_end_at: "2026-04-01T20:00",
      public_notice_end_at_iso: "2026-04-01T12:00:00.000Z",
      public_notice_title: "提醒",
      public_notice_body: "内容",
      public_notice_link_label: "",
      public_notice_link_url: "",
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        public_notice_end_at: "公告结束时间必须晚于开始时间。",
      },
    });
  });

  it("persists email notification toggles", async () => {
    const { updateAdminEmailNotifications } = await import("@/lib/admin/settings");
    const result = await updateAdminEmailNotifications({
      comment_pending: false,
      comment_approved: true,
      comment_reply: false,
      post_published: true,
    });

    expect(result).toEqual({
      success: true,
      scenarios: [
        expect.objectContaining({ scenario: "comment_pending", enabled: false }),
        expect.objectContaining({ scenario: "comment_approved", enabled: true }),
        expect.objectContaining({ scenario: "comment_reply", enabled: false }),
        expect.objectContaining({ scenario: "post_published", enabled: true }),
      ],
    });
  });
});

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

async function getSettingRows(keys: string[]) {
  const db = await getDb();
  return db
    .select({ key: settings.key, value: settings.value, isSecret: settings.isSecret })
    .from(settings)
    .where(inArray(settings.key, keys));
}

async function setSettingRow(key: string, value: string, isSecret = false) {
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key, value, isSecret, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, isSecret, updatedAt: new Date() },
    });
}

async function snapshotSettings() {
  const rows = await getSettingRows([...SETTINGS_KEYS]);
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return Object.fromEntries(
    SETTINGS_KEYS.map((key) => [key, byKey.get(key) ?? null]),
  ) as Record<(typeof SETTINGS_KEYS)[number], string | null>;
}

async function snapshotEmailNotifications() {
  const db = await getDb();
  const rows = await db
    .select({ scenario: emailNotifications.scenario, enabled: emailNotifications.enabled })
    .from(emailNotifications)
    .where(inArray(emailNotifications.scenario, [...EMAIL_SCENARIOS]));
  const byKey = new Map(rows.map((row) => [row.scenario, row.enabled]));

  return Object.fromEntries(
    EMAIL_SCENARIOS.map((key) => [key, byKey.get(key) ?? null]),
  ) as Record<(typeof EMAIL_SCENARIOS)[number], boolean | null>;
}

async function restoreSettings(values: Record<(typeof SETTINGS_KEYS)[number], string | null>) {
  const db = await getDb();

  for (const key of SETTINGS_KEYS) {
    const value = values[key];

    if (value === null) {
      await db.delete(settings).where(eq(settings.key, key));
      continue;
    }

    await db
      .insert(settings)
      .values({
        key,
        value,
        isSecret: key === "smtp_password",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value,
          isSecret: key === "smtp_password",
          updatedAt: new Date(),
        },
      });
  }
}

async function restoreEmailNotifications(
  values: Record<(typeof EMAIL_SCENARIOS)[number], boolean | null>,
) {
  const db = await getDb();

  for (const scenario of EMAIL_SCENARIOS) {
    const enabled = values[scenario];

    if (enabled === null) {
      await db.delete(emailNotifications).where(eq(emailNotifications.scenario, scenario));
      continue;
    }

    await db
      .insert(emailNotifications)
      .values({ scenario, description: scenario, enabled, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: emailNotifications.scenario,
        set: { description: scenario, enabled, updatedAt: new Date() },
      });
  }
}

function formatDatetimeLocalInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { emailNotifications, settings, users } from "../../lib/db/schema";
import { hashPasswordValue } from "../../lib/password-utils";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-settings-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("settings browser regression", () => {
  test("updates public notice and other public settings from admin settings", async ({ page }) => {
    const fixture = await seedSettingsFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(
        `/${fixture.adminPath}/login?redirect=${encodeURIComponent(`/${fixture.adminPath}/settings`)}`,
      );
      await page.getByLabel("邮箱").fill(fixture.email);
      await page.getByLabel("密码").fill(fixture.password);
      await page.getByRole("button", { name: "登录后台" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/settings$`));
      await expect(page.getByRole("heading", { name: "后台设置" })).toBeVisible();

      await page.getByLabel("评论审核模式").selectOption("approved");
      await page.getByLabel("自动摘要长度").fill("210");
      await page.getByLabel("SMTP Host").fill("smtp.example.com");
      await page.getByLabel("SMTP 端口").fill("465");
      await page.getByLabel("SMTP 加密").selectOption("true");
      await page.getByLabel("SMTP 用户名").fill("mailer@example.com");
      await page.getByLabel("SMTP 密码").fill("browser-secret");
      await page.getByLabel("发件邮箱").fill("noreply@example.com");
      await page.getByLabel("发件人名称").fill("Inkwell Browser Mailer");
      await page
        .getByLabel("页头代码（Head）")
        .fill('<meta name="inkwell-public-head" content="ok" />');
      await page
        .getByLabel("页尾代码（Body 结束前）")
        .fill('<div data-testid="inkwell-public-footer">footer snippet</div>');
      await page
        .getByLabel("自定义 CSS")
        .fill(".inkwell-public-home { color: rgb(255, 0, 0); }");
      await page.getByLabel("站点品牌名称").fill("Inkwell Daily");
      await page.getByLabel("首页标题").fill("最新文章与精选内容");
      await page.getByLabel("首页说明").fill("浏览主题框架驱动的首页内容。\n支持可配置的 Hero 与列表视图。");
      await page.getByLabel("首页主按钮文案").fill("查看订阅");
      await page.getByLabel("首页主按钮链接").fill("/newsletter");
      await page.getByLabel("首页精选入口标题").fill("精选导航");
      await page.getByLabel("首页精选入口说明").fill("把重点入口放在首页，帮助访客快速跳转。");
      await page.getByLabel("卡片 1 文案").fill("浏览分类");
      await page.getByLabel("卡片 1 链接").fill("/category");
      await page.getByLabel("卡片 1 说明").fill("按主题浏览已经发布的内容。");
      await page.getByLabel("卡片 2 文案").fill("浏览标签");
      await page.getByLabel("卡片 2 链接").fill("/tag");
      await page.getByLabel("卡片 2 说明").fill("通过标签快速找到相关话题。");
      await page.getByLabel("卡片 3 文案").fill("浏览友链");
      await page.getByLabel("卡片 3 链接").fill("/friend-links");
      await page.getByLabel("卡片 3 说明").fill("发现更多值得关注的站点与作者。");
      await page.getByLabel("首页文章展示模式").selectOption("compact");
      await page.getByLabel("首页显示摘要").selectOption("false");
      await page.getByLabel("首页显示作者").selectOption("false");
      await page.getByLabel("首页显示分类").selectOption("false");
      await page.getByLabel("首页显示发布时间").selectOption("false");
      await page.locator('select[name="public_notice_enabled"]').selectOption("true");
      await page.locator('select[name="public_notice_variant"]').selectOption("warning");
      await page.locator('input[name="public_notice_title"]').fill("系统维护通知");
      await page.locator('textarea[name="public_notice_body"]').fill("今晚 23:00-23:30 将进行短暂维护。");
      await page.locator('input[name="public_notice_link_label"]').fill("查看详情");
      await page.locator('input[name="public_notice_link_url"]').fill("/docs/deployment");
      await page.getByLabel("Umami 开关").selectOption("true");
      await page.getByLabel("Website ID").fill("550e8400-e29b-41d4-a716-446655440000");
      await page.getByLabel("脚本地址").fill("https://umami.example.com/script.js");
      await page.getByRole("button", { name: "保存设置" }).click();

      await expect.poll(() => new URL(page.url()).pathname).toBe(`/${fixture.adminPath}/settings`);
      await expect.poll(() => new URL(page.url()).searchParams.get("saved")).toBe("1");

      await page.goto("/");
      await expect(page.getByRole("heading", { name: "系统维护通知" })).toBeVisible();
      await expect(page.getByText("今晚 23:00-23:30 将进行短暂维护。")).toBeVisible();
      await expect(page.getByRole("link", { name: "查看详情" })).toHaveAttribute(
        "href",
        "/docs/deployment",
      );
      await expect(page.locator('head meta[name="inkwell-public-head"]').first()).toHaveAttribute(
        "content",
        "ok",
      );
      await expect(page.locator('head style[data-inkwell-public-custom-css]').first()).toHaveAttribute(
        "data-inkwell-public-custom-css",
        "true",
      );
      await expect(page.getByTestId("inkwell-public-footer")).toHaveText("footer snippet");
      await expect(page.locator('script#umami-script')).toHaveAttribute(
        "src",
        "https://umami.example.com/script.js",
      );
      await expect(page.getByRole("main").getByText("Inkwell Daily")).toBeVisible();
      await expect(page.getByRole("heading", { name: "最新文章与精选内容" })).toBeVisible();
      await expect(page.getByText("浏览主题框架驱动的首页内容。 支持可配置的 Hero 与列表视图。")).toBeVisible();
      await expect(page.getByRole("link", { name: "查看订阅" })).toHaveAttribute("href", "/newsletter");
      await expect(page.getByRole("heading", { name: "精选导航" })).toBeVisible();
      await expect(page.getByText("把重点入口放在首页，帮助访客快速跳转。")).toBeVisible();
      await expect(page.getByRole("link", { name: "浏览分类" })).toHaveAttribute("href", "/category");
      await expect(page.getByRole("link", { name: "浏览标签" })).toHaveAttribute("href", "/tag");
      await expect(page.getByRole("link", { name: "浏览友链" })).toHaveAttribute("href", "/friend-links");
      await expect(page.getByText("Published excerpt")).toHaveCount(0);
      await expect(page.getByText("作者：Author Name")).toHaveCount(0);
      await expect(page.getByText("分类：Published Category")).toHaveCount(0);

      await page.goto(`/${fixture.adminPath}/settings`);
      await expect(page.getByRole("heading", { name: "系统维护通知" })).toHaveCount(0);
      await expect(page.locator('head meta[name="inkwell-public-head"]')).toHaveCount(0);
      await expect(page.locator('head style[data-inkwell-public-custom-css]')).toHaveCount(0);
      await expect(page.getByTestId("inkwell-public-footer")).toHaveCount(0);

      const siteBrandName = await getSettingValue("site_brand_name");
      const homeHeroTitle = await getSettingValue("home_hero_title");
      const homeHeroDescription = await getSettingValue("home_hero_description");
      const homePrimaryCtaLabel = await getSettingValue("home_primary_cta_label");
      const homePrimaryCtaUrl = await getSettingValue("home_primary_cta_url");
      const homeFeaturedLinksTitle = await getSettingValue("home_featured_links_title");
      const homeFeaturedLinksDescription = await getSettingValue("home_featured_links_description");
      const homeFeaturedLink1Label = await getSettingValue("home_featured_link_1_label");
      const homeFeaturedLink1Url = await getSettingValue("home_featured_link_1_url");
      const homeFeaturedLink2Label = await getSettingValue("home_featured_link_2_label");
      const homeFeaturedLink2Url = await getSettingValue("home_featured_link_2_url");
      const homeFeaturedLink3Label = await getSettingValue("home_featured_link_3_label");
      const homeFeaturedLink3Url = await getSettingValue("home_featured_link_3_url");
      const homePostsVariant = await getSettingValue("home_posts_variant");
      const homeShowPostExcerpt = await getSettingValue("home_show_post_excerpt");
      const homeShowPostAuthor = await getSettingValue("home_show_post_author");
      const homeShowPostCategory = await getSettingValue("home_show_post_category");
      const homeShowPostDate = await getSettingValue("home_show_post_date");
      const publicNoticeEnabled = await getSettingValue("public_notice_enabled");
      const publicNoticeVariant = await getSettingValue("public_notice_variant");
      const publicNoticeTitle = await getSettingValue("public_notice_title");
      const publicNoticeBody = await getSettingValue("public_notice_body");
      const publicNoticeLinkLabel = await getSettingValue("public_notice_link_label");
      const publicNoticeLinkUrl = await getSettingValue("public_notice_link_url");

      expect(siteBrandName).toBe("Inkwell Daily");
      expect(homeHeroTitle).toBe("最新文章与精选内容");
      expect(homeHeroDescription?.replaceAll("\r\n", "\n")).toBe(
        "浏览主题框架驱动的首页内容。\n支持可配置的 Hero 与列表视图。",
      );
      expect(homePrimaryCtaLabel).toBe("查看订阅");
      expect(homePrimaryCtaUrl).toBe("/newsletter");
      expect(homeFeaturedLinksTitle).toBe("精选导航");
      expect(homeFeaturedLinksDescription).toBe("把重点入口放在首页，帮助访客快速跳转。");
      expect(homeFeaturedLink1Label).toBe("浏览分类");
      expect(homeFeaturedLink1Url).toBe("/category");
      expect(homeFeaturedLink2Label).toBe("浏览标签");
      expect(homeFeaturedLink2Url).toBe("/tag");
      expect(homeFeaturedLink3Label).toBe("浏览友链");
      expect(homeFeaturedLink3Url).toBe("/friend-links");
      expect(homePostsVariant).toBe("compact");
      expect(homeShowPostExcerpt).toBe("false");
      expect(homeShowPostAuthor).toBe("false");
      expect(homeShowPostCategory).toBe("false");
      expect(homeShowPostDate).toBe("false");
      expect(publicNoticeEnabled).toBe("true");
      expect(publicNoticeVariant).toBe("warning");
      expect(publicNoticeTitle).toBe("系统维护通知");
      expect(publicNoticeBody).toBe("今晚 23:00-23:30 将进行短暂维护。");
      expect(publicNoticeLinkLabel).toBe("查看详情");
      expect(publicNoticeLinkUrl).toBe("/docs/deployment");
    } finally {
      await cleanupSettingsFixture(
        fixture.originalCommentModeration,
        fixture.originalExcerptLength,
        fixture.originalPublicCodeSettings,
        fixture.originalThemeFrameworkSettings,
        fixture.originalPublicNoticeSettings,
        fixture.originalUmamiSettings,
        fixture.originalEmailNotifications,
      );
    }
  });
});

type SettingsFixture = {
  adminPath: string;
  email: string;
  password: string;
  originalCommentModeration: string | null;
  originalExcerptLength: string | null;
  originalPublicCodeSettings: {
    public_head_html: string | null;
    public_footer_html: string | null;
    public_custom_css: string | null;
  };
  originalThemeFrameworkSettings: {
    site_brand_name: string | null;
    site_tagline: string | null;
    home_hero_title: string | null;
    home_hero_description: string | null;
    home_primary_cta_label: string | null;
    home_primary_cta_url: string | null;
    home_featured_links_title: string | null;
    home_featured_links_description: string | null;
    home_featured_link_1_label: string | null;
    home_featured_link_1_url: string | null;
    home_featured_link_1_description: string | null;
    home_featured_link_2_label: string | null;
    home_featured_link_2_url: string | null;
    home_featured_link_2_description: string | null;
    home_featured_link_3_label: string | null;
    home_featured_link_3_url: string | null;
    home_featured_link_3_description: string | null;
    home_posts_variant: string | null;
    home_show_post_excerpt: string | null;
    home_show_post_author: string | null;
    home_show_post_category: string | null;
    home_show_post_date: string | null;
  };
  originalPublicNoticeSettings: {
    public_notice_enabled: string | null;
    public_notice_variant: string | null;
    public_notice_title: string | null;
    public_notice_body: string | null;
    public_notice_link_label: string | null;
    public_notice_link_url: string | null;
  };
  originalUmamiSettings: {
    umami_enabled: string | null;
    umami_website_id: string | null;
    umami_script_url: string | null;
  };
  originalEmailNotifications: Record<string, boolean | null>;
};

async function seedSettingsFixture(seed: string): Promise<SettingsFixture> {
  const adminPath = await getConfiguredAdminPath();
  const email = `${BROWSER_PREFIX}${seed}@example.com`;
  const username = `${BROWSER_PREFIX}${seed}`;
  const password = `pw-${seed}-${randomUUID().slice(0, 8)}`;

  await cleanupSettingsFixture(
    null,
    null,
    {
      public_head_html: null,
      public_footer_html: null,
      public_custom_css: null,
    },
    {
      site_brand_name: null,
      site_tagline: null,
      home_hero_title: null,
      home_hero_description: null,
      home_primary_cta_label: null,
      home_primary_cta_url: null,
      home_featured_links_title: null,
      home_featured_links_description: null,
      home_featured_link_1_label: null,
      home_featured_link_1_url: null,
      home_featured_link_1_description: null,
      home_featured_link_2_label: null,
      home_featured_link_2_url: null,
      home_featured_link_2_description: null,
      home_featured_link_3_label: null,
      home_featured_link_3_url: null,
      home_featured_link_3_description: null,
      home_posts_variant: null,
      home_show_post_excerpt: null,
      home_show_post_author: null,
      home_show_post_category: null,
      home_show_post_date: null,
    },
    {
      public_notice_enabled: null,
      public_notice_variant: null,
      public_notice_title: null,
      public_notice_body: null,
      public_notice_link_label: null,
      public_notice_link_url: null,
    },
    {
      umami_enabled: null,
      umami_website_id: null,
      umami_script_url: null,
    },
    {
      comment_pending: null,
      comment_approved: null,
      comment_reply: null,
      post_published: null,
    },
  );

  const originalCommentModeration = await getSettingValue("comment_moderation");
  const originalExcerptLength = await getSettingValue("excerpt_length");
  const originalPublicCodeSettings = {
    public_head_html: await getSettingValue("public_head_html"),
    public_footer_html: await getSettingValue("public_footer_html"),
    public_custom_css: await getSettingValue("public_custom_css"),
  };
  const originalThemeFrameworkSettings = {
    site_brand_name: await getSettingValue("site_brand_name"),
    site_tagline: await getSettingValue("site_tagline"),
    home_hero_title: await getSettingValue("home_hero_title"),
    home_hero_description: await getSettingValue("home_hero_description"),
    home_primary_cta_label: await getSettingValue("home_primary_cta_label"),
    home_primary_cta_url: await getSettingValue("home_primary_cta_url"),
    home_featured_links_title: await getSettingValue("home_featured_links_title"),
    home_featured_links_description: await getSettingValue("home_featured_links_description"),
    home_featured_link_1_label: await getSettingValue("home_featured_link_1_label"),
    home_featured_link_1_url: await getSettingValue("home_featured_link_1_url"),
    home_featured_link_1_description: await getSettingValue("home_featured_link_1_description"),
    home_featured_link_2_label: await getSettingValue("home_featured_link_2_label"),
    home_featured_link_2_url: await getSettingValue("home_featured_link_2_url"),
    home_featured_link_2_description: await getSettingValue("home_featured_link_2_description"),
    home_featured_link_3_label: await getSettingValue("home_featured_link_3_label"),
    home_featured_link_3_url: await getSettingValue("home_featured_link_3_url"),
    home_featured_link_3_description: await getSettingValue("home_featured_link_3_description"),
    home_posts_variant: await getSettingValue("home_posts_variant"),
    home_show_post_excerpt: await getSettingValue("home_show_post_excerpt"),
    home_show_post_author: await getSettingValue("home_show_post_author"),
    home_show_post_category: await getSettingValue("home_show_post_category"),
    home_show_post_date: await getSettingValue("home_show_post_date"),
  };
  const originalPublicNoticeSettings = {
    public_notice_enabled: await getSettingValue("public_notice_enabled"),
    public_notice_variant: await getSettingValue("public_notice_variant"),
    public_notice_title: await getSettingValue("public_notice_title"),
    public_notice_body: await getSettingValue("public_notice_body"),
    public_notice_link_label: await getSettingValue("public_notice_link_label"),
    public_notice_link_url: await getSettingValue("public_notice_link_url"),
  };
  const originalUmamiSettings = {
    umami_enabled: await getSettingValue("umami_enabled"),
    umami_website_id: await getSettingValue("umami_website_id"),
    umami_script_url: await getSettingValue("umami_script_url"),
  };
  const originalEmailNotifications = {
    comment_pending: await getEmailNotificationEnabled("comment_pending"),
    comment_approved: await getEmailNotificationEnabled("comment_approved"),
    comment_reply: await getEmailNotificationEnabled("comment_reply"),
    post_published: await getEmailNotificationEnabled("post_published"),
  };

  await withDb(async (db) => {
    await db.insert(users).values({
      email,
      username,
      displayName: "Browser Settings Editor",
      passwordHash: hashPasswordValue(password),
      role: "editor",
    });
  });

  return {
    adminPath,
    email,
    password,
    originalCommentModeration,
    originalExcerptLength,
    originalPublicCodeSettings,
    originalThemeFrameworkSettings,
    originalPublicNoticeSettings,
    originalUmamiSettings,
    originalEmailNotifications,
  };
}

async function cleanupSettingsFixture(
  originalCommentModeration: string | null,
  originalExcerptLength: string | null,
  originalPublicCodeSettings: {
    public_head_html: string | null;
    public_footer_html: string | null;
    public_custom_css: string | null;
  },
  originalThemeFrameworkSettings: {
    site_brand_name: string | null;
    site_tagline: string | null;
    home_hero_title: string | null;
    home_hero_description: string | null;
    home_primary_cta_label: string | null;
    home_primary_cta_url: string | null;
    home_featured_links_title: string | null;
    home_featured_links_description: string | null;
    home_featured_link_1_label: string | null;
    home_featured_link_1_url: string | null;
    home_featured_link_1_description: string | null;
    home_featured_link_2_label: string | null;
    home_featured_link_2_url: string | null;
    home_featured_link_2_description: string | null;
    home_featured_link_3_label: string | null;
    home_featured_link_3_url: string | null;
    home_featured_link_3_description: string | null;
    home_posts_variant: string | null;
    home_show_post_excerpt: string | null;
    home_show_post_author: string | null;
    home_show_post_category: string | null;
    home_show_post_date: string | null;
  },
  originalPublicNoticeSettings: {
    public_notice_enabled: string | null;
    public_notice_variant: string | null;
    public_notice_title: string | null;
    public_notice_body: string | null;
    public_notice_link_label: string | null;
    public_notice_link_url: string | null;
  },
  originalUmamiSettings: {
    umami_enabled: string | null;
    umami_website_id: string | null;
    umami_script_url: string | null;
  },
  originalEmailNotifications: Record<string, boolean | null>,
) {
  await withDb(async (db) => {
    const browserUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.username, `${BROWSER_PREFIX}%`));

    if (browserUsers.length > 0) {
      await db.delete(users).where(
        inArray(
          users.id,
          browserUsers.map((user) => user.id),
        ),
      );
    }

    await restoreSetting(db, "comment_moderation", originalCommentModeration);
    await restoreSetting(db, "excerpt_length", originalExcerptLength);
    await restoreSetting(db, "public_head_html", originalPublicCodeSettings.public_head_html);
    await restoreSetting(db, "public_footer_html", originalPublicCodeSettings.public_footer_html);
    await restoreSetting(db, "public_custom_css", originalPublicCodeSettings.public_custom_css);
    await restoreSetting(db, "site_brand_name", originalThemeFrameworkSettings.site_brand_name);
    await restoreSetting(db, "site_tagline", originalThemeFrameworkSettings.site_tagline);
    await restoreSetting(db, "home_hero_title", originalThemeFrameworkSettings.home_hero_title);
    await restoreSetting(db, "home_hero_description", originalThemeFrameworkSettings.home_hero_description);
    await restoreSetting(db, "home_primary_cta_label", originalThemeFrameworkSettings.home_primary_cta_label);
    await restoreSetting(db, "home_primary_cta_url", originalThemeFrameworkSettings.home_primary_cta_url);
    await restoreSetting(db, "home_featured_links_title", originalThemeFrameworkSettings.home_featured_links_title);
    await restoreSetting(db, "home_featured_links_description", originalThemeFrameworkSettings.home_featured_links_description);
    await restoreSetting(db, "home_featured_link_1_label", originalThemeFrameworkSettings.home_featured_link_1_label);
    await restoreSetting(db, "home_featured_link_1_url", originalThemeFrameworkSettings.home_featured_link_1_url);
    await restoreSetting(db, "home_featured_link_1_description", originalThemeFrameworkSettings.home_featured_link_1_description);
    await restoreSetting(db, "home_featured_link_2_label", originalThemeFrameworkSettings.home_featured_link_2_label);
    await restoreSetting(db, "home_featured_link_2_url", originalThemeFrameworkSettings.home_featured_link_2_url);
    await restoreSetting(db, "home_featured_link_2_description", originalThemeFrameworkSettings.home_featured_link_2_description);
    await restoreSetting(db, "home_featured_link_3_label", originalThemeFrameworkSettings.home_featured_link_3_label);
    await restoreSetting(db, "home_featured_link_3_url", originalThemeFrameworkSettings.home_featured_link_3_url);
    await restoreSetting(db, "home_featured_link_3_description", originalThemeFrameworkSettings.home_featured_link_3_description);
    await restoreSetting(db, "home_posts_variant", originalThemeFrameworkSettings.home_posts_variant);
    await restoreSetting(db, "home_show_post_excerpt", originalThemeFrameworkSettings.home_show_post_excerpt);
    await restoreSetting(db, "home_show_post_author", originalThemeFrameworkSettings.home_show_post_author);
    await restoreSetting(db, "home_show_post_category", originalThemeFrameworkSettings.home_show_post_category);
    await restoreSetting(db, "home_show_post_date", originalThemeFrameworkSettings.home_show_post_date);
    await restoreSetting(db, "public_notice_enabled", originalPublicNoticeSettings.public_notice_enabled);
    await restoreSetting(db, "public_notice_variant", originalPublicNoticeSettings.public_notice_variant);
    await restoreSetting(db, "public_notice_title", originalPublicNoticeSettings.public_notice_title);
    await restoreSetting(db, "public_notice_body", originalPublicNoticeSettings.public_notice_body);
    await restoreSetting(db, "public_notice_link_label", originalPublicNoticeSettings.public_notice_link_label);
    await restoreSetting(db, "public_notice_link_url", originalPublicNoticeSettings.public_notice_link_url);
    await restoreSetting(db, "umami_enabled", originalUmamiSettings.umami_enabled);
    await restoreSetting(db, "umami_website_id", originalUmamiSettings.umami_website_id);
    await restoreSetting(db, "umami_script_url", originalUmamiSettings.umami_script_url);
    await restoreEmailNotification(db, "comment_pending", originalEmailNotifications.comment_pending);
    await restoreEmailNotification(db, "comment_approved", originalEmailNotifications.comment_approved);
    await restoreEmailNotification(db, "comment_reply", originalEmailNotifications.comment_reply);
    await restoreEmailNotification(db, "post_published", originalEmailNotifications.post_published);
  });
}

async function restoreSetting(
  db: ReturnType<typeof drizzle>,
  key:
    | "comment_moderation"
    | "excerpt_length"
    | "public_head_html"
    | "public_footer_html"
    | "public_custom_css"
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
    | "public_notice_enabled"
    | "public_notice_variant"
    | "public_notice_title"
    | "public_notice_body"
    | "public_notice_link_label"
    | "public_notice_link_url"
    | "umami_enabled"
    | "umami_website_id"
    | "umami_script_url",
  value: string | null,
) {
  if (value === null) {
    await db.delete(settings).where(eq(settings.key, key));
    return;
  }

  await db
    .insert(settings)
    .values({
      key,
      value,
      isSecret: false,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value,
        isSecret: false,
        updatedAt: new Date(),
      },
    });
}

async function restoreEmailNotification(
  db: ReturnType<typeof drizzle>,
  scenario: "comment_pending" | "comment_approved" | "comment_reply" | "post_published",
  enabled: boolean | null,
) {
  if (enabled === null) {
    await db.delete(emailNotifications).where(eq(emailNotifications.scenario, scenario));
    return;
  }

  await db
    .insert(emailNotifications)
    .values({
      scenario,
      description: scenario,
      enabled,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: emailNotifications.scenario,
      set: {
        description: scenario,
        enabled,
        updatedAt: new Date(),
      },
    });
}

async function getConfiguredAdminPath() {
  const value = await getSettingValue("admin_path");
  return value?.trim() || "admin";
}

async function getSettingValue(key: string) {
  return withDb(async (db) => {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    return row?.value ?? null;
  });
}

async function getEmailNotificationEnabled(scenario: string) {
  return withDb(async (db) => {
    const [row] = await db
      .select({ enabled: emailNotifications.enabled })
      .from(emailNotifications)
      .where(eq(emailNotifications.scenario, scenario))
      .limit(1);

    return row?.enabled ?? null;
  });
}

async function withDb<T>(callback: (db: ReturnType<typeof drizzle>) => Promise<T>) {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, {
    schema: { emailNotifications, settings, users },
    casing: "snake_case",
  });

  try {
    return await callback(db);
  } finally {
    await client.end({ timeout: 0 });
  }
}

function resolveTestEnvPath() {
  const envCandidates = [".env.test.local", ".env.local"];

  for (const candidate of envCandidates) {
    const candidatePath = resolve(process.cwd(), candidate);

    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(
    `Missing test env file. Expected one of: ${envCandidates.join(", ")}. Create one before running browser tests.`,
  );
}

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;

  if (!value) {
    throw new Error(`DATABASE_URL is not configured in ${testEnvPath}.`);
  }

  return value;
}

function assertSafeTestConnection(
  envPath: string,
  connectionInfo: { databaseName: string; hostname: string },
) {
  if (basename(envPath) === ".env.test.local") {
    if (!connectionInfo.databaseName.toLowerCase().includes("_test")) {
      throw new Error(
        [
          `Refusing to run browser tests against non-test database "${connectionInfo.databaseName}".`,
          'DATABASE_URL must point to a database name containing "_test".',
        ].join(" "),
      );
    }

    return;
  }

  if (!isLocalHostname(connectionInfo.hostname)) {
    throw new Error(
      [
        ".env.local is only allowed for browser tests when DATABASE_URL points to a local database host.",
        `Received host "${connectionInfo.hostname}".`,
      ].join(" "),
    );
  }
}

function getConnectionInfo(connectionUrl: string) {
  try {
    const { hostname, pathname } = new URL(connectionUrl);
    const name = pathname.replace(/^\/+/, "").split("/")[0];

    if (!name) {
      throw new Error("DATABASE_URL is missing a database name.");
    }

    return {
      databaseName: name,
      hostname,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Invalid DATABASE_URL for browser tests. ${reason}`);
  }
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

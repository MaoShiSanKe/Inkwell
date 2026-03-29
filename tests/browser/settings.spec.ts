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
  test("updates comment moderation, excerpt length, smtp settings, umami settings, and email notification scenarios from admin settings", async ({ page }) => {
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
      await page.getByLabel("Umami 开关").selectOption("true");
      await page.getByLabel("Website ID").fill("550e8400-e29b-41d4-a716-446655440000");
      await page.getByLabel("脚本地址").fill("https://umami.example.com/script.js");
      await page.getByRole("button", { name: "保存设置" }).click();

      await expect.poll(() => new URL(page.url()).pathname).toBe(`/${fixture.adminPath}/settings`);
      await expect.poll(() => new URL(page.url()).searchParams.get("saved")).toBe("1");

      await page.goto("/");
      await expect(page.locator('script#umami-script')).toHaveAttribute(
        "src",
        "https://umami.example.com/script.js",
      );
      await expect(page.locator('script#umami-script')).toHaveAttribute(
        "data-website-id",
        "550e8400-e29b-41d4-a716-446655440000",
      );

      await page.goto(`/${fixture.adminPath}/settings`);
      await expect(page.locator('script#umami-script')).toHaveCount(0);

      await page.goto(`/${fixture.adminPath}/login`);
      await expect(page.locator('script#umami-script')).toHaveCount(0);

      await page.goto(`/${fixture.adminPath}/settings`);
      await page.getByRole("checkbox", { name: /comment_pending/i }).uncheck();
      await page.getByRole("checkbox", { name: /post_published/i }).check();
      await page.getByRole("button", { name: "保存邮件通知" }).click();

      const commentModeration = await getSettingValue("comment_moderation");
      const excerptLength = await getSettingValue("excerpt_length");
      const smtpHost = await getSettingValue("smtp_host");
      const smtpPort = await getSettingValue("smtp_port");
      const smtpSecure = await getSettingValue("smtp_secure");
      const smtpUsername = await getSettingValue("smtp_username");
      const smtpPassword = await getSettingValue("smtp_password");
      const smtpFromEmail = await getSettingValue("smtp_from_email");
      const smtpFromName = await getSettingValue("smtp_from_name");
      const umamiEnabled = await getSettingValue("umami_enabled");
      const umamiWebsiteId = await getSettingValue("umami_website_id");
      const umamiScriptUrl = await getSettingValue("umami_script_url");
      const commentPending = await getEmailNotificationEnabled("comment_pending");
      const postPublished = await getEmailNotificationEnabled("post_published");

      expect(commentModeration).toBe("approved");
      expect(excerptLength).toBe("210");
      expect(smtpHost).toBe("smtp.example.com");
      expect(smtpPort).toBe("465");
      expect(smtpSecure).toBe("true");
      expect(smtpUsername).toBe("mailer@example.com");
      expect(smtpPassword).toBe("browser-secret");
      expect(smtpFromEmail).toBe("noreply@example.com");
      expect(smtpFromName).toBe("Inkwell Browser Mailer");
      expect(umamiEnabled).toBe("true");
      expect(umamiWebsiteId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(umamiScriptUrl).toBe("https://umami.example.com/script.js");
      expect(commentPending).toBe(false);
      expect(postPublished).toBe(true);
    } finally {
      await cleanupSettingsFixture(
        fixture.originalCommentModeration,
        fixture.originalExcerptLength,
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
    originalUmamiSettings,
    originalEmailNotifications,
  };
}

async function cleanupSettingsFixture(
  originalCommentModeration: string | null,
  originalExcerptLength: string | null,
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

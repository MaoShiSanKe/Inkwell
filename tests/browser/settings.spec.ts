import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { emailNotifications, settings, users } from "../../lib/db/schema";
import { hashPasswordValue } from "../../lib/password-utils";

loadEnv({ path: ".env.local" });

const BROWSER_PREFIX = "integration-browser-settings-";
const databaseUrl = getDatabaseUrl();

test.describe("settings browser regression", () => {
  test("updates comment moderation, excerpt length, and email notification scenarios from admin settings", async ({ page }) => {
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
      await page.getByRole("button", { name: "保存设置" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/settings\\?saved=1$`));
      await expect(page.getByText("设置已保存成功。")).toBeVisible();

      await page.getByRole("checkbox", { name: /comment_pending/i }).uncheck();
      await page.getByRole("checkbox", { name: /post_published/i }).check();
      await page.getByRole("button", { name: "保存邮件通知" }).click();

      const commentModeration = await getSettingValue("comment_moderation");
      const excerptLength = await getSettingValue("excerpt_length");
      const commentPending = await getEmailNotificationEnabled("comment_pending");
      const postPublished = await getEmailNotificationEnabled("post_published");

      expect(commentModeration).toBe("approved");
      expect(excerptLength).toBe("210");
      expect(commentPending).toBe(false);
      expect(postPublished).toBe(true);
    } finally {
      await cleanupSettingsFixture(
        fixture.originalCommentModeration,
        fixture.originalExcerptLength,
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
  originalEmailNotifications: Record<string, boolean | null>;
};

async function seedSettingsFixture(seed: string): Promise<SettingsFixture> {
  const adminPath = await getConfiguredAdminPath();
  const email = `${BROWSER_PREFIX}${seed}@example.com`;
  const username = `${BROWSER_PREFIX}${seed}`;
  const password = `pw-${seed}-${randomUUID().slice(0, 8)}`;

  await cleanupSettingsFixture(null, null, {
    comment_pending: null,
    comment_approved: null,
    comment_reply: null,
    post_published: null,
  });

  const originalCommentModeration = await getSettingValue("comment_moderation");
  const originalExcerptLength = await getSettingValue("excerpt_length");
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
    originalEmailNotifications,
  };
}

async function cleanupSettingsFixture(
  originalCommentModeration: string | null,
  originalExcerptLength: string | null,
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
    await restoreEmailNotification(db, "comment_pending", originalEmailNotifications.comment_pending);
    await restoreEmailNotification(db, "comment_approved", originalEmailNotifications.comment_approved);
    await restoreEmailNotification(db, "comment_reply", originalEmailNotifications.comment_reply);
    await restoreEmailNotification(db, "post_published", originalEmailNotifications.post_published);
  });
}

async function restoreSetting(
  db: ReturnType<typeof drizzle>,
  key: "comment_moderation" | "excerpt_length",
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

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;

  if (!value) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return value;
}

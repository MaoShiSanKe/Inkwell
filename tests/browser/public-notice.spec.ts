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
  test("dismisses public notice by version and re-shows it after version changes", async ({ page }) => {
    const fixture = await seedSettingsFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(
        `/${fixture.adminPath}/login?redirect=${encodeURIComponent(`/${fixture.adminPath}/settings`)}`,
      );
      await page.getByLabel("邮箱").fill(fixture.email);
      await page.getByLabel("密码").fill(fixture.password);
      await page.getByRole("button", { name: "登录后台" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/settings$`));

      await page.locator('select[name="public_notice_enabled"]').selectOption("true");
      await page.locator('select[name="public_notice_variant"]').selectOption("warning");
      await page.locator('select[name="public_notice_dismissible"]').selectOption("true");
      await page.locator('input[name="public_notice_version"]').fill("2026-04-maintenance-v1");
      await page.locator('input[name="public_notice_start_at"]').fill("2000-01-01T00:00");
      await page.locator('input[name="public_notice_end_at"]').fill("2099-04-02T00:00");
      await page.locator('input[name="public_notice_title"]').fill("系统维护通知");
      await page.locator('textarea[name="public_notice_body"]').fill("今晚 23:00-23:30 将进行短暂维护。");
      await page.locator('input[name="public_notice_link_label"]').fill("查看详情");
      await page.locator('input[name="public_notice_link_url"]').fill("/docs/deployment");
      await page.getByRole("button", { name: "保存设置" }).click();

      await expect.poll(() => new URL(page.url()).searchParams.get("saved")).toBe("1");

      await page.goto("/");
      await expect(page.getByRole("heading", { name: "系统维护通知" })).toBeVisible();
      await expect(page.getByRole("link", { name: "查看详情" })).toHaveClass(/focus-visible:ring-current\/30/);
      await expect(page.getByRole("button", { name: "关闭站点公告" })).toBeVisible();
      await expect(page.getByRole("button", { name: "关闭站点公告" })).toHaveClass(/focus-visible:ring-current\/30/);
      await page.getByRole("button", { name: "关闭站点公告" }).click();
      await expect(page.getByRole("heading", { name: "系统维护通知" })).toHaveCount(0);

      await page.goto("/search");
      await expect(page.getByRole("heading", { name: "系统维护通知" })).toHaveCount(0);

      await page.goto(`/${fixture.adminPath}/settings`);
      await page.locator('input[name="public_notice_version"]').fill("2026-04-maintenance-v2");
      await page.getByRole("button", { name: "保存设置" }).click();
      await expect.poll(() => new URL(page.url()).searchParams.get("saved")).toBe("1");

      await page.goto("/");
      await expect(page.getByRole("heading", { name: "系统维护通知" })).toBeVisible();
      await expect(page.getByRole("button", { name: "关闭站点公告" })).toBeVisible();

      const publicNoticeDismissible = await getSettingValue("public_notice_dismissible");
      const publicNoticeVersion = await getSettingValue("public_notice_version");

      expect(publicNoticeDismissible).toBe("true");
      expect(publicNoticeVersion).toBe("2026-04-maintenance-v2");
    } finally {
      await cleanupSettingsFixture(
        fixture.originalPublicNoticeSettings,
        fixture.originalEmailNotifications,
      );
    }
  });

  test("shows notice only during the configured time window", async ({ page }) => {
    const fixture = await seedSettingsFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(
        `/${fixture.adminPath}/login?redirect=${encodeURIComponent(`/${fixture.adminPath}/settings`)}`,
      );
      await page.getByLabel("邮箱").fill(fixture.email);
      await page.getByLabel("密码").fill(fixture.password);
      await page.getByRole("button", { name: "登录后台" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/settings$`));

      await page.locator('select[name="public_notice_enabled"]').selectOption("true");
      await page.locator('select[name="public_notice_variant"]').selectOption("warning");
      await page.locator('select[name="public_notice_dismissible"]').selectOption("false");
      await page.locator('input[name="public_notice_version"]').fill("");
      await page.locator('input[name="public_notice_title"]').fill("时间窗口公告");
      await page.locator('textarea[name="public_notice_body"]').fill("仅在设定时间段内显示。");
      await page.locator('input[name="public_notice_link_label"]').fill("");
      await page.locator('input[name="public_notice_link_url"]').fill("");

      await page.locator('input[name="public_notice_start_at"]').fill("2999-01-01T00:00");
      await page.locator('input[name="public_notice_end_at"]').fill("2999-01-02T00:00");
      await page.getByRole("button", { name: "保存设置" }).click();
      await expect.poll(() => new URL(page.url()).searchParams.get("saved")).toBe("1");

      await page.goto("/");
      await expect(page.getByRole("heading", { name: "时间窗口公告" })).toHaveCount(0);

      await page.goto(`/${fixture.adminPath}/settings`);
      await page.locator('input[name="public_notice_start_at"]').fill("2000-01-01T00:00");
      await page.locator('input[name="public_notice_end_at"]').fill("2999-01-02T00:00");
      await page.getByRole("button", { name: "保存设置" }).click();
      await expect.poll(() => new URL(page.url()).searchParams.get("saved")).toBe("1");

      await page.goto("/");
      await expect(page.getByRole("heading", { name: "时间窗口公告" })).toBeVisible();

      await page.goto(`/${fixture.adminPath}/settings`);
      await page.locator('input[name="public_notice_start_at"]').fill("");
      await page.locator('input[name="public_notice_end_at"]').fill("2000-01-01T00:00");
      await page.getByRole("button", { name: "保存设置" }).click();
      await expect.poll(() => new URL(page.url()).searchParams.get("saved")).toBe("1");

      await page.goto("/");
      await expect(page.getByRole("heading", { name: "时间窗口公告" })).toHaveCount(0);

      const publicNoticeStartAt = await getSettingValue("public_notice_start_at");
      const publicNoticeEndAt = await getSettingValue("public_notice_end_at");

      expect(publicNoticeStartAt).not.toBeNull();
      expect(publicNoticeEndAt).not.toBeNull();
    } finally {
      await cleanupSettingsFixture(
        fixture.originalPublicNoticeSettings,
        fixture.originalEmailNotifications,
      );
    }
  });
});

type SettingsFixture = {
  adminPath: string;
  email: string;
  password: string;
  originalPublicNoticeSettings: {
    public_notice_enabled: string | null;
    public_notice_variant: string | null;
    public_notice_dismissible: string | null;
    public_notice_version: string | null;
    public_notice_start_at: string | null;
    public_notice_end_at: string | null;
    public_notice_title: string | null;
    public_notice_body: string | null;
    public_notice_link_label: string | null;
    public_notice_link_url: string | null;
  };
  originalEmailNotifications: Record<string, boolean | null>;
};

async function seedSettingsFixture(seed: string): Promise<SettingsFixture> {
  const adminPath = await getConfiguredAdminPath();
  const email = `${BROWSER_PREFIX}${seed}@example.com`;
  const username = `${BROWSER_PREFIX}${seed}`;
  const password = `pw-${seed}-${randomUUID().slice(0, 8)}`;

  await cleanupSettingsFixture(
    {
      public_notice_enabled: null,
      public_notice_variant: null,
      public_notice_dismissible: null,
      public_notice_version: null,
      public_notice_start_at: null,
      public_notice_end_at: null,
      public_notice_title: null,
      public_notice_body: null,
      public_notice_link_label: null,
      public_notice_link_url: null,
    },
    {
      comment_pending: null,
      comment_approved: null,
      comment_reply: null,
      post_published: null,
    },
  );

  const originalPublicNoticeSettings = {
    public_notice_enabled: await getSettingValue("public_notice_enabled"),
    public_notice_variant: await getSettingValue("public_notice_variant"),
    public_notice_dismissible: await getSettingValue("public_notice_dismissible"),
    public_notice_version: await getSettingValue("public_notice_version"),
    public_notice_start_at: await getSettingValue("public_notice_start_at"),
    public_notice_end_at: await getSettingValue("public_notice_end_at"),
    public_notice_title: await getSettingValue("public_notice_title"),
    public_notice_body: await getSettingValue("public_notice_body"),
    public_notice_link_label: await getSettingValue("public_notice_link_label"),
    public_notice_link_url: await getSettingValue("public_notice_link_url"),
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
      displayName: "Browser Notice Editor",
      passwordHash: hashPasswordValue(password),
      role: "editor",
    });
  });

  return {
    adminPath,
    email,
    password,
    originalPublicNoticeSettings,
    originalEmailNotifications,
  };
}

async function cleanupSettingsFixture(
  originalPublicNoticeSettings: SettingsFixture["originalPublicNoticeSettings"],
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

    await restoreSetting(db, "public_notice_enabled", originalPublicNoticeSettings.public_notice_enabled);
    await restoreSetting(db, "public_notice_variant", originalPublicNoticeSettings.public_notice_variant);
    await restoreSetting(db, "public_notice_dismissible", originalPublicNoticeSettings.public_notice_dismissible);
    await restoreSetting(db, "public_notice_version", originalPublicNoticeSettings.public_notice_version);
    await restoreSetting(db, "public_notice_start_at", originalPublicNoticeSettings.public_notice_start_at);
    await restoreSetting(db, "public_notice_end_at", originalPublicNoticeSettings.public_notice_end_at);
    await restoreSetting(db, "public_notice_title", originalPublicNoticeSettings.public_notice_title);
    await restoreSetting(db, "public_notice_body", originalPublicNoticeSettings.public_notice_body);
    await restoreSetting(db, "public_notice_link_label", originalPublicNoticeSettings.public_notice_link_label);
    await restoreSetting(db, "public_notice_link_url", originalPublicNoticeSettings.public_notice_link_url);
    await restoreEmailNotification(db, "comment_pending", originalEmailNotifications.comment_pending);
    await restoreEmailNotification(db, "comment_approved", originalEmailNotifications.comment_approved);
    await restoreEmailNotification(db, "comment_reply", originalEmailNotifications.comment_reply);
    await restoreEmailNotification(db, "post_published", originalEmailNotifications.post_published);
  });
}

async function restoreSetting(
  db: ReturnType<typeof drizzle>,
  key:
    | "public_notice_enabled"
    | "public_notice_variant"
    | "public_notice_dismissible"
    | "public_notice_version"
    | "public_notice_start_at"
    | "public_notice_end_at"
    | "public_notice_title"
    | "public_notice_body"
    | "public_notice_link_label"
    | "public_notice_link_url",
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

import { createHmac, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { eq, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { emailNotifications, settings, users } from "../../lib/db/schema";

type ThemeSettingsSnapshot = {
  public_layout_width: string | null;
  public_surface_variant: string | null;
  public_accent_theme: string | null;
};
import { hashPasswordValue } from "../../lib/password-utils";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-subscribers-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("subscriber workflow browser regression", () => {
  test("subscribes publicly, manages subscribers in admin, and completes unsubscribe", async ({ page }) => {
    const fixture = await seedSubscriberFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);
    const originalThemeSettings = await captureThemeSettings();

    try {
      await applyThemeSettings({
        public_layout_width: "wide",
        public_surface_variant: "solid",
        public_accent_theme: "blue",
      });

      await page.goto("/");
      await page.getByRole("link", { name: "订阅新文章" }).click();
      await expect(page).toHaveURL(/\/subscribe$/);
      await expect(page.locator("h1")).toContainText("订阅新文章通知");
      await expect(page.locator("main")).toHaveClass(/max-w-6xl/);
      await expect(page.getByText("Subscribe", { exact: true })).toHaveClass(/text-blue-700/);
      await expect(page.getByRole("link", { name: "最新文章" })).toHaveClass(/underline-offset-4/);
      await expect(page.getByRole("button", { name: "订阅邮件通知" })).toHaveClass(/focus-visible:ring-blue-500\/40/);
      await expect(page.getByRole("button", { name: "订阅邮件通知" })).toHaveClass(/text-white/);
      await expect(page.getByLabel("邮箱")).toHaveClass(/focus:border-blue-500/);

      await page.getByLabel("昵称").fill("Browser Reader");
      await page.getByLabel("邮箱").fill(fixture.readerEmail);
      await page.getByRole("button", { name: "订阅邮件通知" }).click();
      await expect(page.getByText("订阅成功。后续有新文章发布时，你会收到邮件通知。")).toBeVisible();

      await page.getByRole("button", { name: "订阅邮件通知" }).click();
      await expect(page.getByText("这个邮箱已经订阅，无需重复提交。")).toBeVisible();

      await page.goto(
        `/${fixture.adminPath}/login?redirect=${encodeURIComponent(`/${fixture.adminPath}/subscribers`)}`,
      );
      await page.getByLabel("邮箱").fill(fixture.adminEmail);
      await page.getByLabel("密码").fill(fixture.adminPassword);
      await page.getByRole("button", { name: "登录后台" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/subscribers$`));
      await expect(page.getByRole("heading", { name: "订阅者管理" })).toBeVisible();
      await expect(page.getByText(fixture.readerEmail)).toBeVisible();

      const subscriberRow = page.locator("tbody tr", {
        has: page.getByText(fixture.readerEmail),
      });
      await subscriberRow.getByRole("button", { name: "删除" }).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe(`/${fixture.adminPath}/subscribers`);
      await expect.poll(() => new URL(page.url()).searchParams.get("deleted")).toBe("1");
      await expect(page.getByText("订阅者已删除。")).toBeVisible();
      await expect(page.getByText(fixture.readerEmail)).toHaveCount(0);

      const unsubscribeToken = await insertSubscriberAndCreateToken(fixture.readerEmail, "Browser Reader");
      await page.goto(`/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`);
      await expect(page.getByRole("heading", { name: "退订邮件通知" })).toBeVisible();
      await expect(page.locator("main")).toHaveClass(/max-w-6xl/);
      await expect(page.getByText("Unsubscribe", { exact: true })).toHaveClass(/text-blue-700/);
      await expect(page.getByText(fixture.readerEmail)).toBeVisible();
      await expect(page.getByRole("button", { name: "确认退订" })).toHaveClass(/border-red-300/);
      await expect(page.getByRole("button", { name: "确认退订" })).toHaveClass(/focus-visible:ring-blue-500\/40/);
      await page.getByRole("button", { name: "确认退订" }).click();
      await expect(page).toHaveURL(/\/unsubscribe\?status=removed$/);
      await expect(page.getByText("你已成功退订后续新文章邮件。")).toBeVisible();

      await page.goto("/unsubscribe?token=bad-token");
      await expect(page.getByText("退订链接无效或已失效。")).toBeVisible();
      await expect(page.getByRole("link", { name: "订阅页" })).toHaveClass(/underline-offset-4/);
      await expect(page.getByRole("link", { name: "订阅页" })).toHaveClass(/text-blue-700/);
    } finally {
      await cleanupThemeSettings(originalThemeSettings);
      await cleanupSubscriberFixture();
    }
  });
});

type SubscriberFixture = {
  adminPath: string;
  adminEmail: string;
  adminPassword: string;
  readerEmail: string;
};

async function seedSubscriberFixture(seed: string): Promise<SubscriberFixture> {
  await cleanupSubscriberFixture();

  const adminPath = await getConfiguredAdminPath();
  const adminEmail = `${BROWSER_PREFIX}${seed}@example.com`;
  const adminUsername = `${BROWSER_PREFIX}${seed}`;
  const adminPassword = `pw-${seed}-${randomUUID().slice(0, 8)}`;
  const readerEmail = `${BROWSER_PREFIX}reader-${seed}@example.com`;

  await withDb(async (db) => {
    await db.insert(users).values({
      email: adminEmail,
      username: adminUsername,
      displayName: "Browser Subscriber Admin",
      passwordHash: hashPasswordValue(adminPassword),
      role: "editor",
    });

    await db
      .insert(emailNotifications)
      .values({
        scenario: "post_published",
        description: "Notify subscribers when a post is published.",
        enabled: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: emailNotifications.scenario,
        set: {
          description: "Notify subscribers when a post is published.",
          enabled: true,
          updatedAt: new Date(),
        },
      });
  });

  return {
    adminPath,
    adminEmail,
    adminPassword,
    readerEmail,
  };
}

async function insertSubscriberAndCreateToken(email: string, displayName: string) {
  return withDb(async (db) => {
    const [subscriber] = await db
      .insert(users)
      .values({
        email,
        username: `${BROWSER_PREFIX}${randomUUID().slice(0, 8)}`,
        displayName,
        passwordHash: hashPasswordValue(randomUUID()),
        role: "subscriber",
      })
      .returning({
        id: users.id,
        email: users.email,
      });

    return createSignedToken({
      subscriberId: subscriber.id,
      email: subscriber.email,
    });
  });
}

function createSignedToken(input: { subscriberId: number; email: string }) {
  const secret = process.env.NEXTAUTH_SECRET?.trim();

  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for unsubscribe token generation.");
  }

  const payload = Buffer.from(
    JSON.stringify({
      subscriberId: input.subscriberId,
      email: input.email.trim().toLowerCase(),
    }),
  ).toString("base64url");

  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}

async function cleanupSubscriberFixture() {
  await withDb(async (db) => {
    const browserUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        or(
          like(users.username, `${BROWSER_PREFIX}%`),
          like(users.email, `${BROWSER_PREFIX}%`),
        ),
      );

    if (browserUsers.length > 0) {
      await db.delete(users).where(
        inArray(
          users.id,
          browserUsers.map((user) => user.id),
        ),
      );
    }
  });
}

async function captureThemeSettings(): Promise<ThemeSettingsSnapshot> {
  return {
    public_layout_width: await getSettingValue("public_layout_width"),
    public_surface_variant: await getSettingValue("public_surface_variant"),
    public_accent_theme: await getSettingValue("public_accent_theme"),
  };
}

async function applyThemeSettings(values: {
  public_layout_width: "narrow" | "default" | "wide";
  public_surface_variant: "soft" | "solid";
  public_accent_theme: "slate" | "blue" | "emerald" | "amber";
}) {
  await restoreSetting("public_layout_width", values.public_layout_width);
  await restoreSetting("public_surface_variant", values.public_surface_variant);
  await restoreSetting("public_accent_theme", values.public_accent_theme);
}

async function cleanupThemeSettings(snapshot: ThemeSettingsSnapshot) {
  await restoreSetting("public_layout_width", snapshot.public_layout_width);
  await restoreSetting("public_surface_variant", snapshot.public_surface_variant);
  await restoreSetting("public_accent_theme", snapshot.public_accent_theme);
}

async function getConfiguredAdminPath() {
  const value = await getSettingValue("admin_path");
  return value?.trim() || "admin";
}

async function getSettingValue(
  key: "admin_path" | "public_layout_width" | "public_surface_variant" | "public_accent_theme",
) {
  return withDb(async (db) => {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    return row?.value ?? null;
  });
}

async function restoreSetting(
  key: "public_layout_width" | "public_surface_variant" | "public_accent_theme",
  value: string | null,
) {
  await withDb(async (db) => {
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

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { ipBlacklist, posts, settings, users } from "../../lib/db/schema";
import { hashPasswordValue } from "../../lib/password-utils";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-ip-blacklist-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("ip blacklist browser regression", () => {
  test("creates and deletes entries from admin, then blocks matching public requests", async ({ page }) => {
    const fixture = await seedIpBlacklistFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(
        `/${fixture.adminPath}/login?redirect=${encodeURIComponent(`/${fixture.adminPath}/ip-blacklist`)}`,
      );
      await page.getByLabel("邮箱").fill(fixture.email);
      await page.getByLabel("密码").fill(fixture.password);
      await page.getByRole("button", { name: "登录后台" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/ip-blacklist$`));
      await expect(page.getByRole("heading", { name: "IP 黑名单" })).toBeVisible();

      await page.getByLabel("IP / CIDR").fill("198.51.100.24");
      await page.getByLabel("原因").fill(fixture.reason);
      await page.getByRole("button", { name: "加入黑名单" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/ip-blacklist\\?created=1$`));
      await expect(page.getByText("黑名单已添加成功。")).toBeVisible();
      await expect(page.getByText("198.51.100.24/32")).toBeVisible();

      const row = page.locator("tr", { has: page.getByText("198.51.100.24/32") });
      await row.getByRole("button", { name: "删除" }).click();
      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/ip-blacklist\\?deleted=1$`));
      await expect(page.getByText("黑名单记录已删除。")).toBeVisible();
      await expect(page.getByText("198.51.100.24/32")).toHaveCount(0);

      await insertBlockingEntries(fixture.userId, fixture.blockingReason);
      const response = await page.goto(`/post/${fixture.slug}`);

      expect(response?.status()).toBe(403);
      await expect(page.locator("body")).toContainText("Forbidden");
    } finally {
      await cleanupIpBlacklistFixture();
    }
  });
});

type IpBlacklistFixture = {
  adminPath: string;
  email: string;
  password: string;
  userId: number;
  slug: string;
  reason: string;
  blockingReason: string;
};

async function seedIpBlacklistFixture(seed: string): Promise<IpBlacklistFixture> {
  await cleanupIpBlacklistFixture();

  const adminPath = await getConfiguredAdminPath();
  const email = `${BROWSER_PREFIX}${seed}@example.com`;
  const username = `${BROWSER_PREFIX}${seed}`;
  const password = `pw-${seed}-${randomUUID().slice(0, 8)}`;
  const reason = `${BROWSER_PREFIX}manual-${seed}`;
  const blockingReason = `${BROWSER_PREFIX}blocking-${seed}`;
  const slug = `${BROWSER_PREFIX}post-${seed}`;

  const userId = await withDb(async (db) => {
    const [editor] = await db
      .insert(users)
      .values({
        email,
        username,
        displayName: "Browser IP Blacklist Editor",
        passwordHash: hashPasswordValue(password),
        role: "editor",
      })
      .returning({ id: users.id });

    await db.insert(posts).values({
      authorId: editor.id,
      title: `Blocked Post ${seed}`,
      slug,
      excerpt: "Blocked post excerpt",
      content: "Blocked post content",
      status: "published",
      publishedAt: new Date("2026-03-27T00:00:00.000Z"),
      updatedAt: new Date("2026-03-27T00:00:00.000Z"),
    });

    return editor.id;
  });

  return {
    adminPath,
    email,
    password,
    userId,
    slug,
    reason,
    blockingReason,
  };
}

async function insertBlockingEntries(userId: number, reason: string) {
  await withDb(async (db) => {
    await db.insert(ipBlacklist).values([
      {
        network: "127.0.0.1/32",
        reason: `${reason}-v4`,
        createdBy: userId,
      },
      {
        network: "::1/128",
        reason: `${reason}-v6`,
        createdBy: userId,
      },
    ]);
  });
}

async function cleanupIpBlacklistFixture() {
  await withDb(async (db) => {
    const browserPosts = await db
      .select({ id: posts.id })
      .from(posts)
      .where(like(posts.slug, `${BROWSER_PREFIX}%`));

    if (browserPosts.length > 0) {
      await db.delete(posts).where(
        inArray(
          posts.id,
          browserPosts.map((post) => post.id),
        ),
      );
    }

    const blacklistRows = await db
      .select({ id: ipBlacklist.id })
      .from(ipBlacklist)
      .where(like(ipBlacklist.reason, `${BROWSER_PREFIX}%`));

    if (blacklistRows.length > 0) {
      await db.delete(ipBlacklist).where(
        inArray(
          ipBlacklist.id,
          blacklistRows.map((row) => row.id),
        ),
      );
    }

    const browserUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.username, `${BROWSER_PREFIX}%`));

    if (browserUsers.length > 0) {
      await db.delete(users).where(
        and(
          inArray(
            users.id,
            browserUsers.map((user) => user.id),
          ),
          like(users.username, `${BROWSER_PREFIX}%`),
        ),
      );
    }
  });
}

async function getConfiguredAdminPath() {
  return withDb(async (db) => {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "admin_path"))
      .limit(1);

    return row?.value?.trim() || "admin";
  });
}

async function withDb<T>(callback: (db: ReturnType<typeof drizzle>) => Promise<T>) {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, {
    schema: { ipBlacklist, posts, settings, users },
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

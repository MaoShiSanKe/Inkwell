import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { eq, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { customPages, friendLinks, settings, users } from "../../lib/db/schema";
import { hashPasswordValue } from "../../lib/password-utils";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-friend-links-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("friend-links browser regression", () => {
  test("creates a published friend link, shows it publicly, keeps route protection, and updates sitemap", async ({ page, request }) => {
    const fixture = await seedFriendLinkFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(
        `/${fixture.adminPath}/login?redirect=${encodeURIComponent(`/${fixture.adminPath}/friend-links/new`)}`,
      );
      await page.getByLabel("邮箱").fill(fixture.email);
      await page.getByLabel("密码").fill(fixture.password);
      await page.getByRole("button", { name: "登录后台" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/friend-links/new$`));
      await page.getByLabel("站点名").fill(fixture.siteName);
      await page.getByLabel("链接地址").fill(fixture.url);
      await page.getByLabel("描述").fill("A browser verified friend link.");
      await page.getByLabel("排序").fill("1");
      await page.getByLabel("状态").selectOption("published");
      await page.getByRole("button", { name: "保存友链" }).click();

      await expect.poll(() => new URL(page.url()).pathname).toBe(`/${fixture.adminPath}/friend-links`);
      await expect.poll(() => new URL(page.url()).searchParams.get("created")).toBe("1");
      await expect.poll(() => fetchCreatedFriendLinkRecord(fixture.siteName)).toEqual({
        siteName: fixture.siteName,
        status: "published",
      });

      await page.goto("/friend-links");
      await expect(page.getByRole("heading", { name: "友情链接" })).toBeVisible();
      await expect(page.getByRole("heading", { name: fixture.siteName })).toBeVisible();
      const card = page.locator("a", { hasText: fixture.siteName });
      await expect(card).toHaveAttribute("href", fixture.url);
      await expect(card).toHaveAttribute("target", "_blank");
      await expect(card).toHaveAttribute("rel", "noopener noreferrer");

      await page.goto(`/${fixture.pageSlug}`);
      await expect(page.getByRole("heading", { name: fixture.pageTitle })).toBeVisible();

      const sitemapResponse = await request.get("/sitemap.xml");
      expect(sitemapResponse.ok()).toBe(true);
      const sitemapBody = await sitemapResponse.text();
      expect(sitemapBody).toContain("/friend-links</loc>");
      expect(sitemapBody).not.toContain(fixture.url);
    } finally {
      await cleanupFriendLinkFixture();
    }
  });
});

type FriendLinkFixture = {
  adminPath: string;
  email: string;
  password: string;
  siteName: string;
  url: string;
  pageSlug: string;
  pageTitle: string;
};

async function seedFriendLinkFixture(seed: string): Promise<FriendLinkFixture> {
  await cleanupFriendLinkFixture();

  const adminPath = await getConfiguredAdminPath();
  const email = `${BROWSER_PREFIX}${seed}@example.com`;
  const username = `${BROWSER_PREFIX}${seed}`;
  const password = `pw-${seed}-${randomUUID().slice(0, 8)}`;
  const siteName = `Browser Friend ${seed}`;
  const url = `https://friend-${seed}.example.com`;
  const pageSlug = `${BROWSER_PREFIX}${seed}`;
  const pageTitle = `Browser Standalone ${seed}`;

  await withDb(async (db) => {
    const [user] = await db
      .insert(users)
      .values({
        email,
        username,
        displayName: "Browser Friend Link Editor",
        passwordHash: hashPasswordValue(password),
        role: "editor",
      })
      .returning({ id: users.id });

    await db.insert(customPages).values({
      authorId: user.id,
      title: pageTitle,
      slug: pageSlug,
      content: "Standalone body",
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    });
  });

  return {
    adminPath,
    email,
    password,
    siteName,
    url,
    pageSlug,
    pageTitle,
  };
}

async function fetchCreatedFriendLinkRecord(expectedSiteName: string) {
  return withDb(async (db) => {
    const [row] = await db
      .select({ siteName: friendLinks.siteName, status: friendLinks.status })
      .from(friendLinks)
      .where(eq(friendLinks.siteName, expectedSiteName))
      .limit(1);

    return row ? { siteName: row.siteName, status: row.status } : null;
  });
}

async function cleanupFriendLinkFixture() {
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

    const browserPages = await db
      .select({ id: customPages.id })
      .from(customPages)
      .where(
        browserUsers.length > 0
          ? inArray(
              customPages.authorId,
              browserUsers.map((user) => user.id),
            )
          : like(customPages.slug, `${BROWSER_PREFIX}%`),
      );

    const browserFriendLinks = await db
      .select({ id: friendLinks.id })
      .from(friendLinks)
      .where(
        browserUsers.length > 0
          ? or(
              like(friendLinks.siteName, `${BROWSER_PREFIX}%`),
              inArray(
                friendLinks.authorId,
                browserUsers.map((user) => user.id),
              ),
            )
          : like(friendLinks.siteName, `${BROWSER_PREFIX}%`),
      );

    if (browserFriendLinks.length > 0) {
      await db.delete(friendLinks).where(
        inArray(
          friendLinks.id,
          browserFriendLinks.map((friendLink) => friendLink.id),
        ),
      );
    }

    if (browserPages.length > 0) {
      await db.delete(customPages).where(
        inArray(
          customPages.id,
          browserPages.map((page) => page.id),
        ),
      );
    }

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
    schema: { customPages, friendLinks, settings, users },
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

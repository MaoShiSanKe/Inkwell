import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { test, expect } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { media, postSlugAliases, posts, settings, users } from "../../lib/db/schema";
import { hashPasswordValue } from "../../lib/password-utils";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-e2e-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("slug-history browser regression", () => {
  test("covers login, slug update, trash, restore, and republish flow", async ({ page }) => {
    const fixture = await seedBrowserFixture(`${Date.now()}`);

    try {
      await page.goto(
        `/${fixture.adminPath}/login?redirect=${encodeURIComponent(`/${fixture.adminPath}/posts/${fixture.postId}`)}`,
      );
      await page.getByLabel("邮箱").fill(fixture.email);
      await page.getByLabel("密码").fill(fixture.password);
      await page.getByRole("button", { name: "登录后台" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/posts/${fixture.postId}$`));
      await expect(page.getByRole("heading", { name: "编辑文章" })).toBeVisible();

      await page.locator('input[name="slug"]').fill(fixture.renamedSlug);
      await expect(page.locator("#slug-warning")).toContainText(`/post/${fixture.currentSlug}`);
      await expect(page.locator("#slug-warning")).toContainText(`/post/${fixture.renamedSlug}`);
      await page.getByRole("button", { name: "保存修改" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/posts\\?updated=1$`));
      await expect(page.getByText("文章已更新成功。")).toBeVisible();

      await page.goto(`/post/${fixture.currentSlug}`);
      await expect(page).toHaveURL(new RegExp(`/post/${fixture.renamedSlug}$`));
      await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();

      await page.goto(`/post/${fixture.renamedSlug}`);
      await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();

      await page.goto(`/post/${fixture.legacySlug}`);
      await expect(page).toHaveURL(new RegExp(`/post/${fixture.renamedSlug}$`));

      await page.goto(`/${fixture.adminPath}/posts/${fixture.postId}`);
      await page.getByRole("button", { name: "移入回收站" }).click();
      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/posts\\?trashed=1$`));
      await expect(page.getByText("文章已移入回收站。")).toBeVisible();

      await page.goto(`/post/${fixture.currentSlug}`);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
      await page.goto(`/post/${fixture.renamedSlug}`);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
      await page.goto(`/post/${fixture.legacySlug}`);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();

      await page.goto(`/${fixture.adminPath}/posts/${fixture.postId}`);
      await page.getByRole("button", { name: "恢复为草稿" }).click();
      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/posts\\?restored=1$`));
      await expect(page.getByText("文章已恢复为草稿。")).toBeVisible();

      await page.goto(`/post/${fixture.currentSlug}`);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
      await page.goto(`/post/${fixture.renamedSlug}`);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
      await page.goto(`/post/${fixture.legacySlug}`);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();

      await page.goto(`/${fixture.adminPath}/posts/${fixture.postId}`);
      await page.locator('select[name="status"]').selectOption("published");
      await page.getByRole("button", { name: "保存修改" }).click();
      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/posts\\?updated=1$`));

      await page.goto(`/post/${fixture.renamedSlug}`);
      await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();
      await page.goto(`/post/${fixture.currentSlug}`);
      await expect(page).toHaveURL(new RegExp(`/post/${fixture.renamedSlug}$`));
      await page.goto(`/post/${fixture.legacySlug}`);
      await expect(page).toHaveURL(new RegExp(`/post/${fixture.renamedSlug}$`));
    } finally {
      await cleanupBrowserFixture();
    }
  });
});

type BrowserFixture = {
  adminPath: string;
  email: string;
  password: string;
  postId: number;
  title: string;
  currentSlug: string;
  renamedSlug: string;
  legacySlug: string;
};

async function seedBrowserFixture(seed: string): Promise<BrowserFixture> {
  const adminPath = await getConfiguredAdminPath();
  const email = `${BROWSER_PREFIX}${seed}@example.com`;
  const username = `${BROWSER_PREFIX}${seed}`;
  const password = `pw-${seed}-${randomUUID().slice(0, 8)}`;
  const title = "Browser E2E Slug History Post";
  const currentSlug = `${BROWSER_PREFIX}current-${seed}`;
  const renamedSlug = `${BROWSER_PREFIX}renamed-${seed}`;
  const legacySlug = `${BROWSER_PREFIX}legacy-${seed}`;

  await cleanupBrowserFixture();

  const postId = await withDb(async (db) => {
    const [editor] = await db
      .insert(users)
      .values({
        email,
        username,
        displayName: "Browser E2E Editor",
        passwordHash: hashPasswordValue(password),
        role: "editor",
      })
      .returning({ id: users.id });

    const [post] = await db
      .insert(posts)
      .values({
        authorId: editor.id,
        title,
        slug: currentSlug,
        excerpt: "Browser E2E excerpt",
        content: "Browser E2E content body",
        status: "published",
        publishedAt: new Date("2026-03-26T22:00:00.000Z"),
        updatedAt: new Date("2026-03-26T22:05:00.000Z"),
      })
      .returning({ id: posts.id });

    await db.insert(postSlugAliases).values({
      postId: post.id,
      slug: legacySlug,
    });

    return post.id;
  });

  return {
    adminPath,
    email,
    password,
    postId,
    title,
    currentSlug,
    renamedSlug,
    legacySlug,
  };
}

async function cleanupBrowserFixture() {
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

    await db.delete(media).where(like(media.altText, `${BROWSER_PREFIX}%`));

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
    schema: { media, postSlugAliases, posts, settings, users },
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

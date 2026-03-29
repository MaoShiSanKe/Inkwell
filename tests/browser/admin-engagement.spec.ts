import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { postLikes, posts, postViews, settings, users } from "../../lib/db/schema";
import { hashPasswordValue } from "../../lib/password-utils";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-admin-engagement-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("admin engagement browser regression", () => {
  test("shows engagement counts in the admin posts list and edit page", async ({ page }) => {
    const fixture = await seedAdminEngagementFixture(
      `${Date.now()}-${randomUUID().slice(0, 8)}`,
    );

    try {
      await page.goto(
        `/${fixture.adminPath}/login?redirect=${encodeURIComponent(`/${fixture.adminPath}/posts`)}`,
      );
      await page.getByLabel("邮箱").fill(fixture.email);
      await page.getByLabel("密码").fill(fixture.password);
      await page.getByRole("button", { name: "登录后台" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/posts$`));
      await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible();

      const postRow = page.locator("tbody tr").filter({
        has: page.getByRole("link", { name: fixture.title }),
      });

      await expect(postRow).toContainText("定时");
      await expect(postRow).toContainText("5");
      await expect(postRow).toContainText("2");

      await postRow.getByRole("link", { name: fixture.title }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/posts/${fixture.postId}$`));
      await expect(page.getByRole("heading", { name: "编辑文章" })).toBeVisible();

      const viewsCard = page.locator("div.rounded-2xl").filter({
        has: page.getByText("Views", { exact: true }),
      });
      const likesCard = page.locator("div.rounded-2xl").filter({
        has: page.getByText("Likes", { exact: true }),
      });

      await expect(viewsCard).toContainText("5");
      await expect(viewsCard).toContainText("当前文章累计浏览量");
      await expect(likesCard).toContainText("2");
      await expect(likesCard).toContainText("当前文章累计点赞数");
    } finally {
      await cleanupAdminEngagementFixture();
    }
  });
});

type AdminEngagementFixture = {
  adminPath: string;
  email: string;
  password: string;
  postId: number;
  title: string;
};

async function seedAdminEngagementFixture(seed: string): Promise<AdminEngagementFixture> {
  const adminPath = await getConfiguredAdminPath();
  const email = `${BROWSER_PREFIX}${seed}@example.com`;
  const username = `${BROWSER_PREFIX}${seed}`;
  const password = `pw-${seed}-${randomUUID().slice(0, 8)}`;
  const title = `Browser Admin Engagement Post ${seed}`;
  const slug = `${BROWSER_PREFIX}post-${seed}`;

  await cleanupAdminEngagementFixture();

  const postId = await withDb(async (db) => {
    const [editor] = await db
      .insert(users)
      .values({
        email,
        username,
        displayName: "Browser Admin Engagement Editor",
        passwordHash: hashPasswordValue(password),
        role: "editor",
      })
      .returning({ id: users.id });

    const [post] = await db
      .insert(posts)
      .values({
        authorId: editor.id,
        title,
        slug,
        excerpt: "Browser admin engagement excerpt",
        content: "Browser admin engagement content",
        status: "scheduled",
        publishedAt: new Date("2026-04-08T08:30:00.000Z"),
        updatedAt: new Date("2026-03-28T16:10:00.000Z"),
      })
      .returning({ id: posts.id });

    await db.insert(postViews).values([
      {
        postId: post.id,
        viewDate: "2026-03-25",
        viewCount: 3,
        updatedAt: new Date("2026-03-28T12:00:00.000Z"),
      },
      {
        postId: post.id,
        viewDate: "2026-03-26",
        viewCount: 2,
        updatedAt: new Date("2026-03-28T12:00:00.000Z"),
      },
    ]);

    await db.insert(postLikes).values([
      {
        postId: post.id,
        ipAddress: "203.0.113.10",
        createdAt: new Date("2026-03-28T12:00:00.000Z"),
      },
      {
        postId: post.id,
        ipAddress: "203.0.113.11",
        createdAt: new Date("2026-03-28T12:00:00.000Z"),
      },
    ]);

    return post.id;
  });

  return {
    adminPath,
    email,
    password,
    postId,
    title,
  };
}

async function cleanupAdminEngagementFixture() {
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
    schema: { postLikes, posts, postViews, settings, users },
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

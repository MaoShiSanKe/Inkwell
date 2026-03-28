import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { postViews, posts, users } from "../../lib/db/schema";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-views-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("post views browser regression", () => {
  test("records views when the public post page is opened repeatedly", async ({ page }) => {
    const fixture = await seedViewsFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(`/post/${fixture.slug}`);
      await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();
      await expect(page.getByText("当前累计 1 次浏览。")).toBeVisible();
      await expect.poll(() => getTotalViewCount(fixture.postId)).toBe(1);

      await page.reload();
      await expect(page.getByText("当前累计 2 次浏览。")).toBeVisible();
      await expect.poll(() => getTotalViewCount(fixture.postId)).toBe(2);
    } finally {
      await cleanupViewsFixture();
    }
  });
});

type ViewsFixture = {
  postId: number;
  slug: string;
  title: string;
};

async function seedViewsFixture(seed: string): Promise<ViewsFixture> {
  const title = `Browser Views Post ${seed}`;
  const slug = `${BROWSER_PREFIX}post-${seed}`;

  await cleanupViewsFixture();

  const postId = await withDb(async (db) => {
    const [author] = await db
      .insert(users)
      .values({
        email: `${BROWSER_PREFIX}${seed}@example.com`,
        username: `${BROWSER_PREFIX}${seed}`,
        displayName: "Browser Views Author",
        passwordHash: "hashed-password",
        role: "author",
      })
      .returning({ id: users.id });

    const [post] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        title,
        slug,
        excerpt: "Browser views excerpt",
        content: "Browser views content body",
        status: "published",
        publishedAt: new Date("2026-03-27T10:00:00.000Z"),
        updatedAt: new Date("2026-03-27T10:05:00.000Z"),
      })
      .returning({ id: posts.id });

    return post.id;
  });

  return {
    postId,
    slug,
    title,
  };
}

async function cleanupViewsFixture() {
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

async function getTotalViewCount(postId: number) {
  return withDb(async (db) => {
    const rows = await db
      .select({ value: postViews.viewCount })
      .from(postViews)
      .where(eq(postViews.postId, postId));

    return rows.reduce((total, row) => total + row.value, 0);
  });
}

async function withDb<T>(callback: (db: ReturnType<typeof drizzle>) => Promise<T>) {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, {
    schema: { postViews, posts, users },
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

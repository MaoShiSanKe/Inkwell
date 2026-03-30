import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { categories, postTags, posts, tags, users } from "../../lib/db/schema";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-rss-discovery-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("rss discovery browser regression", () => {
  test("exposes RSS alternate links on homepage, category, and tag pages", async ({ page }) => {
    const fixture = await seedRssDiscoveryFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "最新文章" })).toBeVisible();
      await expectRssAlternatePathname(page, "/rss.xml");

      await page.goto(`/category/${fixture.categorySlug}`);
      await expect(page.getByRole("heading", { name: fixture.categoryName })).toBeVisible();
      await expectRssAlternatePathname(page, `/category/${fixture.categorySlug}/rss.xml`);

      await page.goto(`/tag/${fixture.tagSlug}`);
      await expect(page.getByRole("heading", { name: fixture.tagName })).toBeVisible();
      await expectRssAlternatePathname(page, `/tag/${fixture.tagSlug}/rss.xml`);
    } finally {
      await cleanupRssDiscoveryFixture();
    }
  });
});

type RssDiscoveryFixture = {
  categoryName: string;
  categorySlug: string;
  tagName: string;
  tagSlug: string;
};

async function seedRssDiscoveryFixture(seed: string): Promise<RssDiscoveryFixture> {
  const categoryName = `RSS Discovery Category ${seed}`;
  const categorySlug = `${BROWSER_PREFIX}category-${seed}`;
  const tagName = `RSS Discovery Tag ${seed}`;
  const tagSlug = `${BROWSER_PREFIX}tag-${seed}`;

  await cleanupRssDiscoveryFixture();

  await withDb(async (db) => {
    const [author] = await db
      .insert(users)
      .values({
        email: `${BROWSER_PREFIX}${seed}@example.com`,
        username: `${BROWSER_PREFIX}${seed}`,
        displayName: "RSS Discovery Author",
        passwordHash: "hashed-password",
        role: "author",
      })
      .returning({ id: users.id });

    const [category] = await db
      .insert(categories)
      .values({
        name: categoryName,
        slug: categorySlug,
        description: `Description for ${categoryName}`,
      })
      .returning({ id: categories.id });

    const [tag] = await db
      .insert(tags)
      .values({
        name: tagName,
        slug: tagSlug,
        description: `Description for ${tagName}`,
      })
      .returning({ id: tags.id });

    const [post] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        categoryId: category.id,
        title: `RSS Discovery Post ${seed}`,
        slug: `${BROWSER_PREFIX}post-${seed}`,
        excerpt: "RSS discovery excerpt",
        content: "RSS discovery content",
        status: "published",
        publishedAt: new Date("2026-03-30T12:00:00.000Z"),
        updatedAt: new Date("2026-03-30T12:10:00.000Z"),
      })
      .returning({ id: posts.id });

    await db.insert(postTags).values({
      postId: post.id,
      tagId: tag.id,
    });
  });

  return {
    categoryName,
    categorySlug,
    tagName,
    tagSlug,
  };
}

async function cleanupRssDiscoveryFixture() {
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

    await db.delete(tags).where(like(tags.slug, `${BROWSER_PREFIX}%`));
    await db.delete(categories).where(like(categories.slug, `${BROWSER_PREFIX}%`));

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

async function withDb<T>(callback: (db: ReturnType<typeof drizzle>) => Promise<T>) {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, {
    schema: { categories, postTags, posts, tags, users },
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

async function expectRssAlternatePathname(page: Page, expectedPathname: string) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const href = document
          .querySelector('link[rel="alternate"][type="application/rss+xml"]')
          ?.getAttribute("href");

        if (!href) {
          return null;
        }

        return new URL(href, window.location.href).pathname;
      }),
    )
    .toBe(expectedPathname);
}

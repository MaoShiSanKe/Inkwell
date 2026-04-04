import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { categories, postTags, posts, tags, users } from "../../lib/db/schema";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-taxonomy-rss-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("taxonomy rss browser regression", () => {
  test("serves category and tag RSS feeds for matching published posts only", async ({ page, request }) => {
    const fixture = await seedTaxonomyRssFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(`/category/${fixture.categorySlug}`);
      await expect(page.getByRole("heading", { name: fixture.categoryName })).toBeVisible();

      const categoryResponse = await request.get(`/category/${fixture.categorySlug}/rss.xml`);
      expect(categoryResponse.ok()).toBe(true);
      expect(categoryResponse.headers()["content-type"]).toContain("application/xml");
      const categoryBody = await categoryResponse.text();
      expect(categoryBody).toContain("<rss version=\"2.0\">");
      expect(categoryBody).toContain(`<title>${fixture.categoryName} 分类 RSS | Inkwell</title>`);
      expect(categoryBody).toContain(`<link>/category/${fixture.categorySlug}</link>`);
      expect(categoryBody).toContain(`<link>/post/${fixture.categoryPostSlug}</link>`);
      expect(categoryBody).not.toContain(fixture.hiddenCategoryPostSlug);
      expect(categoryBody).not.toContain(fixture.otherPublishedPostSlug);

      await page.goto(`/tag/${fixture.tagSlug}`);
      await expect(page.getByRole("heading", { name: fixture.tagName })).toBeVisible();

      const tagResponse = await request.get(`/tag/${fixture.tagSlug}/rss.xml`);
      expect(tagResponse.ok()).toBe(true);
      expect(tagResponse.headers()["content-type"]).toContain("application/xml");
      const tagBody = await tagResponse.text();
      expect(tagBody).toContain("<rss version=\"2.0\">");
      expect(tagBody).toContain(`<title>${fixture.tagName} 标签 RSS | Inkwell</title>`);
      expect(tagBody).toContain(`<link>/tag/${fixture.tagSlug}</link>`);
      expect(tagBody).toContain(`<link>/post/${fixture.tagPostSlug}</link>`);
      expect(tagBody).not.toContain(fixture.hiddenTagPostSlug);
      expect(tagBody).not.toContain(fixture.otherPublishedPostSlug);
    } finally {
      await cleanupTaxonomyRssFixture();
    }
  });
});

type TaxonomyRssFixture = {
  categoryName: string;
  categorySlug: string;
  tagName: string;
  tagSlug: string;
  categoryPostSlug: string;
  hiddenCategoryPostSlug: string;
  tagPostSlug: string;
  hiddenTagPostSlug: string;
  otherPublishedPostSlug: string;
};

async function seedTaxonomyRssFixture(seed: string): Promise<TaxonomyRssFixture> {
  const categoryName = `RSS Category ${seed}`;
  const categorySlug = `${BROWSER_PREFIX}category-${seed}`;
  const tagName = `RSS Tag ${seed}`;
  const tagSlug = `${BROWSER_PREFIX}tag-${seed}`;
  const categoryPostSlug = `${BROWSER_PREFIX}category-post-${seed}`;
  const hiddenCategoryPostSlug = `${BROWSER_PREFIX}category-draft-${seed}`;
  const tagPostSlug = `${BROWSER_PREFIX}tag-post-${seed}`;
  const hiddenTagPostSlug = `${BROWSER_PREFIX}tag-draft-${seed}`;
  const otherPublishedPostSlug = `${BROWSER_PREFIX}other-post-${seed}`;

  await cleanupTaxonomyRssFixture();

  await withDb(async (db) => {
    const [author] = await db
      .insert(users)
      .values({
        email: `${BROWSER_PREFIX}${seed}@example.com`,
        username: `${BROWSER_PREFIX}${seed}`,
        displayName: "RSS Browser Author",
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

    const [otherCategory] = await db
      .insert(categories)
      .values({
        name: `Other Category ${seed}`,
        slug: `${BROWSER_PREFIX}other-category-${seed}`,
        description: `Other category ${seed}`,
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

    const [otherTag] = await db
      .insert(tags)
      .values({
        name: `Other Tag ${seed}`,
        slug: `${BROWSER_PREFIX}other-tag-${seed}`,
        description: `Other tag ${seed}`,
      })
      .returning({ id: tags.id });

    const [categoryPost] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        categoryId: category.id,
        title: `Category RSS Post ${seed}`,
        slug: categoryPostSlug,
        excerpt: "Category RSS excerpt",
        content: "Category RSS content",
        status: "published",
        publishedAt: new Date("2026-03-30T08:00:00.000Z"),
        updatedAt: new Date("2026-03-30T08:10:00.000Z"),
      })
      .returning({ id: posts.id });

    await db.insert(posts).values({
      authorId: author.id,
      categoryId: category.id,
      title: `Category Draft ${seed}`,
      slug: hiddenCategoryPostSlug,
      excerpt: "Hidden category excerpt",
      content: "Hidden category content",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-03-30T08:20:00.000Z"),
    });

    const [tagPost] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        categoryId: otherCategory.id,
        title: `Tag RSS Post ${seed}`,
        slug: tagPostSlug,
        excerpt: "Tag RSS excerpt",
        content: "Tag RSS content",
        status: "published",
        publishedAt: new Date("2026-03-30T09:00:00.000Z"),
        updatedAt: new Date("2026-03-30T09:10:00.000Z"),
      })
      .returning({ id: posts.id });

    const [hiddenTagPost] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        categoryId: otherCategory.id,
        title: `Tag Draft ${seed}`,
        slug: hiddenTagPostSlug,
        excerpt: "Hidden tag excerpt",
        content: "Hidden tag content",
        status: "draft",
        publishedAt: null,
        updatedAt: new Date("2026-03-30T09:20:00.000Z"),
      })
      .returning({ id: posts.id });

    const [otherPublishedPost] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        categoryId: otherCategory.id,
        title: `Other Published ${seed}`,
        slug: otherPublishedPostSlug,
        excerpt: "Other published excerpt",
        content: "Other published content",
        status: "published",
        publishedAt: new Date("2026-03-30T10:00:00.000Z"),
        updatedAt: new Date("2026-03-30T10:10:00.000Z"),
      })
      .returning({ id: posts.id });

    await db.insert(postTags).values([
      { postId: tagPost.id, tagId: tag.id },
      { postId: hiddenTagPost.id, tagId: tag.id },
      { postId: otherPublishedPost.id, tagId: otherTag.id },
      { postId: categoryPost.id, tagId: otherTag.id },
    ]);
  });

  return {
    categoryName,
    categorySlug,
    tagName,
    tagSlug,
    categoryPostSlug,
    hiddenCategoryPostSlug,
    tagPostSlug,
    hiddenTagPostSlug,
    otherPublishedPostSlug,
  };
}

async function cleanupTaxonomyRssFixture() {
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

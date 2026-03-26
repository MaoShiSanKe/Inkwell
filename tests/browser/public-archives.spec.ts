import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { categories, postSeries, postTags, posts, series, tags, users } from "../../lib/db/schema";

loadEnv({ path: ".env.local" });

const BROWSER_PREFIX = "integration-browser-archives-";
const databaseUrl = getDatabaseUrl();

test.describe("public archive pages", () => {
  test("show published posts and hide drafts across homepage, category, tag, and series routes", async ({ page }) => {
    const fixture = await seedArchiveFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "最新文章" })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toBeVisible();
      await expect(page.getByText(fixture.draftTitle)).toHaveCount(0);

      await page.goto(`/category/${fixture.categorySlug}`);
      await expect(page.getByRole("heading", { name: fixture.categoryName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toBeVisible();
      await expect(page.getByText(fixture.draftTitle)).toHaveCount(0);

      await page.goto(`/tag/${fixture.tagSlug}`);
      await expect(page.getByRole("heading", { name: fixture.tagName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toBeVisible();
      await expect(page.getByText(fixture.draftTitle)).toHaveCount(0);

      await page.goto(`/series/${fixture.seriesSlug}`);
      await expect(page.getByRole("heading", { name: fixture.seriesName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toBeVisible();
      await expect(page.getByText(fixture.draftTitle)).toHaveCount(0);

      await page.goto(`/category/${fixture.missingCategorySlug}`);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();

      await page.goto(`/tag/${fixture.missingTagSlug}`);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();

      await page.goto(`/series/${fixture.missingSeriesSlug}`);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    } finally {
      await cleanupArchiveFixture();
    }
  });
});

type ArchiveFixture = {
  categoryName: string;
  categorySlug: string;
  tagName: string;
  tagSlug: string;
  seriesName: string;
  seriesSlug: string;
  publishedTitle: string;
  draftTitle: string;
  missingCategorySlug: string;
  missingTagSlug: string;
  missingSeriesSlug: string;
};

async function seedArchiveFixture(seed: string): Promise<ArchiveFixture> {
  const categoryName = `Archive Category ${seed}`;
  const categorySlug = `${BROWSER_PREFIX}category-${seed}`;
  const tagName = `Archive Tag ${seed}`;
  const tagSlug = `${BROWSER_PREFIX}tag-${seed}`;
  const seriesName = `Archive Series ${seed}`;
  const seriesSlug = `${BROWSER_PREFIX}series-${seed}`;
  const publishedTitle = `Archive Published ${seed}`;
  const draftTitle = `Archive Draft ${seed}`;
  const missingCategorySlug = `${BROWSER_PREFIX}missing-category-${seed}`;
  const missingTagSlug = `${BROWSER_PREFIX}missing-tag-${seed}`;
  const missingSeriesSlug = `${BROWSER_PREFIX}missing-series-${seed}`;

  await cleanupArchiveFixture();

  await withDb(async (db) => {
    const [author] = await db
      .insert(users)
      .values({
        email: `${BROWSER_PREFIX}${seed}@example.com`,
        username: `${BROWSER_PREFIX}${seed}`,
        displayName: `Archive Author ${seed}`,
        passwordHash: "hashed-password",
        role: "author",
      })
      .returning({ id: users.id });

    const [category] = await db
      .insert(categories)
      .values({
        name: categoryName,
        slug: categorySlug,
        description: `Archive category description ${seed}`,
      })
      .returning({ id: categories.id });

    const [tag] = await db
      .insert(tags)
      .values({
        name: tagName,
        slug: tagSlug,
        description: `Archive tag description ${seed}`,
      })
      .returning({ id: tags.id });

    const [seriesItem] = await db
      .insert(series)
      .values({
        name: seriesName,
        slug: seriesSlug,
        description: `Archive series description ${seed}`,
      })
      .returning({ id: series.id });

    const [publishedPost] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        categoryId: category.id,
        title: publishedTitle,
        slug: `${BROWSER_PREFIX}published-${seed}`,
        excerpt: "Archive published excerpt",
        content: "Archive published content",
        status: "published",
        publishedAt: new Date("2026-03-26T23:00:00.000Z"),
        updatedAt: new Date("2026-03-26T23:05:00.000Z"),
      })
      .returning({ id: posts.id });

    const [draftPost] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        categoryId: category.id,
        title: draftTitle,
        slug: `${BROWSER_PREFIX}draft-${seed}`,
        excerpt: "Archive draft excerpt",
        content: "Archive draft content",
        status: "draft",
        publishedAt: null,
        updatedAt: new Date("2026-03-26T23:10:00.000Z"),
      })
      .returning({ id: posts.id });

    await db.insert(postTags).values([
      {
        postId: publishedPost.id,
        tagId: tag.id,
      },
      {
        postId: draftPost.id,
        tagId: tag.id,
      },
    ]);

    await db.insert(postSeries).values([
      {
        postId: publishedPost.id,
        seriesId: seriesItem.id,
        orderIndex: 0,
      },
      {
        postId: draftPost.id,
        seriesId: seriesItem.id,
        orderIndex: 1,
      },
    ]);
  });

  return {
    categoryName,
    categorySlug,
    tagName,
    tagSlug,
    seriesName,
    seriesSlug,
    publishedTitle,
    draftTitle,
    missingCategorySlug,
    missingTagSlug,
    missingSeriesSlug,
  };
}

async function cleanupArchiveFixture() {
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

    await db.delete(categories).where(like(categories.slug, `${BROWSER_PREFIX}%`));
    await db.delete(series).where(like(series.slug, `${BROWSER_PREFIX}%`));
    await db.delete(tags).where(like(tags.slug, `${BROWSER_PREFIX}%`));

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
    schema: { categories, postSeries, postTags, posts, series, tags, users },
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

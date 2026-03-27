import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { categories, postTags, posts, tags, users } from "../../lib/db/schema";

loadEnv({ path: ".env.local" });

const BROWSER_PREFIX = "integration-browser-related-posts-";
const databaseUrl = getDatabaseUrl();

test.describe("related posts browser regression", () => {
  test("shows related published posts on the public post page", async ({ page }) => {
    const fixture = await seedRelatedPostsFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(`/post/${fixture.primarySlug}`);
      await expect(page.getByRole("heading", { name: fixture.primaryTitle })).toBeVisible();
      await expect(page.getByRole("heading", { name: "相关文章" })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.relatedTitle })).toBeVisible();
      await expect(page.getByText(fixture.unrelatedTitle)).toHaveCount(0);
    } finally {
      await cleanupRelatedPostsFixture();
    }
  });
});

type RelatedPostsFixture = {
  primarySlug: string;
  primaryTitle: string;
  relatedTitle: string;
  unrelatedTitle: string;
};

async function seedRelatedPostsFixture(seed: string): Promise<RelatedPostsFixture> {
  const primaryTitle = `Primary Post ${seed}`;
  const primarySlug = `${BROWSER_PREFIX}primary-${seed}`;
  const relatedTitle = `Related Post ${seed}`;
  const unrelatedTitle = `Unrelated Post ${seed}`;

  await cleanupRelatedPostsFixture();

  await withDb(async (db) => {
    const [author] = await db
      .insert(users)
      .values({
        email: `${BROWSER_PREFIX}${seed}@example.com`,
        username: `${BROWSER_PREFIX}${seed}`,
        displayName: "Related Posts Author",
        passwordHash: "hashed-password",
        role: "author",
      })
      .returning({ id: users.id });

    const [category] = await db
      .insert(categories)
      .values({
        name: `Related Category ${seed}`,
        slug: `${BROWSER_PREFIX}category-${seed}`,
        description: `Related category ${seed}`,
      })
      .returning({ id: categories.id });

    const [sharedTag] = await db
      .insert(tags)
      .values({
        name: `Shared Tag ${seed}`,
        slug: `${BROWSER_PREFIX}shared-tag-${seed}`,
        description: `Shared tag ${seed}`,
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

    const [primaryPost] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        categoryId: category.id,
        title: primaryTitle,
        slug: primarySlug,
        excerpt: "Primary excerpt",
        content: "Primary content",
        status: "published",
        publishedAt: new Date("2026-03-28T08:00:00.000Z"),
        updatedAt: new Date("2026-03-28T08:10:00.000Z"),
      })
      .returning({ id: posts.id });

    const [relatedPost] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        categoryId: category.id,
        title: relatedTitle,
        slug: `${BROWSER_PREFIX}related-${seed}`,
        excerpt: "Related excerpt",
        content: "Related content",
        status: "published",
        publishedAt: new Date("2026-03-28T07:00:00.000Z"),
        updatedAt: new Date("2026-03-28T07:10:00.000Z"),
      })
      .returning({ id: posts.id });

    const [unrelatedPost] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        categoryId: null,
        title: unrelatedTitle,
        slug: `${BROWSER_PREFIX}unrelated-${seed}`,
        excerpt: "Unrelated excerpt",
        content: "Unrelated content",
        status: "published",
        publishedAt: new Date("2026-03-28T06:00:00.000Z"),
        updatedAt: new Date("2026-03-28T06:10:00.000Z"),
      })
      .returning({ id: posts.id });

    await db.insert(postTags).values([
      { postId: primaryPost.id, tagId: sharedTag.id },
      { postId: relatedPost.id, tagId: sharedTag.id },
      { postId: unrelatedPost.id, tagId: otherTag.id },
    ]);
  });

  return {
    primarySlug,
    primaryTitle,
    relatedTitle,
    unrelatedTitle,
  };
}

async function cleanupRelatedPostsFixture() {
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

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;

  if (!value) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return value;
}

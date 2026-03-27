import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { postTags, posts, tags, users } from "../../lib/db/schema";

loadEnv({ path: ".env.local" });

const BROWSER_PREFIX = "integration-browser-post-tags-";
const databaseUrl = getDatabaseUrl();

test.describe("post tags browser regression", () => {
  test("shows clickable tag links on the public post page and navigates to the tag archive", async ({ page }) => {
    const fixture = await seedPostTagsFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(`/post/${fixture.postSlug}`);

      await expect(page.getByRole("heading", { name: fixture.postTitle })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.primaryTagName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.secondaryTagName })).toBeVisible();

      await page.getByRole("link", { name: fixture.primaryTagName }).click();

      await expect(page).toHaveURL(new RegExp(`/tag/${fixture.primaryTagSlug}$`));
      await expect(page.getByRole("heading", { name: fixture.primaryTagName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.postTitle })).toBeVisible();
    } finally {
      await cleanupPostTagsFixture();
    }
  });
});

type PostTagsFixture = {
  postSlug: string;
  postTitle: string;
  primaryTagName: string;
  primaryTagSlug: string;
  secondaryTagName: string;
};

async function seedPostTagsFixture(seed: string): Promise<PostTagsFixture> {
  const postTitle = `Tagged Post ${seed}`;
  const postSlug = `${BROWSER_PREFIX}post-${seed}`;
  const primaryTagName = `Primary Tag ${seed}`;
  const primaryTagSlug = `${BROWSER_PREFIX}primary-${seed}`;
  const secondaryTagName = `Secondary Tag ${seed}`;
  const secondaryTagSlug = `${BROWSER_PREFIX}secondary-${seed}`;

  await cleanupPostTagsFixture();

  await withDb(async (db) => {
    const [author] = await db
      .insert(users)
      .values({
        email: `${BROWSER_PREFIX}${seed}@example.com`,
        username: `${BROWSER_PREFIX}${seed}`,
        displayName: "Post Tags Author",
        passwordHash: "hashed-password",
        role: "author",
      })
      .returning({ id: users.id });

    const [primaryTag] = await db
      .insert(tags)
      .values({
        name: primaryTagName,
        slug: primaryTagSlug,
        description: `Primary tag ${seed}`,
      })
      .returning({ id: tags.id });

    const [secondaryTag] = await db
      .insert(tags)
      .values({
        name: secondaryTagName,
        slug: secondaryTagSlug,
        description: `Secondary tag ${seed}`,
      })
      .returning({ id: tags.id });

    const [post] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        categoryId: null,
        title: postTitle,
        slug: postSlug,
        excerpt: "Tagged excerpt",
        content: "Tagged content",
        status: "published",
        publishedAt: new Date("2026-03-28T09:00:00.000Z"),
        updatedAt: new Date("2026-03-28T09:05:00.000Z"),
      })
      .returning({ id: posts.id });

    await db.insert(postTags).values([
      { postId: post.id, tagId: primaryTag.id },
      { postId: post.id, tagId: secondaryTag.id },
    ]);
  });

  return {
    postSlug,
    postTitle,
    primaryTagName,
    primaryTagSlug,
    secondaryTagName,
  };
}

async function cleanupPostTagsFixture() {
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
    schema: { postTags, posts, tags, users },
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

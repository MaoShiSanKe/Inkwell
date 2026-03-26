import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { postLikes, posts, users } from "../../lib/db/schema";

loadEnv({ path: ".env.local" });

const BROWSER_PREFIX = "integration-browser-likes-";
const databaseUrl = getDatabaseUrl();

test.describe("post likes browser regression", () => {
  test("likes a published post once and keeps count stable on repeat click", async ({ page }) => {
    const fixture = await seedLikesFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(`/post/${fixture.slug}`);
      await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();
      await expect(page.getByText("当前共有 0 次点赞。")).toBeVisible();

      await page.getByRole("button", { name: "点赞" }).click();
      await expect(page.getByText("点赞成功。")).toBeVisible();
      await expect(page.getByText("当前共有 1 次点赞。")).toBeVisible();
      await expect.poll(() => getLikeCount(fixture.postId)).toBe(1);

      await page.getByRole("button", { name: "点赞" }).click();
      await expect(page.getByText("你已经点过赞了。")).toBeVisible();
      await expect(page.getByText("当前共有 1 次点赞。")).toBeVisible();
      await expect.poll(() => getLikeCount(fixture.postId)).toBe(1);
    } finally {
      await cleanupLikesFixture();
    }
  });
});

type LikesFixture = {
  postId: number;
  slug: string;
  title: string;
};

async function seedLikesFixture(seed: string): Promise<LikesFixture> {
  const title = `Browser Likes Post ${seed}`;
  const slug = `${BROWSER_PREFIX}post-${seed}`;

  await cleanupLikesFixture();

  const postId = await withDb(async (db) => {
    const [author] = await db
      .insert(users)
      .values({
        email: `${BROWSER_PREFIX}${seed}@example.com`,
        username: `${BROWSER_PREFIX}${seed}`,
        displayName: "Browser Likes Author",
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
        excerpt: "Browser likes excerpt",
        content: "Browser likes content body",
        status: "published",
        publishedAt: new Date("2026-03-27T05:00:00.000Z"),
        updatedAt: new Date("2026-03-27T05:05:00.000Z"),
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

async function cleanupLikesFixture() {
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
        inArray(
          users.id,
          browserUsers.map((user) => user.id),
        ),
      );
    }
  });
}

async function getLikeCount(postId: number) {
  return withDb(async (db) => {
    const rows = await db
      .select({ postId: postLikes.postId })
      .from(postLikes)
      .where(eq(postLikes.postId, postId));

    return rows.length;
  });
}

async function withDb<T>(callback: (db: ReturnType<typeof drizzle>) => Promise<T>) {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, {
    schema: { postLikes, posts, users },
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

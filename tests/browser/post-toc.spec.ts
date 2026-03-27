import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { posts, users } from "../../lib/db/schema";

loadEnv({ path: ".env.local" });

const BROWSER_PREFIX = "integration-browser-post-toc-";
const databaseUrl = getDatabaseUrl();

test.describe("post toc browser regression", () => {
  test("shows toc links and jumps to the matching heading", async ({ page }) => {
    const fixture = await seedPostTocFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(`/post/${fixture.slug}`);
      await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "文章目录" })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.sectionHeading })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.subsectionHeading })).toBeVisible();

      await page.getByRole("link", { name: fixture.subsectionHeading }).click();

      await expect.poll(() => new URL(page.url()).hash).toBe(`#${fixture.subsectionId}`);
      await expect(page.locator(`#${fixture.subsectionId}`)).toBeInViewport();
    } finally {
      await cleanupPostTocFixture();
    }
  });

  test("keeps the toc usable on narrow screens", async ({ page }) => {
    const fixture = await seedPostTocFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/post/${fixture.slug}`);

      await expect(page.getByRole("navigation", { name: "文章目录" })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.sectionHeading })).toBeVisible();

      await page.getByRole("link", { name: fixture.sectionHeading }).click();

      await expect.poll(() => new URL(page.url()).hash).toBe(`#${fixture.sectionId}`);
      await expect(page.locator(`#${fixture.sectionId}`)).toBeInViewport();
    } finally {
      await cleanupPostTocFixture();
    }
  });
});

type PostTocFixture = {
  slug: string;
  title: string;
  sectionHeading: string;
  sectionId: string;
  subsectionHeading: string;
  subsectionId: string;
};

async function seedPostTocFixture(seed: string): Promise<PostTocFixture> {
  const title = `Browser TOC Post ${seed}`;
  const slug = `${BROWSER_PREFIX}post-${seed}`;
  const sectionHeading = "Getting Started";
  const sectionId = "getting-started";
  const subsectionHeading = "Implementation Details";
  const subsectionId = "implementation-details";

  await cleanupPostTocFixture();

  await withDb(async (db) => {
    const [author] = await db
      .insert(users)
      .values({
        email: `${BROWSER_PREFIX}${seed}@example.com`,
        username: `${BROWSER_PREFIX}${seed}`,
        displayName: "Browser TOC Author",
        passwordHash: "hashed-password",
        role: "author",
      })
      .returning({ id: users.id });

    await db.insert(posts).values({
      authorId: author.id,
      title,
      slug,
      excerpt: "Browser TOC excerpt",
      content: [
        "这是一段用于验证目录渲染的正文。",
        "",
        `## ${sectionHeading}`,
        "这里是一级目录对应的正文内容。",
        "",
        `### ${subsectionHeading}`,
        "这里是二级目录对应的正文内容。",
      ].join("\n"),
      status: "published",
      publishedAt: new Date("2026-03-28T09:00:00.000Z"),
      updatedAt: new Date("2026-03-28T09:05:00.000Z"),
    });
  });

  return {
    slug,
    title,
    sectionHeading,
    sectionId,
    subsectionHeading,
    subsectionId,
  };
}

async function cleanupPostTocFixture() {
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

async function withDb<T>(callback: (db: ReturnType<typeof drizzle>) => Promise<T>) {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, {
    schema: { posts, users },
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

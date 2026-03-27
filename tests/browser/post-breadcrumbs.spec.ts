import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { categories, postMeta, posts, users } from "../../lib/db/schema";

loadEnv({ path: ".env.local" });

const BROWSER_PREFIX = "integration-browser-post-breadcrumbs-";
const databaseUrl = getDatabaseUrl();

test.describe("post breadcrumbs browser regression", () => {
  test("shows hierarchical breadcrumbs and links to the category archive", async ({ page }) => {
    const fixture = await seedPostBreadcrumbsFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(`/post/${fixture.slug}`);

      await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "面包屑" })).toBeVisible();
      await expect(page.getByRole("link", { name: "首页" })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.parentCategoryName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.childCategoryName })).toBeVisible();
      await expect(page.locator('[aria-current="page"]')).toHaveText(fixture.title);

      await page.getByRole("link", { name: fixture.childCategoryName }).click();

      await expect(page).toHaveURL(new RegExp(`/category/${fixture.childCategorySlug}$`));
      await expect(page.getByRole("heading", { name: fixture.childCategoryName })).toBeVisible();
    } finally {
      await cleanupPostBreadcrumbsFixture();
    }
  });
});

type PostBreadcrumbsFixture = {
  slug: string;
  title: string;
  parentCategoryName: string;
  parentCategorySlug: string;
  childCategoryName: string;
  childCategorySlug: string;
};

async function seedPostBreadcrumbsFixture(seed: string): Promise<PostBreadcrumbsFixture> {
  const title = `Breadcrumb Post ${seed}`;
  const slug = `${BROWSER_PREFIX}post-${seed}`;
  const parentCategoryName = `Breadcrumb Parent ${seed}`;
  const parentCategorySlug = `${BROWSER_PREFIX}parent-${seed}`;
  const childCategoryName = `Breadcrumb Child ${seed}`;
  const childCategorySlug = `${BROWSER_PREFIX}child-${seed}`;

  await cleanupPostBreadcrumbsFixture();

  await withDb(async (db) => {
    const [author] = await db
      .insert(users)
      .values({
        email: `${BROWSER_PREFIX}${seed}@example.com`,
        username: `${BROWSER_PREFIX}${seed}`,
        displayName: "Breadcrumb Author",
        passwordHash: "hashed-password",
        role: "author",
      })
      .returning({ id: users.id });

    const [parentCategory] = await db
      .insert(categories)
      .values({
        name: parentCategoryName,
        slug: parentCategorySlug,
        description: `Parent category ${seed}`,
      })
      .returning({ id: categories.id });

    const [childCategory] = await db
      .insert(categories)
      .values({
        name: childCategoryName,
        slug: childCategorySlug,
        description: `Child category ${seed}`,
        parentId: parentCategory.id,
      })
      .returning({ id: categories.id });

    const [post] = await db
      .insert(posts)
      .values({
        authorId: author.id,
        categoryId: childCategory.id,
        title,
        slug,
        excerpt: "Breadcrumb excerpt",
        content: "Breadcrumb content",
        status: "published",
        publishedAt: new Date("2026-03-28T10:00:00.000Z"),
        updatedAt: new Date("2026-03-28T10:05:00.000Z"),
      })
      .returning({ id: posts.id });

    await db.insert(postMeta).values({
      postId: post.id,
      breadcrumbEnabled: true,
      noindex: false,
      nofollow: false,
    });
  });

  return {
    slug,
    title,
    parentCategoryName,
    parentCategorySlug,
    childCategoryName,
    childCategorySlug,
  };
}

async function cleanupPostBreadcrumbsFixture() {
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
    schema: { categories, postMeta, posts, users },
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

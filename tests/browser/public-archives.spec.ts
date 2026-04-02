import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { categories, postSeries, postTags, posts, series, settings, tags, users } from "../../lib/db/schema";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-archives-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

type ThemeSettingsSnapshot = {
  public_layout_width: string | null;
  public_surface_variant: string | null;
  public_accent_theme: string | null;
};

test.describe("public archive pages", () => {
  test("show published posts, author links, themed empty states, and hide drafts across homepage, category, tag, and series routes", async ({ page }) => {
    const fixture = await seedArchiveFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);
    const originalThemeSettings = await captureThemeSettings();

    try {
      await applyThemeSettings({
        public_layout_width: "wide",
        public_surface_variant: "solid",
        public_accent_theme: "blue",
      });

      await page.goto("/");
      await expect(page.getByRole("heading", { name: "最新文章" })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toBeVisible();
      await expect(page.getByRole("link", { name: `作者：${fixture.authorName}` })).toBeVisible();
      await expect(page.getByText(fixture.draftTitle)).toHaveCount(0);

      await page.getByRole("link", { name: `作者：${fixture.authorName}` }).click();
      await expect(page).toHaveURL(new RegExp(`/author/${fixture.authorSlug}$`));
      await expect(page.getByRole("heading", { name: fixture.authorName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toBeVisible();
      await expect(page.getByText(fixture.draftTitle)).toHaveCount(0);

      await page.goto(`/category/${fixture.categorySlug}`);
      await expect(page.getByRole("heading", { name: fixture.categoryName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toBeVisible();
      await expect(page.getByRole("link", { name: `作者：${fixture.authorName}` })).toBeVisible();
      await expect(page.getByText(fixture.draftTitle)).toHaveCount(0);

      await page.getByRole("link", { name: `作者：${fixture.authorName}` }).click();
      await expect(page).toHaveURL(new RegExp(`/author/${fixture.authorSlug}$`));
      await expect(page.getByRole("heading", { name: fixture.authorName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toBeVisible();
      await expect(page.getByText(fixture.draftTitle)).toHaveCount(0);

      await page.goto(`/tag/${fixture.tagSlug}`);
      await expect(page.getByRole("heading", { name: fixture.tagName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toBeVisible();
      await expect(page.getByRole("link", { name: `作者：${fixture.authorName}` })).toBeVisible();
      await expect(page.getByText(fixture.draftTitle)).toHaveCount(0);

      await page.getByRole("link", { name: `作者：${fixture.authorName}` }).click();
      await expect(page).toHaveURL(new RegExp(`/author/${fixture.authorSlug}$`));
      await expect(page.getByRole("heading", { name: fixture.authorName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toBeVisible();
      await expect(page.getByText(fixture.draftTitle)).toHaveCount(0);

      await page.goto(`/series/${fixture.seriesSlug}`);
      await expect(page.getByRole("heading", { name: fixture.seriesName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toBeVisible();
      await expect(page.getByRole("link", { name: `作者：${fixture.authorName}` })).toBeVisible();
      await expect(page.getByText(fixture.draftTitle)).toHaveCount(0);

      await page.getByRole("link", { name: `作者：${fixture.authorName}` }).click();
      await expect(page).toHaveURL(new RegExp(`/author/${fixture.authorSlug}$`));
      await expect(page.getByRole("heading", { name: fixture.authorName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toBeVisible();
      await expect(page.getByText(fixture.draftTitle)).toHaveCount(0);

      await cleanupArchivePublishedPosts();

      await page.goto(`/`);
      await expect(page.getByRole("heading", { name: "最新文章" })).toBeVisible();
      const homeEmptyHeading = page.getByText("还没有已发布文章");
      await expect(homeEmptyHeading).toHaveClass(/text-blue-700/);
      await expect(homeEmptyHeading.locator("xpath=..")) .toHaveClass(/bg-slate-100\/70/);

      await page.goto(`/category/${fixture.categorySlug}`);
      await expect(page.getByRole("heading", { name: fixture.categoryName })).toBeVisible();
      await expect(page.locator("main")).toHaveClass(/max-w-6xl/);
      await expect(page.getByText("Category", { exact: true })).toHaveClass(/text-blue-700/);
      const categoryEmptyHeading = page.getByText("这个分类下还没有已发布文章");
      await expect(categoryEmptyHeading).toHaveClass(/text-blue-700/);
      await expect(categoryEmptyHeading.locator("xpath=..")) .toHaveClass(/bg-slate-100\/70/);

      await page.goto(`/tag/${fixture.tagSlug}`);
      await expect(page.getByRole("heading", { name: fixture.tagName })).toBeVisible();
      await expect(page.getByText("Tag", { exact: true })).toHaveClass(/text-blue-700/);
      const tagEmptyHeading = page.getByText("这个标签下还没有已发布文章");
      await expect(tagEmptyHeading).toHaveClass(/text-blue-700/);
      await expect(tagEmptyHeading.locator("xpath=..")) .toHaveClass(/bg-slate-100\/70/);

      await page.goto(`/author/${fixture.authorSlug}`);
      await expect(page.getByRole("heading", { name: fixture.authorName })).toBeVisible();
      await expect(page.getByText("Author", { exact: true })).toHaveClass(/text-blue-700/);
      const authorEmptyHeading = page.getByText("这个作者下还没有已发布文章");
      await expect(authorEmptyHeading).toHaveClass(/text-blue-700/);
      await expect(authorEmptyHeading.locator("xpath=..")) .toHaveClass(/bg-slate-100\/70/);

      await page.goto(`/series/${fixture.seriesSlug}`);
      await expect(page.getByRole("heading", { name: fixture.seriesName })).toBeVisible();
      await expect(page.getByText("Series", { exact: true })).toHaveClass(/text-blue-700/);
      const seriesEmptyHeading = page.getByText("这个系列下还没有已发布文章");
      await expect(seriesEmptyHeading).toHaveClass(/text-blue-700/);
      await expect(seriesEmptyHeading.locator("xpath=..")) .toHaveClass(/bg-slate-100\/70/);

      await page.goto(`/category/${fixture.missingCategorySlug}`);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();

      await page.goto(`/tag/${fixture.missingTagSlug}`);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();

      await page.goto(`/series/${fixture.missingSeriesSlug}`);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    } finally {
      await cleanupThemeSettings(originalThemeSettings);
      await cleanupArchiveFixture();
    }
  });
});

type ArchiveFixture = {
  authorName: string;
  authorSlug: string;
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
  const authorName = `Archive Author ${seed}`;
  const authorSlug = `${BROWSER_PREFIX}${seed}`;
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
        username: authorSlug,
        displayName: authorName,
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
    authorName,
    authorSlug,
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

async function cleanupArchivePublishedPosts() {
  await withDb(async (db) => {
    const browserPublishedPosts = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(like(posts.slug, `${BROWSER_PREFIX}published-%`), eq(posts.status, "published")));

    if (browserPublishedPosts.length > 0) {
      await db.delete(posts).where(
        inArray(
          posts.id,
          browserPublishedPosts.map((post) => post.id),
        ),
      );
    }
  });
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

async function captureThemeSettings(): Promise<ThemeSettingsSnapshot> {
  return {
    public_layout_width: await getSettingValue("public_layout_width"),
    public_surface_variant: await getSettingValue("public_surface_variant"),
    public_accent_theme: await getSettingValue("public_accent_theme"),
  };
}

async function applyThemeSettings(values: {
  public_layout_width: "narrow" | "default" | "wide";
  public_surface_variant: "soft" | "solid";
  public_accent_theme: "slate" | "blue" | "emerald" | "amber";
}) {
  await restoreSetting("public_layout_width", values.public_layout_width);
  await restoreSetting("public_surface_variant", values.public_surface_variant);
  await restoreSetting("public_accent_theme", values.public_accent_theme);
}

async function cleanupThemeSettings(snapshot: ThemeSettingsSnapshot) {
  await restoreSetting("public_layout_width", snapshot.public_layout_width);
  await restoreSetting("public_surface_variant", snapshot.public_surface_variant);
  await restoreSetting("public_accent_theme", snapshot.public_accent_theme);
}

async function getSettingValue(
  key: "public_layout_width" | "public_surface_variant" | "public_accent_theme",
) {
  return withDb(async (db) => {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    return row?.value ?? null;
  });
}

async function restoreSetting(
  key: "public_layout_width" | "public_surface_variant" | "public_accent_theme",
  value: string | null,
) {
  await withDb(async (db) => {
    if (value === null) {
      await db.delete(settings).where(eq(settings.key, key));
      return;
    }

    await db
      .insert(settings)
      .values({
        key,
        value,
        isSecret: false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value,
          isSecret: false,
          updatedAt: new Date(),
        },
      });
  });
}

async function withDb<T>(callback: (db: ReturnType<typeof drizzle>) => Promise<T>) {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, {
    schema: { categories, postSeries, postTags, posts, series, settings, tags, users },
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

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { categories, postTags, posts, settings, tags, users } from "../../lib/db/schema";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-related-posts-";
const databaseUrl = getDatabaseUrl();

type ThemeSettingsSnapshot = {
  public_surface_variant: string | null;
  public_accent_theme: string | null;
};

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("related posts browser regression", () => {
  test("shows related published posts on the public post page and navigates to the related post", async ({ page }) => {
    const fixture = await seedRelatedPostsFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);
    const originalThemeSettings = await captureThemeSettings();

    try {
      await applyThemeSettings({
        public_surface_variant: "solid",
        public_accent_theme: "blue",
      });

      await page.goto(`/post/${fixture.primarySlug}`);
      await expect(page.getByRole("heading", { name: fixture.primaryTitle })).toBeVisible();
      await expect(page.getByRole("heading", { name: "相关文章" })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.relatedTitle })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.relatedTitle })).toHaveClass(/underline-offset-4/);
      await expect(page.getByRole("link", { name: fixture.relatedTitle })).toHaveClass(/text-blue-700/);
      await expect(page.getByRole("link", { name: fixture.relatedTitle }).locator("xpath=ancestor::article[1]")).toHaveClass(/hover:border-blue-300/);
      await expect(page.getByText(fixture.unrelatedTitle)).toHaveCount(0);

      await page.getByRole("link", { name: fixture.relatedTitle }).click();

      await expect(page).toHaveURL(new RegExp(`/post/${fixture.relatedSlug}$`));
      await expect(page.getByRole("heading", { name: fixture.relatedTitle })).toBeVisible();
      await expect(page.getByRole("heading", { name: "相关文章" })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.primaryTitle })).toBeVisible();
      await expect(page.getByText(fixture.unrelatedTitle)).toHaveCount(0);
    } finally {
      await cleanupThemeSettings(originalThemeSettings);
      await cleanupRelatedPostsFixture();
    }
  });
});

type RelatedPostsFixture = {
  primarySlug: string;
  primaryTitle: string;
  relatedSlug: string;
  relatedTitle: string;
  unrelatedTitle: string;
};

async function seedRelatedPostsFixture(seed: string): Promise<RelatedPostsFixture> {
  const primaryTitle = `Primary Post ${seed}`;
  const primarySlug = `${BROWSER_PREFIX}primary-${seed}`;
  const relatedTitle = `Related Post ${seed}`;
  const relatedSlug = `${BROWSER_PREFIX}related-${seed}`;
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
        slug: relatedSlug,
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
    relatedSlug,
    relatedTitle,
    unrelatedTitle,
  };
}

async function captureThemeSettings(): Promise<ThemeSettingsSnapshot> {
  return {
    public_surface_variant: await getSettingValue("public_surface_variant"),
    public_accent_theme: await getSettingValue("public_accent_theme"),
  };
}

async function applyThemeSettings(values: {
  public_surface_variant: "soft" | "solid";
  public_accent_theme: "slate" | "blue" | "emerald" | "amber";
}) {
  await restoreSetting("public_surface_variant", values.public_surface_variant);
  await restoreSetting("public_accent_theme", values.public_accent_theme);
}

async function cleanupThemeSettings(snapshot: ThemeSettingsSnapshot) {
  await restoreSetting("public_surface_variant", snapshot.public_surface_variant);
  await restoreSetting("public_accent_theme", snapshot.public_accent_theme);
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


async function getSettingValue(
  key: "public_surface_variant" | "public_accent_theme",
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
  key: "public_surface_variant" | "public_accent_theme",
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

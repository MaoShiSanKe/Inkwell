import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { postTags, posts, settings, tags, users } from "../../lib/db/schema";

type ThemeSettingsSnapshot = {
  public_surface_variant: string | null;
  public_accent_theme: string | null;
};

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-post-tags-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("post tags browser regression", () => {
  test("shows clickable tag links on the public post page and navigates to the tag archive", async ({ page }) => {
    const fixture = await seedPostTagsFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);
    const originalThemeSettings = await captureThemeSettings();

    try {
      await applyThemeSettings({
        public_surface_variant: "solid",
        public_accent_theme: "blue",
      });

      await page.goto(`/post/${fixture.postSlug}`);

      await expect(page.getByRole("heading", { name: fixture.postTitle })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.primaryTagName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.primaryTagName })).toHaveClass(/hover:border-blue-300/);
      await expect(page.getByRole("link", { name: fixture.primaryTagName })).toHaveClass(/text-blue-700/);
      await expect(page.getByRole("link", { name: fixture.secondaryTagName })).toBeVisible();

      await page.getByRole("link", { name: fixture.primaryTagName }).click();

      await expect(page).toHaveURL(new RegExp(`/tag/${fixture.primaryTagSlug}$`));
      await expect(page.getByRole("heading", { name: fixture.primaryTagName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.postTitle })).toBeVisible();
    } finally {
      await cleanupThemeSettings(originalThemeSettings);
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
    schema: { postTags, posts, settings, tags, users },
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

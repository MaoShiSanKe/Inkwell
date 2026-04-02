import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { posts, settings, users } from "../../lib/db/schema";

type ThemeSettingsSnapshot = {
  public_layout_width: string | null;
  public_surface_variant: string | null;
  public_accent_theme: string | null;
};

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-search-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("public search browser regression", () => {
  test("searches published posts and hides unpublished ones", async ({ page }) => {
    const fixture = await seedSearchFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);
    const originalThemeSettings = await captureThemeSettings();

    try {
      await applyThemeSettings({
        public_layout_width: "wide",
        public_surface_variant: "solid",
        public_accent_theme: "blue",
      });

      await page.goto("/search");
      await expect(page.getByRole("heading", { name: "搜索已发布文章" })).toBeVisible();
      await expect(page.getByText("输入关键词开始搜索")).toBeVisible();
      await expect(page.locator("main")).toHaveClass(/max-w-6xl/);
      await expect(page.getByText("Search", { exact: true })).toHaveClass(/text-blue-700/);
      await expect(page.getByRole("searchbox")).toHaveClass(/bg-slate-100\/90/);
      await expect(page.getByRole("button", { name: "搜索" })).toHaveClass(/focus-visible:ring-blue-500\/40/);

      await page.getByRole("searchbox").fill(fixture.query);
      await page.getByRole("button", { name: "搜索" }).click();

      await expect.poll(() => new URL(page.url()).pathname).toBe("/search");
      await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(fixture.query);
      await expect(page.getByText(`共找到 1 篇与 “${fixture.query}” 相关的已发布文章。`)).toBeVisible();
      await expect(page.getByText(`共找到 1 篇与 “${fixture.query}” 相关的已发布文章。`)).toHaveClass(/text-blue-700/);
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.publishedTitle })).toHaveClass(/underline-offset-4/);
      await expect(page.getByRole("link", { name: "作者：Browser Search Author" })).toHaveClass(/underline-offset-4/);
      await expect(page.getByText(fixture.publishedExcerpt)).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.hiddenTitle })).toHaveCount(0);
    } finally {
      await cleanupThemeSettings(originalThemeSettings);
      await cleanupSearchFixture();
    }
  });
});

type SearchFixture = {
  query: string;
  publishedTitle: string;
  publishedExcerpt: string;
  hiddenTitle: string;
};

async function seedSearchFixture(seed: string): Promise<SearchFixture> {
  await cleanupSearchFixture();

  const query = `Search Keyword ${seed}`;
  const publishedTitle = `Published Search Title ${seed}`;
  const publishedExcerpt = `Published excerpt ${query}`;
  const hiddenTitle = `Hidden Draft Search ${seed}`;

  await withDb(async (db) => {
    const [author] = await db
      .insert(users)
      .values({
        email: `${BROWSER_PREFIX}${seed}@example.com`,
        username: `${BROWSER_PREFIX}${seed}`,
        displayName: "Browser Search Author",
        passwordHash: "hashed-password",
        role: "author",
      })
      .returning({ id: users.id });

    await db.insert(posts).values([
      {
        authorId: author.id,
        title: publishedTitle,
        slug: `${BROWSER_PREFIX}published-${seed}`,
        excerpt: publishedExcerpt,
        content: `Search body content ${query}`,
        status: "published",
        publishedAt: new Date("2026-03-27T08:00:00.000Z"),
        updatedAt: new Date("2026-03-27T08:05:00.000Z"),
      },
      {
        authorId: author.id,
        title: hiddenTitle,
        slug: `${BROWSER_PREFIX}draft-${seed}`,
        excerpt: `Hidden excerpt ${query}`,
        content: `Hidden body ${query}`,
        status: "draft",
        publishedAt: null,
        updatedAt: new Date("2026-03-27T08:05:00.000Z"),
      },
    ]);
  });

  return {
    query,
    publishedTitle,
    publishedExcerpt,
    hiddenTitle,
  };
}

async function cleanupSearchFixture() {
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
    schema: { posts, settings, users },
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

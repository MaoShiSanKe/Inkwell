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
  public_surface_variant: string | null;
  public_accent_theme: string | null;
};

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-post-toc-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("post toc browser regression", () => {
  test("shows toc links and jumps to the matching heading", async ({ page }) => {
    const fixture = await seedPostTocFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);
    const originalThemeSettings = await captureThemeSettings();

    try {
      await applyThemeSettings({
        public_surface_variant: "solid",
        public_accent_theme: "blue",
      });

      await page.goto(`/post/${fixture.slug}`);
      await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "文章目录" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "文章目录" })).toHaveClass(/bg-slate-100\/90/);
      await expect(page.getByRole("link", { name: fixture.sectionHeading })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.sectionHeading })).toHaveClass(/text-blue-700/);
      await expect(page.getByRole("link", { name: fixture.subsectionHeading })).toBeVisible();

      await page.getByRole("link", { name: fixture.subsectionHeading }).click();

      await expect.poll(() => new URL(page.url()).hash).toBe(`#${fixture.subsectionId}`);
      await expect(page.locator(`#${fixture.subsectionId}`)).toBeInViewport();
    } finally {
      await cleanupThemeSettings(originalThemeSettings);
      await cleanupPostTocFixture();
    }
  });

  test("keeps the toc usable on narrow screens", async ({ page }) => {
    const fixture = await seedPostTocFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);
    const originalThemeSettings = await captureThemeSettings();

    try {
      await applyThemeSettings({
        public_surface_variant: "solid",
        public_accent_theme: "blue",
      });

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/post/${fixture.slug}`);

      await expect(page.getByRole("navigation", { name: "文章目录" })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.sectionHeading })).toBeVisible();

      await page.getByRole("link", { name: fixture.sectionHeading }).click();

      await expect.poll(() => new URL(page.url()).hash).toBe(`#${fixture.sectionId}`);
      await expect(page.locator(`#${fixture.sectionId}`)).toBeInViewport();
    } finally {
      await cleanupThemeSettings(originalThemeSettings);
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
    schema: { posts, users },
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

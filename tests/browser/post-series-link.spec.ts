import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { postSeries, posts, series, users } from "../../lib/db/schema";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-post-series-link-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("post series link browser regression", () => {
  test("shows the series link on the public post page and navigates to the series archive", async ({ page }) => {
    let fixture: PostSeriesLinkFixture | null = null;

    try {
      fixture = await seedPostSeriesLinkFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

      await page.goto(`/post/${fixture.postSlug}`);

      await expect(page.getByRole("heading", { name: fixture.postTitle })).toBeVisible();
      await expect(page.getByRole("link", { name: `系列：${fixture.seriesName}` })).toBeVisible();

      await page.getByRole("link", { name: `系列：${fixture.seriesName}` }).click();

      await expect(page).toHaveURL(new RegExp(`/series/${fixture.seriesSlug}$`));
      await expect(page.getByRole("heading", { name: fixture.seriesName })).toBeVisible();
      await expect(page.getByRole("link", { name: fixture.postTitle })).toBeVisible();
    } finally {
      if (fixture) {
        await cleanupPostSeriesLinkFixture(fixture);
      }
    }
  });
});

type PostSeriesLinkFixture = {
  postId: number;
  postSlug: string;
  postTitle: string;
  seriesId: number;
  seriesName: string;
  seriesSlug: string;
  userId: number;
};

async function seedPostSeriesLinkFixture(seed: string): Promise<PostSeriesLinkFixture> {
  const postTitle = `Series Link Post ${seed}`;
  const postSlug = `${BROWSER_PREFIX}post-${seed}`;
  const seriesName = `Series Link ${seed}`;
  const seriesSlug = `${BROWSER_PREFIX}series-${seed}`;

  return withDb(async (db) =>
    db.transaction(async (tx) => {
      const [author] = await tx
        .insert(users)
        .values({
          email: `${BROWSER_PREFIX}${seed}@example.com`,
          username: `${BROWSER_PREFIX}${seed}`,
          displayName: "Series Link Author",
          passwordHash: "hashed-password",
          role: "author",
        })
        .returning({ id: users.id });

      const [seriesItem] = await tx
        .insert(series)
        .values({
          name: seriesName,
          slug: seriesSlug,
          description: `Series link series ${seed}`,
        })
        .returning({ id: series.id });

      const [post] = await tx
        .insert(posts)
        .values({
          authorId: author.id,
          title: postTitle,
          slug: postSlug,
          excerpt: "Series link excerpt",
          content: "Series link content",
          status: "published",
          publishedAt: new Date("2026-03-28T12:00:00.000Z"),
          updatedAt: new Date("2026-03-28T12:05:00.000Z"),
        })
        .returning({ id: posts.id });

      await tx.insert(postSeries).values({
        postId: post.id,
        seriesId: seriesItem.id,
        orderIndex: 0,
      });

      return {
        postId: post.id,
        postSlug,
        postTitle,
        seriesId: seriesItem.id,
        seriesName,
        seriesSlug,
        userId: author.id,
      };
    }),
  );
}

async function cleanupPostSeriesLinkFixture(fixture: PostSeriesLinkFixture) {
  await withDb(async (db) => {
    await db.delete(posts).where(eq(posts.id, fixture.postId));
    await db.delete(series).where(eq(series.id, fixture.seriesId));
    await db.delete(users).where(eq(users.id, fixture.userId));
  });
}

async function withDb<T>(callback: (db: ReturnType<typeof drizzle>) => Promise<T>) {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, {
    schema: { postSeries, posts, series, users },
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

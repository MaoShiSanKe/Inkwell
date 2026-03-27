import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { posts, users } from "../../lib/db/schema";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-post-updated-at-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("post updated timestamp browser regression", () => {
  test("shows the last updated timestamp on the public post page", async ({ page }) => {
    let fixture: PostUpdatedAtFixture | null = null;

    try {
      fixture = await seedPostUpdatedAtFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

      await page.goto(`/post/${fixture.slug}`);

      await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();
      await expect(page.getByText("最后更新：")).toBeVisible();
      await expect(page.locator(`time[datetime="${fixture.updatedAtIso}"]`)).toBeVisible();
    } finally {
      if (fixture) {
        await cleanupPostUpdatedAtFixture(fixture);
      }
    }
  });
});

type PostUpdatedAtFixture = {
  postId: number;
  slug: string;
  title: string;
  updatedAtIso: string;
  userId: number;
};

async function seedPostUpdatedAtFixture(seed: string): Promise<PostUpdatedAtFixture> {
  const title = `Updated Timestamp Post ${seed}`;
  const slug = `${BROWSER_PREFIX}post-${seed}`;
  const updatedAt = new Date("2026-03-27T11:45:00.000Z");

  return withDb(async (db) =>
    db.transaction(async (tx) => {
      const [author] = await tx
        .insert(users)
        .values({
          email: `${BROWSER_PREFIX}${seed}@example.com`,
          username: `${BROWSER_PREFIX}${seed}`,
          displayName: "Updated Timestamp Author",
          passwordHash: "hashed-password",
          role: "author",
        })
        .returning({ id: users.id });

      const [post] = await tx
        .insert(posts)
        .values({
          authorId: author.id,
          title,
          slug,
          excerpt: "Updated timestamp excerpt",
          content: "Updated timestamp content body",
          status: "published",
          publishedAt: new Date("2026-03-26T09:00:00.000Z"),
          updatedAt,
        })
        .returning({ id: posts.id });

      return {
        postId: post.id,
        slug,
        title,
        updatedAtIso: updatedAt.toISOString(),
        userId: author.id,
      };
    }),
  );
}

async function cleanupPostUpdatedAtFixture(fixture: PostUpdatedAtFixture) {
  await withDb(async (db) => {
    await db.delete(posts).where(eq(posts.id, fixture.postId));
    await db.delete(users).where(eq(users.id, fixture.userId));
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

import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { and, inArray, like, or } from "drizzle-orm";
import { config } from "dotenv";
import { afterAll } from "vitest";

const INTEGRATION_PREFIX = "integration-test-";
const testEnvPath = resolveTestEnvPath();

config({ path: testEnvPath, override: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(`DATABASE_URL is not configured in ${testEnvPath}.`);
}

const connectionInfo = getConnectionInfo(databaseUrl);

assertSafeTestConnection(testEnvPath, connectionInfo);

export async function cleanupIntegrationTables() {
  const [
    { db },
    {
      categories,
      ipBlacklist,
      media,
      postSeries,
      postTags,
      posts,
      series,
      settings,
      tags,
      users,
    },
  ] = await Promise.all([import("@/lib/db"), import("@/lib/db/schema")]);

  const integrationUserIds = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.username, `${INTEGRATION_PREFIX}%`));

  const integrationPosts = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      integrationUserIds.length > 0
        ? or(
            like(posts.slug, `${INTEGRATION_PREFIX}%`),
            inArray(
              posts.authorId,
              integrationUserIds.map((user) => user.id),
            ),
          )
        : like(posts.slug, `${INTEGRATION_PREFIX}%`),
    );

  const integrationMediaRows = await db
    .select({
      id: media.id,
      storagePath: media.storagePath,
      thumbnailPath: media.thumbnailPath,
    })
    .from(media)
    .where(like(media.altText, `${INTEGRATION_PREFIX}%`));

  const integrationBlacklistRows = await db
    .select({ id: ipBlacklist.id })
    .from(ipBlacklist)
    .where(like(ipBlacklist.reason, `${INTEGRATION_PREFIX}%`));

  if (integrationPosts.length > 0) {
    await db.delete(postSeries).where(
      inArray(
        postSeries.postId,
        integrationPosts.map((post) => post.id),
      ),
    );

    await db.delete(postTags).where(
      inArray(
        postTags.postId,
        integrationPosts.map((post) => post.id),
      ),
    );

    await db.delete(posts).where(
      inArray(
        posts.id,
        integrationPosts.map((post) => post.id),
      ),
    );
  }

  if (integrationMediaRows.length > 0) {
    await db.delete(media).where(
      inArray(
        media.id,
        integrationMediaRows.map((item) => item.id),
      ),
    );

    await Promise.allSettled(
      integrationMediaRows
        .flatMap((item) => [item.storagePath, item.thumbnailPath])
        .filter((value): value is string => Boolean(value))
        .map(removeIntegrationMediaFile),
    );
  }

  if (integrationBlacklistRows.length > 0) {
    await db.delete(ipBlacklist).where(
      inArray(
        ipBlacklist.id,
        integrationBlacklistRows.map((row) => row.id),
      ),
    );
  }

  await db.delete(categories).where(like(categories.slug, `${INTEGRATION_PREFIX}%`));
  await db.delete(series).where(like(series.slug, `${INTEGRATION_PREFIX}%`));
  await db.delete(tags).where(like(tags.slug, `${INTEGRATION_PREFIX}%`));

  if (integrationUserIds.length > 0) {
    await db.delete(users).where(
      and(
        inArray(
          users.id,
          integrationUserIds.map((user) => user.id),
        ),
        like(users.username, `${INTEGRATION_PREFIX}%`),
      ),
    );
  }

  await db.delete(settings).where(like(settings.key, `${INTEGRATION_PREFIX}%`));
}

async function removeIntegrationMediaFile(relativePath: string) {
  await rm(resolve(process.cwd(), "public", relativePath.replace(/^\/+/, "")), {
    force: true,
  });
}

afterAll(async () => {
  try {
    await cleanupIntegrationTables();
  } finally {
    const { client } = await import("@/lib/db");

    await client.end({ timeout: 0 });

    const globalForDatabase = globalThis as typeof globalThis & {
      postgresClient?: typeof client;
    };

    delete globalForDatabase.postgresClient;
  }
});

function resolveTestEnvPath() {
  const envCandidates = [".env.test.local", ".env.local"];

  for (const candidate of envCandidates) {
    const candidatePath = resolve(process.cwd(), candidate);

    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(
    `Missing test env file. Expected one of: ${envCandidates.join(", ")}. Create one before running integration tests.`,
  );
}

function assertSafeTestConnection(
  envPath: string,
  connectionInfo: { databaseName: string; hostname: string },
) {
  if (basename(envPath) === ".env.test.local") {
    if (!connectionInfo.databaseName.toLowerCase().includes("_test")) {
      throw new Error(
        [
          `Refusing to run integration tests against non-test database "${connectionInfo.databaseName}".`,
          'DATABASE_URL must point to a database name containing "_test".',
        ].join(" "),
      );
    }

    return;
  }

  if (!isLocalHostname(connectionInfo.hostname)) {
    throw new Error(
      [
        ".env.local is only allowed for integration tests when DATABASE_URL points to a local database host.",
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
    throw new Error(`Invalid DATABASE_URL for integration tests. ${reason}`);
  }
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

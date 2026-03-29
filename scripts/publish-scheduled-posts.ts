import { pathToFileURL } from "node:url";

import { config } from "dotenv";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { notifyPostPublished } from "../lib/email-notifications";
import {
  postRevisions,
  posts,
  settings,
  sitemapEntries,
} from "../lib/db/schema";
import { DEFAULT_SETTINGS, parseSettingValue } from "../lib/settings-config";

config({ path: ".env.local" });

type RevisionRetentionSettings = {
  revisionLimit: number;
  revisionTtlDays: number;
};

function buildPostPath(slug: string) {
  return `/post/${slug}`;
}

function createDbContext() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const client = postgres(connectionString, {
    max: 1,
  });

  const db = drizzle(client, {
    schema: {
      posts,
      postRevisions,
      sitemapEntries,
      settings,
    },
    casing: "snake_case",
  });

  return { client, db };
}

async function getRevisionRetentionSettings(
  db: ReturnType<typeof createDbContext>["db"],
): Promise<RevisionRetentionSettings> {
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, ["revision_limit", "revision_ttl_days"]));

  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return {
    revisionLimit: byKey.has("revision_limit")
      ? parseSettingValue("revision_limit", byKey.get("revision_limit") as string)
      : DEFAULT_SETTINGS.revision_limit,
    revisionTtlDays: byKey.has("revision_ttl_days")
      ? parseSettingValue("revision_ttl_days", byKey.get("revision_ttl_days") as string)
      : DEFAULT_SETTINGS.revision_ttl_days,
  };
}

async function prunePostRevisions(
  db: ReturnType<typeof createDbContext>["db"],
  postId: number,
  retention: RevisionRetentionSettings,
) {
  const [post] = await db
    .select({ status: posts.status })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) {
    return;
  }

  if (retention.revisionTtlDays > 0 && post.status === "published") {
    const cutoff = new Date(Date.now() - retention.revisionTtlDays * 24 * 60 * 60 * 1000);
    const draftRevisionRows = await db
      .select({ id: postRevisions.id, createdAt: postRevisions.createdAt })
      .from(postRevisions)
      .where(
        and(
          eq(postRevisions.postId, postId),
          eq(postRevisions.status, "draft"),
          ne(postRevisions.reason, "restored from trash"),
        ),
      )
      .orderBy(desc(postRevisions.createdAt), desc(postRevisions.id));

    const staleDraftIds = draftRevisionRows
      .filter((row) => row.createdAt.getTime() < cutoff.getTime())
      .map((row) => row.id);

    if (staleDraftIds.length > 0) {
      await db.delete(postRevisions).where(inArray(postRevisions.id, staleDraftIds));
    }
  }

  if (retention.revisionLimit <= 0) {
    return;
  }

  const revisionRows = await db
    .select({ id: postRevisions.id })
    .from(postRevisions)
    .where(eq(postRevisions.postId, postId))
    .orderBy(desc(postRevisions.createdAt), desc(postRevisions.id));

  const staleRevisionIds = revisionRows
    .slice(retention.revisionLimit)
    .map((row) => row.id);

  if (staleRevisionIds.length > 0) {
    await db.delete(postRevisions).where(inArray(postRevisions.id, staleRevisionIds));
  }
}

export async function main() {
  const { client, db } = createDbContext();

  try {
    const now = new Date();
    const retention = await getRevisionRetentionSettings(db);
    const scheduledRows = await db
      .select({
        id: posts.id,
        slug: posts.slug,
        publishedAt: posts.publishedAt,
      })
      .from(posts)
      .where(eq(posts.status, "scheduled"));

    const dueRows = scheduledRows.filter(
      (row) => row.publishedAt && row.publishedAt.getTime() <= now.getTime(),
    );
    const notifications: Array<{
      postId: number;
      slug: string;
      title: string;
      excerpt: string | null;
    }> = [];

    for (const row of dueRows) {
      const [publishedPost] = await db.transaction(async (tx) => {
        const updatedRows = await tx
          .update(posts)
          .set({
            status: "published",
            updatedAt: now,
          })
          .where(and(eq(posts.id, row.id), eq(posts.status, "scheduled")))
          .returning({
            id: posts.id,
            slug: posts.slug,
            title: posts.title,
            excerpt: posts.excerpt,
          });

        if (updatedRows.length === 0) {
          return [];
        }

        await tx
          .insert(sitemapEntries)
          .values({
            postId: row.id,
            loc: buildPostPath(row.slug),
            lastModifiedAt: now,
          })
          .onConflictDoUpdate({
            target: sitemapEntries.postId,
            set: {
              loc: buildPostPath(row.slug),
              lastModifiedAt: now,
            },
          });

        return updatedRows;
      });

      if (!publishedPost) {
        continue;
      }

      await prunePostRevisions(db, row.id, retention);
      notifications.push({
        postId: publishedPost.id,
        slug: publishedPost.slug,
        title: publishedPost.title,
        excerpt: publishedPost.excerpt,
      });
    }

    for (const notification of notifications) {
      await notifyPostPublished({
        postId: notification.postId,
        postSlug: notification.slug,
        postTitle: notification.title,
        excerpt: notification.excerpt,
      });
    }

    console.log(
      JSON.stringify(
        {
          publishedCount: notifications.length,
          publishedPostIds: notifications.map((row) => row.postId),
          affectedSlugs: notifications.map((row) => row.slug),
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

import { and, desc, eq, inArray, ne } from "drizzle-orm";

import { buildPublishedSearchDocument, syncPublishedPostToSearchIndex } from "@/lib/meilisearch";
import {
  postRevisions,
  posts,
  settings,
  sitemapEntries,
} from "@/lib/db/schema";
import { DEFAULT_SETTINGS, parseSettingValue } from "@/lib/settings-config";

export type PublishScheduledPostsResult = {
  publishedCount: number;
  publishedPostIds: number[];
  affectedSlugs: string[];
};

type RevisionRetentionSettings = {
  revisionLimit: number;
  revisionTtlDays: number;
};

type ScheduledPostTransaction = {
  select: typeof import("@/lib/db").db.select;
  update: typeof import("@/lib/db").db.update;
  insert: typeof import("@/lib/db").db.insert;
  delete: typeof import("@/lib/db").db.delete;
};

type ScheduledPostDbLike = typeof import("@/lib/db").db;

type NewlyPublishedPostNotification = {
  postId: number;
  slug: string;
  title: string;
  excerpt: string | null;
};

type NotifyPostPublished = (input: {
  postId: number;
  postSlug: string;
  postTitle: string;
  excerpt: string | null;
}) => Promise<unknown>;

export type PublishScheduledPostsOptions = {
  now?: Date;
  notifyPostPublished?: NotifyPostPublished;
};

function buildPostPath(slug: string) {
  return `/post/${slug}`;
}

async function getRevisionRetentionSettings(
  db: ScheduledPostDbLike,
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
  db: ScheduledPostDbLike | ScheduledPostTransaction,
  postId: number,
  retention: RevisionRetentionSettings,
  now: Date,
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
    const cutoff = new Date(now.getTime() - retention.revisionTtlDays * 24 * 60 * 60 * 1000);
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

export async function publishScheduledPostsWithDb(
  db: ScheduledPostDbLike,
  options: PublishScheduledPostsOptions = {},
): Promise<PublishScheduledPostsResult> {
  const now = options.now ?? new Date();
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

  if (dueRows.length === 0) {
    return {
      publishedCount: 0,
      publishedPostIds: [],
      affectedSlugs: [],
    };
  }

  const retention = await getRevisionRetentionSettings(db);
  const publishedPostIds: number[] = [];
  const notifications: NewlyPublishedPostNotification[] = [];

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
          content: posts.content,
          publishedAt: posts.publishedAt,
          updatedAt: posts.updatedAt,
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

      await prunePostRevisions(tx, row.id, retention, now);

      return updatedRows;
    });

    if (!publishedPost) {
      continue;
    }

    await syncPublishedPostToSearchIndex(
      buildPublishedSearchDocument({
        id: publishedPost.id,
        title: publishedPost.title,
        slug: publishedPost.slug,
        excerpt: publishedPost.excerpt,
        content: publishedPost.content,
        publishedAt: publishedPost.publishedAt,
        updatedAt: publishedPost.updatedAt,
      }),
    );

    publishedPostIds.push(row.id);
    notifications.push({
      postId: publishedPost.id,
      slug: publishedPost.slug,
      title: publishedPost.title,
      excerpt: publishedPost.excerpt,
    });
  }

  if (options.notifyPostPublished) {
    for (const notification of notifications) {
      await options.notifyPostPublished({
        postId: notification.postId,
        postSlug: notification.slug,
        postTitle: notification.title,
        excerpt: notification.excerpt,
      });
    }
  }

  return {
    publishedCount: publishedPostIds.length,
    publishedPostIds,
    affectedSlugs: notifications.map((row) => row.slug),
  };
}

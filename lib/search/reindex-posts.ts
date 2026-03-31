import { and, asc, eq, gt, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { posts } from "@/lib/db/schema";
import {
  buildPublishedSearchDocument,
  getDefaultReindexBatchSize,
  getPublishedPostsIndexName,
  replacePublishedPostsIndex,
  type PublishedSearchDocument,
} from "@/lib/meilisearch";

export type ReindexPublishedPostsInput = {
  batchSize?: number;
  slugPrefix?: string;
};

export type ReindexPublishedPostsResult = {
  indexName: string;
  batchSize: number;
  batchCount: number;
  sourceCount: number;
  indexedCount: number;
};

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
    },
    casing: "snake_case",
  });

  return { client, db };
}

function resolveBatchSize(value: number | undefined) {
  if (!value || !Number.isInteger(value) || value <= 0) {
    return getDefaultReindexBatchSize();
  }

  return value;
}

export async function listPublishedSearchDocuments(input: ReindexPublishedPostsInput = {}) {
  const batchSize = resolveBatchSize(input.batchSize);
  const slugPrefix = input.slugPrefix?.trim() ?? "";
  const documents: PublishedSearchDocument[] = [];
  let lastSeenId = 0;
  let batchCount = 0;
  const { client, db } = createDbContext();

  try {
    while (true) {
      const whereClause = lastSeenId > 0
        ? slugPrefix
          ? and(eq(posts.status, "published"), gt(posts.id, lastSeenId), like(posts.slug, `${slugPrefix}%`))
          : and(eq(posts.status, "published"), gt(posts.id, lastSeenId))
        : slugPrefix
          ? and(eq(posts.status, "published"), like(posts.slug, `${slugPrefix}%`))
          : eq(posts.status, "published");

      const rows = await db
        .select({
          id: posts.id,
          title: posts.title,
          slug: posts.slug,
          excerpt: posts.excerpt,
          content: posts.content,
          publishedAt: posts.publishedAt,
          updatedAt: posts.updatedAt,
        })
        .from(posts)
        .where(whereClause)
        .orderBy(asc(posts.id))
        .limit(batchSize);

      if (rows.length === 0) {
        break;
      }

      batchCount += 1;
      documents.push(
        ...rows.map((row) =>
          buildPublishedSearchDocument({
            id: row.id,
            title: row.title,
            slug: row.slug,
            excerpt: row.excerpt,
            content: row.content,
            publishedAt: row.publishedAt,
            updatedAt: row.updatedAt,
          }),
        ),
      );
      lastSeenId = rows[rows.length - 1]!.id;

      if (rows.length < batchSize) {
        break;
      }
    }

    return {
      batchSize,
      batchCount,
      documents,
    };
  } finally {
    await client.end({ timeout: 0 });
  }
}

export async function reindexPublishedPosts(
  input: ReindexPublishedPostsInput = {},
): Promise<ReindexPublishedPostsResult> {
  const { batchSize, batchCount, documents } = await listPublishedSearchDocuments(input);
  const result = await replacePublishedPostsIndex({
    documents,
    indexName: getPublishedPostsIndexName(),
  });

  return {
    indexName: result.indexName,
    batchSize,
    batchCount,
    sourceCount: documents.length,
    indexedCount: result.indexedCount,
  };
}

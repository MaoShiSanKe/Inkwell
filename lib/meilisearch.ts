import { Meilisearch } from "meilisearch";

import { stripHtml } from "@/lib/blog/post-seo";

const POSTS_INDEX = "published_posts";
const SEARCH_LIMIT = 20;
const DEFAULT_REINDEX_BATCH_SIZE = 200;

export type PublishedSearchDocument = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  contentPlainText: string;
  publishedAt: string | null;
  updatedAt: string;
};

function getSearchConfig() {
  const host = process.env.MEILISEARCH_HOST?.trim() ?? "";
  const apiKey = process.env.MEILISEARCH_API_KEY?.trim() ?? "";

  return {
    host,
    apiKey,
    enabled: Boolean(host),
  };
}

function getClient() {
  const config = getSearchConfig();

  if (!config.enabled) {
    return null;
  }

  return new Meilisearch({
    host: config.host,
    apiKey: config.apiKey || undefined,
  });
}

function getIndex() {
  const client = getClient();

  if (!client) {
    return null;
  }

  return client.index<PublishedSearchDocument>(POSTS_INDEX);
}

async function applyPostsIndexSettings(index: ReturnType<Meilisearch["index"]>) {
  await index.updateSearchableAttributes(["title", "excerpt", "contentPlainText"]).waitTask();
  await index.updateSortableAttributes(["publishedAt", "updatedAt"]).waitTask();
}

async function ensureIndex(indexUid: string) {
  const client = getClient();

  if (!client) {
    return null;
  }

  const indexes = await client.getIndexes();
  const exists = indexes.results.some((index) => index.uid === indexUid);

  if (!exists) {
    await client.createIndex(indexUid, { primaryKey: "id" }).waitTask();
  }

  const index = client.index<PublishedSearchDocument>(indexUid);
  await applyPostsIndexSettings(index);
  return index;
}

async function ensurePostsIndex() {
  return ensureIndex(POSTS_INDEX);
}

export function isMeilisearchConfigured() {
  return getSearchConfig().enabled;
}

export function getPublishedPostsIndexName() {
  return POSTS_INDEX;
}

export function getDefaultReindexBatchSize() {
  return DEFAULT_REINDEX_BATCH_SIZE;
}

export function buildPublishedSearchDocument(input: {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  publishedAt: Date | null;
  updatedAt: Date;
}): PublishedSearchDocument {
  return {
    id: input.id,
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    contentPlainText: stripHtml(input.content),
    publishedAt: input.publishedAt?.toISOString() ?? null,
    updatedAt: input.updatedAt.toISOString(),
  };
}

export async function searchPublishedPostIds(query: string, limit = SEARCH_LIMIT) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return null;
  }

  const index = getIndex();

  if (!index) {
    return null;
  }

  try {
    const response = await index.search(normalizedQuery, {
      limit,
      sort: ["publishedAt:desc", "updatedAt:desc"],
    });

    return response.hits
      .map((hit) => hit.id)
      .filter((value): value is number => Number.isInteger(value));
  } catch (error) {
    console.error("Meilisearch search failed.", error);
    return null;
  }
}

export async function syncPublishedPostToSearchIndex(document: PublishedSearchDocument) {
  try {
    const index = await ensurePostsIndex();

    if (!index) {
      return false;
    }

    await index.addDocuments([document]).waitTask();
    return true;
  } catch (error) {
    console.error("Failed to sync post into Meilisearch.", error);
    return false;
  }
}

export async function removePublishedPostFromSearchIndex(postId: number) {
  const index = getIndex();

  if (!index) {
    return false;
  }

  try {
    await index.deleteDocument(String(postId)).waitTask();
    return true;
  } catch (error) {
    console.error("Failed to remove post from Meilisearch.", error);
    return false;
  }
}

export async function replacePublishedPostsIndex(input: {
  documents: PublishedSearchDocument[];
  indexName?: string;
}) {
  const indexUid = input.indexName?.trim() || POSTS_INDEX;
  const index = await ensureIndex(indexUid);

  if (!index) {
    throw new Error("MEILISEARCH_HOST is not configured.");
  }

  await index.deleteAllDocuments().waitTask();

  if (input.documents.length > 0) {
    await index.addDocuments(input.documents).waitTask();
  }

  return {
    indexName: indexUid,
    indexedCount: input.documents.length,
  };
}

import "server-only";

import { Meilisearch } from "meilisearch";

import { stripHtml } from "@/lib/blog/post-seo";

const POSTS_INDEX = "published_posts";
const SEARCH_LIMIT = 20;

type PublishedSearchDocument = {
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

export function isMeilisearchConfigured() {
  return getSearchConfig().enabled;
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

async function ensurePostsIndex() {
  const client = getClient();

  if (!client) {
    return null;
  }

  const indexes = await client.getIndexes();
  const exists = indexes.results.some((index) => index.uid === POSTS_INDEX);

  if (!exists) {
    await client.createIndex(POSTS_INDEX, { primaryKey: "id" }).waitTask();
  }

  const index = client.index<PublishedSearchDocument>(POSTS_INDEX);
  await index.updateSearchableAttributes(["title", "excerpt", "contentPlainText"]).waitTask();
  await index.updateSortableAttributes(["publishedAt", "updatedAt"]).waitTask();
  return index;
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

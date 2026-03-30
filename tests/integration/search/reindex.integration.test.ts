import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { posts, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
const {
  replacePublishedPostsIndexMock,
  getPublishedPostsIndexNameMock,
  buildPublishedSearchDocumentMock,
} = vi.hoisted(() => ({
  replacePublishedPostsIndexMock: vi.fn(),
  getPublishedPostsIndexNameMock: vi.fn(),
  buildPublishedSearchDocumentMock: vi.fn(),
}));

vi.mock("@/lib/meilisearch", async () => {
  const actual = await vi.importActual<typeof import("@/lib/meilisearch")>("@/lib/meilisearch");
  return {
    ...actual,
    buildPublishedSearchDocument: buildPublishedSearchDocumentMock,
    getPublishedPostsIndexName: getPublishedPostsIndexNameMock,
    replacePublishedPostsIndex: replacePublishedPostsIndexMock,
  };
});

describe("search reindex integration", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    replacePublishedPostsIndexMock.mockReset();
    getPublishedPostsIndexNameMock.mockReset();
    buildPublishedSearchDocumentMock.mockReset();
    getPublishedPostsIndexNameMock.mockReturnValue("published_posts");
    replacePublishedPostsIndexMock.mockImplementation(async ({ documents }) => ({
      indexName: "published_posts",
      indexedCount: documents.length,
    }));
    buildPublishedSearchDocumentMock.mockImplementation((input) => ({
      id: input.id,
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      contentPlainText: input.content,
      publishedAt: input.publishedAt?.toISOString() ?? null,
      updatedAt: input.updatedAt.toISOString(),
    }));
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("collects only matching published posts and reindexes them", async () => {
    const seed = createSeed();
    const author = await createAuthor(seed);
    const slugPrefix = buildSlugPrefix(seed);

    await createPost({
      authorId: author.id,
      title: `Published one ${seed}`,
      slug: `${slugPrefix}-published-1`,
      excerpt: "Published excerpt",
      content: `Body keyword one ${seed}`,
      status: "published",
      publishedAt: new Date("2026-03-30T12:00:00.000Z"),
    });
    await createPost({
      authorId: author.id,
      title: `Published two ${seed}`,
      slug: `${slugPrefix}-published-2`,
      excerpt: "Published excerpt",
      content: `Body keyword two ${seed}`,
      status: "published",
      publishedAt: new Date("2026-03-30T12:05:00.000Z"),
    });
    await createPost({
      authorId: author.id,
      title: `Published three ${seed}`,
      slug: `${slugPrefix}-published-3`,
      excerpt: "Published excerpt",
      content: `Body keyword three ${seed}`,
      status: "published",
      publishedAt: new Date("2026-03-30T12:10:00.000Z"),
    });
    await createPost({
      authorId: author.id,
      title: `Draft ${seed}`,
      slug: `${slugPrefix}-draft`,
      excerpt: "Draft excerpt",
      content: `Draft keyword ${seed}`,
      status: "draft",
      publishedAt: null,
    });
    await createPost({
      authorId: author.id,
      title: `Scheduled ${seed}`,
      slug: `${slugPrefix}-scheduled`,
      excerpt: "Scheduled excerpt",
      content: `Scheduled keyword ${seed}`,
      status: "scheduled",
      publishedAt: new Date("2026-04-30T12:00:00.000Z"),
    });

    const { main } = await import("@/scripts/reindex-search-posts");
    await main(["--batch-size", "1", "--slug-prefix", slugPrefix]);

    expect(buildPublishedSearchDocumentMock).toHaveBeenCalledTimes(3);
    expect(replacePublishedPostsIndexMock).toHaveBeenCalledTimes(1);
    expect(replacePublishedPostsIndexMock.mock.calls[0]?.[0]?.documents).toHaveLength(3);
    expect(replacePublishedPostsIndexMock.mock.calls[0]?.[0]?.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: `${slugPrefix}-published-1` }),
        expect.objectContaining({ slug: `${slugPrefix}-published-2` }),
        expect.objectContaining({ slug: `${slugPrefix}-published-3` }),
      ]),
    );
    expect(replacePublishedPostsIndexMock.mock.calls[0]?.[0]?.documents).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ slug: `${slugPrefix}-draft` }),
        expect.objectContaining({ slug: `${slugPrefix}-scheduled` }),
      ]),
    );
  });
});

function createSeed() {
  return randomUUID().replaceAll("-", "");
}

function buildSlugPrefix(seed: string) {
  return `${INTEGRATION_PREFIX}reindex-${seed}`;
}

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

async function createAuthor(seed: string) {
  const db = await getDb();
  const normalizedSeed = `${INTEGRATION_PREFIX}${seed}`;
  const [user] = await db
    .insert(users)
    .values({
      email: `${normalizedSeed}@example.com`,
      username: normalizedSeed,
      displayName: `Author ${seed}`,
      passwordHash: "hashed-password",
      role: "author",
    })
    .returning({ id: users.id });

  return user;
}

async function createPost(input: {
  authorId: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: "draft" | "published" | "scheduled" | "trash";
  publishedAt: Date | null;
}) {
  const db = await getDb();
  const [post] = await db
    .insert(posts)
    .values({
      authorId: input.authorId,
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: input.content,
      status: input.status,
      publishedAt: input.publishedAt,
      updatedAt: new Date("2026-03-30T12:30:00.000Z"),
    })
    .returning({ id: posts.id });

  return post;
}

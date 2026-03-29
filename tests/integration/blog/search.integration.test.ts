import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { posts, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
const { searchPublishedPostIdsMock } = vi.hoisted(() => ({
  searchPublishedPostIdsMock: vi.fn(),
}));

vi.mock("@/lib/meilisearch", () => ({
  searchPublishedPostIds: searchPublishedPostIdsMock,
}));

describe("blog search integration", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    searchPublishedPostIdsMock.mockReset();
    searchPublishedPostIdsMock.mockResolvedValue(null);
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("hydrates published results in Meilisearch hit order", async () => {
    const seed = createSeed();
    const author = await createAuthor(seed);
    const firstPost = await createPost({
      authorId: author.id,
      title: `First search result ${seed}`,
      slug: buildSlug(`first-${seed}`),
      excerpt: "First excerpt",
      content: "first body",
      status: "published",
      publishedAt: new Date("2026-03-26T10:00:00.000Z"),
    });
    const secondPost = await createPost({
      authorId: author.id,
      title: `Second search result ${seed}`,
      slug: buildSlug(`second-${seed}`),
      excerpt: "Second excerpt",
      content: "second body",
      status: "published",
      publishedAt: new Date("2026-03-26T11:00:00.000Z"),
    });

    searchPublishedPostIdsMock.mockResolvedValue([secondPost.id, firstPost.id]);

    const { searchPublishedPosts } = await import("@/lib/blog/posts");
    const results = await searchPublishedPosts(`search ${seed}`);

    expect(searchPublishedPostIdsMock).toHaveBeenCalledWith(`search ${seed}`, 20);
    expect(results.map((post) => post.id)).toEqual([secondPost.id, firstPost.id]);
  });

  it("finds published posts by title and excerpt only when Meilisearch is unavailable", async () => {
    const seed = createSeed();
    const author = await createAuthor(seed);
    const publishedByTitle = await createPost({
      authorId: author.id,
      title: `NextJS Search ${seed}`,
      slug: buildSlug(`title-${seed}`),
      excerpt: "unrelated excerpt",
      content: "body content",
      status: "published",
      publishedAt: new Date("2026-03-26T10:00:00.000Z"),
    });
    const publishedByExcerpt = await createPost({
      authorId: author.id,
      title: `Another title ${seed}`,
      slug: buildSlug(`excerpt-${seed}`),
      excerpt: `Keyword excerpt ${seed}`,
      content: "body content",
      status: "published",
      publishedAt: new Date("2026-03-26T11:00:00.000Z"),
    });
    await createPost({
      authorId: author.id,
      title: `Hidden draft ${seed}`,
      slug: buildSlug(`draft-${seed}`),
      excerpt: `Keyword excerpt ${seed}`,
      content: "body content",
      status: "draft",
      publishedAt: null,
    });
    await createPost({
      authorId: author.id,
      title: `Hidden scheduled ${seed}`,
      slug: buildSlug(`scheduled-${seed}`),
      excerpt: `Keyword excerpt ${seed}`,
      content: "body content",
      status: "scheduled",
      publishedAt: new Date("2026-04-26T11:00:00.000Z"),
    });
    await createPost({
      authorId: author.id,
      title: `Hidden trash ${seed}`,
      slug: buildSlug(`trash-${seed}`),
      excerpt: `Keyword excerpt ${seed}`,
      content: "body content",
      status: "trash",
      publishedAt: null,
    });

    const { searchPublishedPosts } = await import("@/lib/blog/posts");

    const titleResults = await searchPublishedPosts(`NextJS Search ${seed}`);
    expect(titleResults.map((post) => post.id)).toEqual([publishedByTitle.id]);

    const excerptResults = await searchPublishedPosts(`Keyword excerpt ${seed}`);
    expect(excerptResults.map((post) => post.id)).toEqual([publishedByExcerpt.id]);
  });

  it("returns no results for empty queries", async () => {
    const { searchPublishedPosts } = await import("@/lib/blog/posts");

    await expect(searchPublishedPosts("")).resolves.toEqual([]);
    await expect(searchPublishedPosts("   ")).resolves.toEqual([]);
    expect(searchPublishedPostIdsMock).not.toHaveBeenCalled();
  });
});

function createSeed() {
  return randomUUID().replaceAll("-", "");
}

function buildSlug(value: string) {
  return `${INTEGRATION_PREFIX}${value}`;
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
      updatedAt: new Date("2026-03-26T12:00:00.000Z"),
    })
    .returning({ id: posts.id });

  return post;
}

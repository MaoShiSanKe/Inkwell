import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { postLikes, posts, settings, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";

describe("public post likes", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    await ensureIntegrationAdminPath();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("creates a like for a published post and returns the updated count", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const post = await createPost({
      authorId: author.id,
      title: "Likeable post",
      slug: buildSlug(`likeable-${seed}`),
      excerpt: null,
      content: "Likeable content",
      status: "published",
      publishedAt: new Date("2026-03-27T01:00:00.000Z"),
      updatedAt: new Date("2026-03-27T01:30:00.000Z"),
    });

    const { likePublishedPost } = await import("@/lib/blog/likes");
    const result = await likePublishedPost({
      postId: String(post.id),
      ipAddress: "127.0.0.1",
    });

    expect(result).toEqual({
      success: true,
      postId: post.id,
      alreadyLiked: false,
      likeCount: 1,
    });

    await expect(getLikeCount(post.id)).resolves.toBe(1);
  });

  it("deduplicates likes by post and IP address", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const post = await createPost({
      authorId: author.id,
      title: "Deduped post",
      slug: buildSlug(`deduped-${seed}`),
      excerpt: null,
      content: "Deduped content",
      status: "published",
      publishedAt: new Date("2026-03-27T02:00:00.000Z"),
      updatedAt: new Date("2026-03-27T02:30:00.000Z"),
    });

    const { likePublishedPost } = await import("@/lib/blog/likes");
    await likePublishedPost({
      postId: String(post.id),
      ipAddress: "127.0.0.1",
    });
    const secondResult = await likePublishedPost({
      postId: String(post.id),
      ipAddress: "127.0.0.1",
    });

    expect(secondResult).toEqual({
      success: true,
      postId: post.id,
      alreadyLiked: true,
      likeCount: 1,
    });

    await expect(getLikeCount(post.id)).resolves.toBe(1);
  });

  it("rejects likes for non-published posts", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const post = await createPost({
      authorId: author.id,
      title: "Draft post",
      slug: buildSlug(`draft-${seed}`),
      excerpt: null,
      content: "Draft content",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-03-27T03:00:00.000Z"),
    });

    const { likePublishedPost } = await import("@/lib/blog/likes");
    const result = await likePublishedPost({
      postId: String(post.id),
      ipAddress: "127.0.0.1",
    });

    expect(result).toEqual({
      success: false,
      error: "文章不存在。",
    });

    await expect(getLikeCount(post.id)).resolves.toBe(0);
  });
});

function createSeed() {
  return Math.random().toString(36).slice(2, 10);
}

function buildSlug(value: string) {
  return `${INTEGRATION_PREFIX}${value}`;
}

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

async function ensureIntegrationAdminPath() {
  const db = await getDb();

  await db
    .insert(settings)
    .values({
      key: `${INTEGRATION_PREFIX}likes_guard`,
      value: "1",
      isSecret: false,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: "1",
        isSecret: false,
        updatedAt: new Date(),
      },
    });
}

async function createUser(seed: string) {
  const db = await getDb();
  const [user] = await db
    .insert(users)
    .values({
      email: `${INTEGRATION_PREFIX}${seed}@example.com`,
      username: `${INTEGRATION_PREFIX}${seed}`,
      displayName: `Author ${seed}`,
      passwordHash: "hashed-password",
      role: "author",
    })
    .returning({
      id: users.id,
    });

  return user;
}

async function createPost(input: {
  authorId: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: "draft" | "published" | "trash";
  publishedAt: Date | null;
  updatedAt: Date;
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
      updatedAt: input.updatedAt,
    })
    .returning({
      id: posts.id,
    });

  return post;
}

async function getLikeCount(postId: number) {
  const db = await getDb();
  const rows = await db
    .select({ postId: postLikes.postId })
    .from(postLikes)
    .where(eq(postLikes.postId, postId));

  return rows.length;
}

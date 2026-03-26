import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { and, eq } from "drizzle-orm";

import { postViews, posts, settings, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";

describe("public post views", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    await ensureIntegrationAdminPath();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("records a view for a published post", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const post = await createPost({
      authorId: author.id,
      title: "Viewable post",
      slug: buildSlug(`viewable-${seed}`),
      excerpt: null,
      content: "Viewable content",
      status: "published",
      publishedAt: new Date("2026-03-27T06:00:00.000Z"),
      updatedAt: new Date("2026-03-27T06:30:00.000Z"),
    });

    const { recordPublishedPostView, getPublishedPostViewCount } = await import("@/lib/blog/views");
    await expect(recordPublishedPostView({ postId: post.id, viewDate: "2026-03-27" })).resolves.toBe(
      true,
    );
    await expect(getPublishedPostViewCount(post.id)).resolves.toBe(1);
  });

  it("aggregates repeated views into the same daily row", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const post = await createPost({
      authorId: author.id,
      title: "Aggregated post",
      slug: buildSlug(`aggregated-${seed}`),
      excerpt: null,
      content: "Aggregated content",
      status: "published",
      publishedAt: new Date("2026-03-27T07:00:00.000Z"),
      updatedAt: new Date("2026-03-27T07:30:00.000Z"),
    });

    const { recordPublishedPostView, getPublishedPostViewCount } = await import("@/lib/blog/views");
    await recordPublishedPostView({ postId: post.id, viewDate: "2026-03-27" });
    await recordPublishedPostView({ postId: post.id, viewDate: "2026-03-27" });

    await expect(getPublishedPostViewCount(post.id)).resolves.toBe(2);
    await expect(getDailyViewCount(post.id, "2026-03-27")).resolves.toBe(2);
  });

  it("creates separate rows for different days", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const post = await createPost({
      authorId: author.id,
      title: "Multi day post",
      slug: buildSlug(`multi-day-${seed}`),
      excerpt: null,
      content: "Multi day content",
      status: "published",
      publishedAt: new Date("2026-03-27T08:00:00.000Z"),
      updatedAt: new Date("2026-03-27T08:30:00.000Z"),
    });

    const { recordPublishedPostView, getPublishedPostViewCount } = await import("@/lib/blog/views");
    await recordPublishedPostView({ postId: post.id, viewDate: "2026-03-27" });
    await recordPublishedPostView({ postId: post.id, viewDate: "2026-03-28" });

    await expect(getPublishedPostViewCount(post.id)).resolves.toBe(2);
    await expect(getDailyViewCount(post.id, "2026-03-27")).resolves.toBe(1);
    await expect(getDailyViewCount(post.id, "2026-03-28")).resolves.toBe(1);
  });

  it("rejects views for non-published posts", async () => {
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
      updatedAt: new Date("2026-03-27T09:00:00.000Z"),
    });

    const { recordPublishedPostView, getPublishedPostViewCount } = await import("@/lib/blog/views");
    await expect(recordPublishedPostView({ postId: post.id, viewDate: "2026-03-27" })).resolves.toBe(
      false,
    );
    await expect(getPublishedPostViewCount(post.id)).resolves.toBe(0);
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
      key: `${INTEGRATION_PREFIX}views_guard`,
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

async function getDailyViewCount(postId: number, viewDate: string) {
  const db = await getDb();
  const [row] = await db
    .select({ value: postViews.viewCount })
    .from(postViews)
    .where(and(eq(postViews.postId, postId), eq(postViews.viewDate, viewDate)))
    .limit(1);

  return row?.value ?? 0;
}

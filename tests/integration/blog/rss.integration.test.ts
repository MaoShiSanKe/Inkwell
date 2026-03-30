import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { categories, postTags, posts, tags, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";

describe("taxonomy RSS integration", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("returns category RSS items only for published posts in that category", async () => {
    const seed = createSeed();
    const author = await createAuthor(seed);
    const category = await createCategory(seed);
    const otherCategory = await createCategory(`${seed}-other`);

    await createPost({
      authorId: author.id,
      categoryId: category.id,
      title: `Category published ${seed}`,
      slug: buildSlug(`category-published-${seed}`),
      excerpt: "Category published excerpt",
      content: "Category published content",
      status: "published",
      publishedAt: new Date("2026-03-27T08:00:00.000Z"),
    });
    await createPost({
      authorId: author.id,
      categoryId: category.id,
      title: `Category draft ${seed}`,
      slug: buildSlug(`category-draft-${seed}`),
      excerpt: "Category draft excerpt",
      content: "Category draft content",
      status: "draft",
      publishedAt: null,
    });
    await createPost({
      authorId: author.id,
      categoryId: otherCategory.id,
      title: `Other category published ${seed}`,
      slug: buildSlug(`other-category-published-${seed}`),
      excerpt: "Other category excerpt",
      content: "Other category content",
      status: "published",
      publishedAt: new Date("2026-03-27T09:00:00.000Z"),
    });

    const { resolvePublishedCategoryRssBySlug } = await import("@/lib/blog/posts");
    const result = await resolvePublishedCategoryRssBySlug(category.slug);

    expect(result.kind).toBe("feed");
    if (result.kind !== "feed") {
      throw new Error("Expected category RSS feed.");
    }

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]).toMatchObject({
      title: `Category published ${seed}`,
      slug: buildSlug(`category-published-${seed}`),
    });
  });

  it("returns an empty category feed when the category exists without published posts", async () => {
    const seed = createSeed();
    await createCategory(seed);

    const { resolvePublishedCategoryRssBySlug } = await import("@/lib/blog/posts");
    const result = await resolvePublishedCategoryRssBySlug(buildSlug(`category-${seed}`));

    expect(result).toEqual({
      kind: "feed",
      category: expect.objectContaining({ slug: buildSlug(`category-${seed}`) }),
      posts: [],
    });
  });

  it("returns tag RSS items only for published posts with that tag", async () => {
    const seed = createSeed();
    const author = await createAuthor(seed);
    const category = await createCategory(seed);
    const tag = await createTag(seed);
    const otherTag = await createTag(`${seed}-other`);

    const publishedPost = await createPost({
      authorId: author.id,
      categoryId: category.id,
      title: `Tag published ${seed}`,
      slug: buildSlug(`tag-published-${seed}`),
      excerpt: "Tag published excerpt",
      content: "Tag published content",
      status: "published",
      publishedAt: new Date("2026-03-27T08:00:00.000Z"),
    });
    const draftPost = await createPost({
      authorId: author.id,
      categoryId: category.id,
      title: `Tag draft ${seed}`,
      slug: buildSlug(`tag-draft-${seed}`),
      excerpt: "Tag draft excerpt",
      content: "Tag draft content",
      status: "draft",
      publishedAt: null,
    });
    const otherTaggedPost = await createPost({
      authorId: author.id,
      categoryId: category.id,
      title: `Other tag published ${seed}`,
      slug: buildSlug(`other-tag-published-${seed}`),
      excerpt: "Other tag excerpt",
      content: "Other tag content",
      status: "published",
      publishedAt: new Date("2026-03-27T09:00:00.000Z"),
    });

    await createPostTag(publishedPost.id, tag.id);
    await createPostTag(draftPost.id, tag.id);
    await createPostTag(otherTaggedPost.id, otherTag.id);

    const { resolvePublishedTagRssBySlug } = await import("@/lib/blog/posts");
    const result = await resolvePublishedTagRssBySlug(tag.slug);

    expect(result.kind).toBe("feed");
    if (result.kind !== "feed") {
      throw new Error("Expected tag RSS feed.");
    }

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]).toMatchObject({
      title: `Tag published ${seed}`,
      slug: buildSlug(`tag-published-${seed}`),
    });
  });

  it("returns not-found for missing taxonomy RSS slugs", async () => {
    const { resolvePublishedCategoryRssBySlug, resolvePublishedTagRssBySlug } = await import(
      "@/lib/blog/posts"
    );

    await expect(resolvePublishedCategoryRssBySlug("missing-category")).resolves.toEqual({
      kind: "not-found",
    });
    await expect(resolvePublishedTagRssBySlug("missing-tag")).resolves.toEqual({
      kind: "not-found",
    });
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

async function createCategory(seed: string) {
  const db = await getDb();
  const [category] = await db
    .insert(categories)
    .values({
      name: `Category ${seed}`,
      slug: buildSlug(`category-${seed}`),
      description: `Category description ${seed}`,
    })
    .returning({ id: categories.id, slug: categories.slug });

  return category;
}

async function createTag(seed: string) {
  const db = await getDb();
  const [tag] = await db
    .insert(tags)
    .values({
      name: `Tag ${seed}`,
      slug: buildSlug(`tag-${seed}`),
      description: `Tag description ${seed}`,
    })
    .returning({ id: tags.id, slug: tags.slug });

  return tag;
}

async function createPost(input: {
  authorId: number;
  categoryId: number;
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
      categoryId: input.categoryId,
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: input.content,
      status: input.status,
      publishedAt: input.publishedAt,
      updatedAt: new Date("2026-03-27T12:00:00.000Z"),
    })
    .returning({ id: posts.id, slug: posts.slug });

  return post;
}

async function createPostTag(postId: number, tagId: number) {
  const db = await getDb();
  await db.insert(postTags).values({ postId, tagId });
}

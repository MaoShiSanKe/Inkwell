import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  categories,
  postTags,
  posts,
  settings,
  tags,
  users,
} from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
const unpublishedStatuses = ["draft", "trash"] as const;

describe("published blog archives", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    await ensureIntegrationAdminPath();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("lists only published posts on the public homepage feed", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const category = await createCategory(seed);

    await createPost({
      authorId: author.id,
      categoryId: category.id,
      title: "Published homepage post",
      slug: buildSlug(`published-home-${seed}`),
      excerpt: "Published homepage excerpt",
      content: "Published homepage content",
      status: "published",
      publishedAt: new Date("2026-03-26T08:00:00.000Z"),
      updatedAt: new Date("2026-03-26T08:30:00.000Z"),
    });

    for (const status of unpublishedStatuses) {
      await createPost({
        authorId: author.id,
        categoryId: category.id,
        title: `${status} homepage post`,
        slug: buildSlug(`${status}-home-${seed}`),
        excerpt: `${status} excerpt`,
        content: `${status} content`,
        status,
        publishedAt: null,
        updatedAt: new Date("2026-03-26T08:45:00.000Z"),
      });
    }

    const { listPublishedPosts } = await import("@/lib/blog/posts");
    const result = await listPublishedPosts();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Published homepage post",
      slug: buildSlug(`published-home-${seed}`),
      excerpt: "Published homepage excerpt",
      author: {
        displayName: author.displayName,
      },
      category: {
        name: category.name,
        slug: category.slug,
      },
    });
  });

  it("returns the category archive when the slug exists and excludes unpublished posts", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const category = await createCategory(seed);

    await createPost({
      authorId: author.id,
      categoryId: category.id,
      title: "Published category post",
      slug: buildSlug(`published-category-${seed}`),
      excerpt: "Published category excerpt",
      content: "Published category content",
      status: "published",
      publishedAt: new Date("2026-03-26T09:00:00.000Z"),
      updatedAt: new Date("2026-03-26T09:30:00.000Z"),
    });

    await createPost({
      authorId: author.id,
      categoryId: category.id,
      title: "Draft category post",
      slug: buildSlug(`draft-category-${seed}`),
      excerpt: "Draft category excerpt",
      content: "Draft category content",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-03-26T09:40:00.000Z"),
    });

    const { resolvePublishedCategoryArchiveBySlug } = await import("@/lib/blog/posts");
    const result = await resolvePublishedCategoryArchiveBySlug(`  ${category.slug.toUpperCase()}  `);

    expect(result.kind).toBe("archive");

    if (result.kind !== "archive") {
      throw new Error("Expected category archive result.");
    }

    expect(result.category).toMatchObject({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
    });
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]).toMatchObject({
      title: "Published category post",
      slug: buildSlug(`published-category-${seed}`),
    });
  });

  it("returns not-found when the category slug does not exist", async () => {
    const { resolvePublishedCategoryArchiveBySlug } = await import("@/lib/blog/posts");

    await expect(
      resolvePublishedCategoryArchiveBySlug(buildSlug("missing-category")),
    ).resolves.toEqual({ kind: "not-found" });
  });

  it("returns an empty category archive when the category exists without published posts", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const category = await createCategory(seed);

    await createPost({
      authorId: author.id,
      categoryId: category.id,
      title: "Draft category post",
      slug: buildSlug(`draft-only-category-${seed}`),
      excerpt: "Draft excerpt",
      content: "Draft content",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-03-26T10:00:00.000Z"),
    });

    const { resolvePublishedCategoryArchiveBySlug } = await import("@/lib/blog/posts");
    const result = await resolvePublishedCategoryArchiveBySlug(category.slug);

    expect(result).toEqual({
      kind: "archive",
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
      },
      posts: [],
    });
  });

  it("returns the tag archive when the slug exists and excludes unpublished posts", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const category = await createCategory(seed);
    const tag = await createTag(seed);
    const publishedPost = await createPost({
      authorId: author.id,
      categoryId: category.id,
      title: "Published tag post",
      slug: buildSlug(`published-tag-${seed}`),
      excerpt: "Published tag excerpt",
      content: "Published tag content",
      status: "published",
      publishedAt: new Date("2026-03-26T11:00:00.000Z"),
      updatedAt: new Date("2026-03-26T11:30:00.000Z"),
    });
    const draftPost = await createPost({
      authorId: author.id,
      categoryId: category.id,
      title: "Draft tag post",
      slug: buildSlug(`draft-tag-${seed}`),
      excerpt: "Draft tag excerpt",
      content: "Draft tag content",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-03-26T11:40:00.000Z"),
    });

    await createPostTag(publishedPost.id, tag.id);
    await createPostTag(draftPost.id, tag.id);

    const { resolvePublishedTagArchiveBySlug } = await import("@/lib/blog/posts");
    const result = await resolvePublishedTagArchiveBySlug(`  ${tag.slug.toUpperCase()}  `);

    expect(result.kind).toBe("archive");

    if (result.kind !== "archive") {
      throw new Error("Expected tag archive result.");
    }

    expect(result.tag).toMatchObject({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description,
    });
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]).toMatchObject({
      title: "Published tag post",
      slug: buildSlug(`published-tag-${seed}`),
      category: {
        name: category.name,
        slug: category.slug,
      },
    });
  });

  it("returns not-found when the tag slug does not exist", async () => {
    const { resolvePublishedTagArchiveBySlug } = await import("@/lib/blog/posts");

    await expect(resolvePublishedTagArchiveBySlug(buildSlug("missing-tag"))).resolves.toEqual({
      kind: "not-found",
    });
  });

  it("returns an empty tag archive when the tag exists without published posts", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const category = await createCategory(seed);
    const tag = await createTag(seed);
    const draftPost = await createPost({
      authorId: author.id,
      categoryId: category.id,
      title: "Draft tag post",
      slug: buildSlug(`draft-only-tag-${seed}`),
      excerpt: "Draft tag excerpt",
      content: "Draft tag content",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-03-26T12:00:00.000Z"),
    });

    await createPostTag(draftPost.id, tag.id);

    const { resolvePublishedTagArchiveBySlug } = await import("@/lib/blog/posts");
    const result = await resolvePublishedTagArchiveBySlug(tag.slug);

    expect(result).toEqual({
      kind: "archive",
      tag: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        description: tag.description,
      },
      posts: [],
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

async function ensureIntegrationAdminPath() {
  const db = await getDb();

  await db
    .insert(settings)
    .values({
      key: `${INTEGRATION_PREFIX}archive_guard`,
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
  const normalizedSeed = `${INTEGRATION_PREFIX}${seed}`;
  const displayName = `Author ${seed}`;
  const [user] = await db
    .insert(users)
    .values({
      email: `${normalizedSeed}@example.com`,
      username: normalizedSeed,
      displayName,
      passwordHash: "hashed-password",
      role: "author",
    })
    .returning({
      id: users.id,
      displayName: users.displayName,
    });

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
    .returning({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
    });

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
    .returning({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
    });

  return tag;
}

async function createPost(input: {
  authorId: number;
  categoryId: number | null;
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
      categoryId: input.categoryId,
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
      slug: posts.slug,
    });

  return post;
}

async function createPostTag(postId: number, tagId: number) {
  const db = await getDb();

  await db.insert(postTags).values({
    postId,
    tagId,
  });
}

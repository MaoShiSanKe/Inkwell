import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { categories, media, postMeta, postSeries, postTags, posts, series, settings, tags, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
const unpublishedStatuses = ["draft", "scheduled", "trash"] as const;

describe("resolvePublishedPostBySlug", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    await ensureIntegrationAdminPath();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("returns a published post with joined author, category, tags, and SEO data for the current slug", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const ogImage = await createLocalOgImage(seed, author.id);
    const category = await createCategory(seed);
    const reactTag = await createTag(seed, "react");
    const nextTag = await createTag(seed, "next");
    const publishedAt = new Date("2026-03-26T08:00:00.000Z");
    const updatedAt = new Date("2026-03-26T09:30:00.000Z");
    const post = await createPost({
      authorId: author.id,
      categoryId: category.id,
      title: "Published slug history post",
      slug: buildSlug(`published-post-${seed}`),
      excerpt: "Published excerpt",
      content: "<p>Published content</p>",
      status: "published",
      publishedAt,
      updatedAt,
    });

    await createPostTag(post.id, reactTag.id);
    await createPostTag(post.id, nextTag.id);
    await createPostMeta({
      postId: post.id,
      ogImageMediaId: ogImage.id,
      metaTitle: "SEO title",
      metaDescription: "SEO description",
      ogTitle: "OG title",
      ogDescription: "OG description",
      canonicalUrl: "https://example.com/custom-canonical",
      breadcrumbEnabled: true,
      noindex: true,
      nofollow: false,
    });

    const result = await resolveSlug(post.slug);

    expect(result.kind).toBe("post");

    if (result.kind !== "post") {
      throw new Error("Expected a post result.");
    }

    expect(result.post).toMatchObject({
      id: post.id,
      title: "Published slug history post",
      slug: post.slug,
      excerpt: "Published excerpt",
      content: "<p>Published content</p>",
      author: {
        displayName: author.displayName,
        slug: author.username,
      },
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      categoryPath: [
        {
          id: category.id,
          name: category.name,
          slug: category.slug,
        },
      ],
      tags: expect.arrayContaining([
        expect.objectContaining({ id: reactTag.id, name: reactTag.name, slug: reactTag.slug }),
        expect.objectContaining({ id: nextTag.id, name: nextTag.name, slug: nextTag.slug }),
      ]),
      seo: {
        metaTitle: "SEO title",
        metaDescription: "SEO description",
        ogTitle: "OG title",
        ogDescription: "OG description",
        canonicalUrl: "https://example.com/custom-canonical",
        breadcrumbEnabled: true,
        noindex: true,
        nofollow: false,
      },
      ogImage: {
        source: "local",
        storagePath: ogImage.storagePath,
        thumbnailPath: ogImage.thumbnailPath,
        externalUrl: null,
        altText: ogImage.altText,
        width: ogImage.width,
        height: ogImage.height,
      },
    });
    expect(result.post.publishedAt?.toISOString()).toBe(publishedAt.toISOString());
    expect(result.post.updatedAt.toISOString()).toBe(updatedAt.toISOString());
  });

  it("returns categoryPath in root-to-leaf order for nested categories", async () => {
    const seed = createSeed();
    const author = await createUser(`${seed}-nested`);
    const parentCategory = await createCategory(`${seed}-parent`);
    const childCategory = await createCategory(`${seed}-child`, parentCategory.id);
    const post = await createPost({
      authorId: author.id,
      categoryId: childCategory.id,
      title: "Nested category post",
      slug: buildSlug(`nested-category-post-${seed}`),
      excerpt: null,
      content: "<p>Nested category content</p>",
      status: "published",
      publishedAt: new Date("2026-03-26T15:00:00.000Z"),
      updatedAt: new Date("2026-03-26T15:05:00.000Z"),
    });

    await createPostMeta({
      postId: post.id,
      ogImageMediaId: null,
      metaTitle: "Nested SEO title",
      metaDescription: "Nested SEO description",
      ogTitle: "Nested OG title",
      ogDescription: "Nested OG description",
      canonicalUrl: "https://example.com/nested-canonical",
      breadcrumbEnabled: false,
      noindex: false,
      nofollow: false,
    });

    const result = await resolveSlug(post.slug);

    expect(result.kind).toBe("post");

    if (result.kind !== "post") {
      throw new Error("Expected a nested category post result.");
    }

    expect(result.post.category).toEqual({
      id: childCategory.id,
      name: childCategory.name,
      slug: childCategory.slug,
    });
    expect(result.post.categoryPath).toEqual([
      {
        id: parentCategory.id,
        name: parentCategory.name,
        slug: parentCategory.slug,
      },
      {
        id: childCategory.id,
        name: childCategory.name,
        slug: childCategory.slug,
      },
    ]);
    expect(result.post.seo.breadcrumbEnabled).toBe(false);
  });

  it("returns an empty categoryPath when the published post has no category", async () => {
    const seed = createSeed();
    const author = await createUser(`${seed}-uncategorized`);
    const post = await createPost({
      authorId: author.id,
      categoryId: null,
      title: "Uncategorized post",
      slug: buildSlug(`uncategorized-post-${seed}`),
      excerpt: null,
      content: "<p>Uncategorized content</p>",
      status: "published",
      publishedAt: new Date("2026-03-26T16:00:00.000Z"),
      updatedAt: new Date("2026-03-26T16:05:00.000Z"),
    });

    const result = await resolveSlug(post.slug);

    expect(result.kind).toBe("post");

    if (result.kind !== "post") {
      throw new Error("Expected an uncategorized post result.");
    }

    expect(result.post.category).toBeNull();
    expect(result.post.categoryPath).toEqual([]);
  });

  it("returns the first linked series for a published post", async () => {
    const seed = createSeed();
    const author = await createUser(`${seed}-series`);
    const post = await createPost({
      authorId: author.id,
      categoryId: null,
      title: "Series-linked post",
      slug: buildSlug(`series-linked-post-${seed}`),
      excerpt: null,
      content: "<p>Series-linked content</p>",
      status: "published",
      publishedAt: new Date("2026-03-26T17:00:00.000Z"),
      updatedAt: new Date("2026-03-26T17:05:00.000Z"),
    });
    const seriesItem = await createSeries(seed);

    await createPostSeries(post.id, seriesItem.id, 0);

    const result = await resolveSlug(post.slug);

    expect(result.kind).toBe("post");

    if (result.kind !== "post") {
      throw new Error("Expected a series-linked post result.");
    }

    expect(result.post.series).toEqual({
      id: seriesItem.id,
      name: seriesItem.name,
      slug: seriesItem.slug,
    });
  });

  it("returns null when the published post has no linked series", async () => {
    const seed = createSeed();
    const author = await createUser(`${seed}-no-series`);
    const post = await createPost({
      authorId: author.id,
      categoryId: null,
      title: "Post without series",
      slug: buildSlug(`no-series-post-${seed}`),
      excerpt: null,
      content: "<p>No series content</p>",
      status: "published",
      publishedAt: new Date("2026-03-26T18:00:00.000Z"),
      updatedAt: new Date("2026-03-26T18:05:00.000Z"),
    });

    const result = await resolveSlug(post.slug);

    expect(result.kind).toBe("post");

    if (result.kind !== "post") {
      throw new Error("Expected a post result without series.");
    }

    expect(result.post.series).toBeNull();
  });

  it("selects the linked series with the lowest order index and lowest series id tie-breaker", async () => {
    const seed = createSeed();
    const author = await createUser(`${seed}-multiple-series`);
    const post = await createPost({
      authorId: author.id,
      categoryId: null,
      title: "Multi-series post",
      slug: buildSlug(`multi-series-post-${seed}`),
      excerpt: null,
      content: "<p>Multi-series content</p>",
      status: "published",
      publishedAt: new Date("2026-03-26T19:00:00.000Z"),
      updatedAt: new Date("2026-03-26T19:05:00.000Z"),
    });
    const higherOrderSeries = await createSeries(`${seed}-higher-order`);
    const lowerIdTieWinner = await createSeries(`${seed}-tie-winner`);
    const higherIdTieLoser = await createSeries(`${seed}-tie-loser`);

    await createPostSeries(post.id, higherOrderSeries.id, 2);
    await createPostSeries(post.id, higherIdTieLoser.id, 0);
    await createPostSeries(post.id, lowerIdTieWinner.id, 0);

    const result = await resolveSlug(post.slug);

    expect(result.kind).toBe("post");

    if (result.kind !== "post") {
      throw new Error("Expected a multi-series post result.");
    }

    expect(result.post.series).toEqual({
      id: lowerIdTieWinner.id,
      name: lowerIdTieWinner.name,
      slug: lowerIdTieWinner.slug,
    });
  });

  it("returns a redirect when a published alias slug is requested", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const post = await createPost({
      authorId: author.id,
      categoryId: null,
      title: "Redirect target",
      slug: buildSlug(`current-slug-${seed}`),
      excerpt: null,
      content: "<p>Redirect target</p>",
      status: "published",
      publishedAt: new Date("2026-03-26T10:00:00.000Z"),
      updatedAt: new Date("2026-03-26T10:30:00.000Z"),
    });
    const aliasSlug = buildSlug(`legacy-slug-${seed}`);

    await createAlias(post.id, aliasSlug);

    await expect(resolveSlug(aliasSlug)).resolves.toEqual({
      kind: "redirect",
      currentSlug: post.slug,
    });
  });

  it("does not resolve alias slugs for draft or trash posts", async () => {
    for (const status of unpublishedStatuses) {
      const seed = createSeed();
      const author = await createUser(`${status}-${seed}`);
      const post = await createPost({
        authorId: author.id,
        categoryId: null,
        title: `${status} post`,
        slug: buildSlug(`${status}-post-${seed}`),
        excerpt: null,
        content: `<p>${status} content</p>`,
        status,
        publishedAt:
          status === "scheduled"
            ? new Date("2026-03-27T11:00:00.000Z")
            : null,
        updatedAt: new Date("2026-03-26T11:00:00.000Z"),
      });
      const aliasSlug = buildSlug(`${status}-alias-${seed}`);

      await createAlias(post.id, aliasSlug);

      await expect(resolveSlug(aliasSlug)).resolves.toEqual({ kind: "not-found" });
    }
  });

  it("does not resolve current slugs for draft or trash posts", async () => {
    for (const status of unpublishedStatuses) {
      const seed = createSeed();
      const author = await createUser(`${status}-${seed}`);
      const post = await createPost({
        authorId: author.id,
        categoryId: null,
        title: `${status} current slug`,
        slug: buildSlug(`${status}-current-${seed}`),
        excerpt: null,
        content: `<p>${status} current content</p>`,
        status,
        publishedAt:
          status === "scheduled"
            ? new Date("2026-03-27T12:00:00.000Z")
            : null,
        updatedAt: new Date("2026-03-26T12:00:00.000Z"),
      });

      await expect(resolveSlug(post.slug)).resolves.toEqual({ kind: "not-found" });
    }
  });

  it("normalizes whitespace and casing for current and alias slugs", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const post = await createPost({
      authorId: author.id,
      categoryId: null,
      title: "Normalization post",
      slug: buildSlug(`normalized-slug-${seed}`),
      excerpt: null,
      content: "<p>Normalization content</p>",
      status: "published",
      publishedAt: new Date("2026-03-26T13:00:00.000Z"),
      updatedAt: new Date("2026-03-26T13:30:00.000Z"),
    });
    const aliasSlug = buildSlug(`legacy-normalized-${seed}`);

    await createAlias(post.id, aliasSlug);

    const postResult = await resolveSlug(`  ${post.slug.toUpperCase()}  `);

    expect(postResult.kind).toBe("post");

    if (postResult.kind !== "post") {
      throw new Error("Expected normalized current slug to resolve to a post.");
    }

    expect(postResult.post.slug).toBe(post.slug);

    await expect(resolveSlug(`  ${aliasSlug.toUpperCase()}  `)).resolves.toEqual({
      kind: "redirect",
      currentSlug: post.slug,
    });
  });
});

describe("listRelatedPublishedPosts", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    await ensureIntegrationAdminPath();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it(
    "prioritizes same-category posts before shared-tag fallbacks and limits results " +
      "to four unique posts",
    async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const primaryCategory = await createCategory(`${seed}-primary`);
    const secondaryCategory = await createCategory(`${seed}-secondary`);
    const sharedTag = await createTag(seed, "shared");

    const primaryPost = await createPost({
      authorId: author.id,
      categoryId: primaryCategory.id,
      title: "Primary related source",
      slug: buildSlug(`related-primary-${seed}`),
      excerpt: null,
      content: "<p>Primary related source</p>",
      status: "published",
      publishedAt: new Date("2026-03-27T15:00:00.000Z"),
      updatedAt: new Date("2026-03-27T15:10:00.000Z"),
    });
    const categoryAndTagPost = await createPost({
      authorId: author.id,
      categoryId: primaryCategory.id,
      title: "Category and tag related",
      slug: buildSlug(`related-category-tag-${seed}`),
      excerpt: null,
      content: "<p>Category and tag related</p>",
      status: "published",
      publishedAt: new Date("2026-03-27T14:00:00.000Z"),
      updatedAt: new Date("2026-03-27T14:10:00.000Z"),
    });
    const categoryOnlyPost = await createPost({
      authorId: author.id,
      categoryId: primaryCategory.id,
      title: "Category only related",
      slug: buildSlug(`related-category-only-${seed}`),
      excerpt: null,
      content: "<p>Category only related</p>",
      status: "published",
      publishedAt: new Date("2026-03-27T13:00:00.000Z"),
      updatedAt: new Date("2026-03-27T13:10:00.000Z"),
    });
    const tagFallbackOne = await createPost({
      authorId: author.id,
      categoryId: secondaryCategory.id,
      title: "Tag fallback one",
      slug: buildSlug(`related-tag-one-${seed}`),
      excerpt: null,
      content: "<p>Tag fallback one</p>",
      status: "published",
      publishedAt: new Date("2026-03-27T12:00:00.000Z"),
      updatedAt: new Date("2026-03-27T12:10:00.000Z"),
    });
    const tagFallbackTwo = await createPost({
      authorId: author.id,
      categoryId: null,
      title: "Tag fallback two",
      slug: buildSlug(`related-tag-two-${seed}`),
      excerpt: null,
      content: "<p>Tag fallback two</p>",
      status: "published",
      publishedAt: new Date("2026-03-27T11:00:00.000Z"),
      updatedAt: new Date("2026-03-27T11:10:00.000Z"),
    });
    const extraTagFallback = await createPost({
      authorId: author.id,
      categoryId: secondaryCategory.id,
      title: "Extra tag fallback",
      slug: buildSlug(`related-tag-extra-${seed}`),
      excerpt: null,
      content: "<p>Extra tag fallback</p>",
      status: "published",
      publishedAt: new Date("2026-03-27T10:00:00.000Z"),
      updatedAt: new Date("2026-03-27T10:10:00.000Z"),
    });
    const draftSharedPost = await createPost({
      authorId: author.id,
      categoryId: secondaryCategory.id,
      title: "Draft shared tag",
      slug: buildSlug(`related-draft-${seed}`),
      excerpt: null,
      content: "<p>Draft shared tag</p>",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-03-27T09:10:00.000Z"),
    });

    await createPostTag(primaryPost.id, sharedTag.id);
    await createPostTag(categoryAndTagPost.id, sharedTag.id);
    await createPostTag(tagFallbackOne.id, sharedTag.id);
    await createPostTag(tagFallbackTwo.id, sharedTag.id);
    await createPostTag(extraTagFallback.id, sharedTag.id);
    await createPostTag(draftSharedPost.id, sharedTag.id);

    const relatedPosts = await listRelatedPosts({
      postId: primaryPost.id,
      categoryId: primaryCategory.id,
      tagIds: [sharedTag.id],
    });

    expect(relatedPosts.map((post) => post.slug)).toEqual([
      categoryAndTagPost.slug,
      categoryOnlyPost.slug,
      tagFallbackOne.slug,
      tagFallbackTwo.slug,
    ]);
    expect(relatedPosts).toHaveLength(4);
  });

  it("falls back to shared tags when the primary post has no category", async () => {
    const seed = createSeed();
    const author = await createUser(`${seed}-no-category`);
    const secondaryCategory = await createCategory(`${seed}-fallback`);
    const sharedTag = await createTag(`${seed}-no-category`, "shared");
    const otherTag = await createTag(`${seed}-no-category`, "other");

    const primaryPost = await createPost({
      authorId: author.id,
      categoryId: null,
      title: "Primary without category",
      slug: buildSlug(`related-no-category-primary-${seed}`),
      excerpt: null,
      content: "<p>Primary without category</p>",
      status: "published",
      publishedAt: new Date("2026-03-27T08:00:00.000Z"),
      updatedAt: new Date("2026-03-27T08:10:00.000Z"),
    });
    const sharedTagPost = await createPost({
      authorId: author.id,
      categoryId: secondaryCategory.id,
      title: "Shared tag match",
      slug: buildSlug(`related-no-category-match-${seed}`),
      excerpt: null,
      content: "<p>Shared tag match</p>",
      status: "published",
      publishedAt: new Date("2026-03-27T07:00:00.000Z"),
      updatedAt: new Date("2026-03-27T07:10:00.000Z"),
    });
    const unrelatedPost = await createPost({
      authorId: author.id,
      categoryId: secondaryCategory.id,
      title: "Unrelated tag post",
      slug: buildSlug(`related-no-category-unrelated-${seed}`),
      excerpt: null,
      content: "<p>Unrelated tag post</p>",
      status: "published",
      publishedAt: new Date("2026-03-27T06:00:00.000Z"),
      updatedAt: new Date("2026-03-27T06:10:00.000Z"),
    });

    await createPostTag(primaryPost.id, sharedTag.id);
    await createPostTag(sharedTagPost.id, sharedTag.id);
    await createPostTag(unrelatedPost.id, otherTag.id);

    const relatedPosts = await listRelatedPosts({
      postId: primaryPost.id,
      categoryId: null,
      tagIds: [sharedTag.id],
    });

    expect(relatedPosts.map((post) => post.slug)).toEqual([sharedTagPost.slug]);
  });

  it("deduplicates fallback matches when a related post shares multiple tags", async () => {
    const seed = createSeed();
    const author = await createUser(`${seed}-multi-tag`);
    const firstTag = await createTag(`${seed}-multi-tag`, "first");
    const secondTag = await createTag(`${seed}-multi-tag`, "second");

    const primaryPost = await createPost({
      authorId: author.id,
      categoryId: null,
      title: "Primary multi-tag source",
      slug: buildSlug(`related-multi-tag-primary-${seed}`),
      excerpt: null,
      content: "<p>Primary multi-tag source</p>",
      status: "published",
      publishedAt: new Date("2026-03-27T05:00:00.000Z"),
      updatedAt: new Date("2026-03-27T05:10:00.000Z"),
    });
    const dualTagPost = await createPost({
      authorId: author.id,
      categoryId: null,
      title: "Dual tag fallback",
      slug: buildSlug(`related-multi-tag-dual-${seed}`),
      excerpt: null,
      content: "<p>Dual tag fallback</p>",
      status: "published",
      publishedAt: new Date("2026-03-27T04:00:00.000Z"),
      updatedAt: new Date("2026-03-27T04:10:00.000Z"),
    });
    const singleTagPost = await createPost({
      authorId: author.id,
      categoryId: null,
      title: "Single tag fallback",
      slug: buildSlug(`related-multi-tag-single-${seed}`),
      excerpt: null,
      content: "<p>Single tag fallback</p>",
      status: "published",
      publishedAt: new Date("2026-03-27T03:00:00.000Z"),
      updatedAt: new Date("2026-03-27T03:10:00.000Z"),
    });

    await createPostTag(primaryPost.id, firstTag.id);
    await createPostTag(primaryPost.id, secondTag.id);
    await createPostTag(dualTagPost.id, firstTag.id);
    await createPostTag(dualTagPost.id, secondTag.id);
    await createPostTag(singleTagPost.id, secondTag.id);

    const relatedPosts = await listRelatedPosts({
      postId: primaryPost.id,
      categoryId: null,
      tagIds: [firstTag.id, secondTag.id],
    });

    expect(relatedPosts.map((post) => post.slug)).toEqual([
      dualTagPost.slug,
      singleTagPost.slug,
    ]);
  });
});

function createSeed() {
  return randomUUID().replaceAll("-", "");
}

function buildSlug(value: string) {
  return `${INTEGRATION_PREFIX}${value}`;
}

function buildIntegrationUsername(seed: string) {
  const normalizedSeed = seed.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const maxSeedLength = 64 - INTEGRATION_PREFIX.length;

  return `${INTEGRATION_PREFIX}${normalizedSeed}`.slice(0, INTEGRATION_PREFIX.length + maxSeedLength);
}

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

async function resolveSlug(slug: string) {
  const { resolvePublishedPostBySlug } = await import("@/lib/blog/posts");
  return resolvePublishedPostBySlug(slug);
}

async function listRelatedPosts(input: { postId: number; categoryId: number | null; tagIds: number[] }) {
  const { listRelatedPublishedPosts } = await import("@/lib/blog/posts");
  return listRelatedPublishedPosts(input);
}

async function ensureIntegrationAdminPath() {
  const db = await getDb();

  await db
    .insert(settings)
    .values({
      key: `${INTEGRATION_PREFIX}admin_path_guard`,
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
  const username = buildIntegrationUsername(seed);
  const displayName = `Author ${seed}`;
  const [user] = await db
    .insert(users)
    .values({
      email: `${normalizedSeed}@example.com`,
      username,
      displayName,
      passwordHash: "hashed-password",
      role: "author",
    })
    .returning({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
    });

  return user;
}

async function createCategory(seed: string, parentId: number | null = null) {
  const db = await getDb();
  const [category] = await db
    .insert(categories)
    .values({
      name: `Category ${seed}`,
      slug: buildSlug(`category-${seed}`),
      description: `Category description ${seed}`,
      parentId,
    })
    .returning({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    });

  return category;
}

async function createTag(seed: string, suffix: string) {
  const db = await getDb();
  const [tag] = await db
    .insert(tags)
    .values({
      name: `Tag ${suffix} ${seed}`,
      slug: buildSlug(`tag-${suffix}-${seed}`),
      description: `Tag ${suffix} description ${seed}`,
    })
    .returning({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
    });

  return tag;
}

async function createSeries(seed: string) {
  const db = await getDb();
  const [seriesItem] = await db
    .insert(series)
    .values({
      name: `Series ${seed}`,
      slug: buildSlug(`series-${seed}`),
      description: `Series description ${seed}`,
    })
    .returning({
      id: series.id,
      name: series.name,
      slug: series.slug,
    });

  return seriesItem;
}

async function createPostSeries(postId: number, seriesId: number, orderIndex: number) {
  const db = await getDb();

  await db.insert(postSeries).values({
    postId,
    seriesId,
    orderIndex,
  });
}

async function createPost(input: {
  authorId: number;
  categoryId: number | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: "draft" | "published" | "scheduled" | "trash";
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
  await db.insert(postTags).values({ postId, tagId });
}

async function createLocalOgImage(seed: string, uploaderId: number) {
  const db = await getDb();
  const storagePath = `uploads/images/2026/03/${INTEGRATION_PREFIX}og-${seed}.webp`;
  const thumbnailPath = `uploads/images/2026/03/${INTEGRATION_PREFIX}og-${seed}-thumb.webp`;
  const altText = `${INTEGRATION_PREFIX}OG image ${seed}`;
  const width = 1200;
  const height = 630;
  const [image] = await db
    .insert(media)
    .values({
      uploaderId,
      source: "local",
      storagePath,
      thumbnailPath,
      altText,
      width,
      height,
    })
    .returning({
      id: media.id,
      storagePath: media.storagePath,
      thumbnailPath: media.thumbnailPath,
      altText: media.altText,
      width: media.width,
      height: media.height,
    });

  return image;
}

async function createPostMeta(input: {
  postId: number;
  ogImageMediaId: number | null;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  breadcrumbEnabled: boolean;
  noindex: boolean;
  nofollow: boolean;
}) {
  const db = await getDb();

  await db.insert(postMeta).values(input);
}

async function createAlias(postId: number, slug: string) {
  const db = await getDb();
  const { postSlugAliases } = await import("@/lib/db/schema");

  await db.insert(postSlugAliases).values({
    postId,
    slug,
  });
}

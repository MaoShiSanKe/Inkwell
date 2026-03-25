import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { media, postMeta, posts, settings, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
const unpublishedStatuses = ["draft", "trash"] as const;

describe("resolvePublishedPostBySlug", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    await ensureIntegrationAdminPath();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("returns a published post with joined author and SEO data for the current slug", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const ogImage = await createLocalOgImage(seed, author.id);
    const publishedAt = new Date("2026-03-26T08:00:00.000Z");
    const updatedAt = new Date("2026-03-26T09:30:00.000Z");
    const post = await createPost({
      authorId: author.id,
      title: "Published slug history post",
      slug: buildSlug(`published-post-${seed}`),
      excerpt: "Published excerpt",
      content: "<p>Published content</p>",
      status: "published",
      publishedAt,
      updatedAt,
    });

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
      },
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

  it("returns a redirect when a published alias slug is requested", async () => {
    const seed = createSeed();
    const author = await createUser(seed);
    const post = await createPost({
      authorId: author.id,
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
        title: `${status} post`,
        slug: buildSlug(`${status}-post-${seed}`),
        excerpt: null,
        content: `<p>${status} content</p>`,
        status,
        publishedAt: null,
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
        title: `${status} current slug`,
        slug: buildSlug(`${status}-current-${seed}`),
        excerpt: null,
        content: `<p>${status} current content</p>`,
        status,
        publishedAt: null,
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

async function resolveSlug(slug: string) {
  const { resolvePublishedPostBySlug } = await import("@/lib/blog/posts");
  return resolvePublishedPostBySlug(slug);
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
      slug: posts.slug,
    });

  return post;
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
  ogImageMediaId: number;
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

import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  postLikes,
  postRevisions,
  postSlugAliases,
  posts,
  postViews,
  settings,
  sitemapEntries,
  users,
} from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
const {
  getAdminSessionMock,
  notifyPostPublishedMock,
  syncPublishedPostToSearchIndexMock,
  removePublishedPostFromSearchIndexMock,
} = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  notifyPostPublishedMock: vi.fn(),
  syncPublishedPostToSearchIndexMock: vi.fn(),
  removePublishedPostFromSearchIndexMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("@/lib/email-notifications", () => ({
  notifyPostPublished: notifyPostPublishedMock,
}));

vi.mock("@/lib/meilisearch", async () => {
  const actual = await vi.importActual<typeof import("@/lib/meilisearch")>("@/lib/meilisearch");

  return {
    ...actual,
    syncPublishedPostToSearchIndex: syncPublishedPostToSearchIndexMock,
    removePublishedPostFromSearchIndex: removePublishedPostFromSearchIndexMock,
  };
});

describe("admin slug-history write paths", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    getAdminSessionMock.mockReset();
    notifyPostPublishedMock.mockReset();
    syncPublishedPostToSearchIndexMock.mockReset();
    removePublishedPostFromSearchIndexMock.mockReset();
    notifyPostPublishedMock.mockResolvedValue({
      scenario: "post_published",
      attempted: false,
      deliveries: [],
    });
    syncPublishedPostToSearchIndexMock.mockResolvedValue(true);
    removePublishedPostFromSearchIndexMock.mockResolvedValue(true);
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("updates a published post slug, records the old slug as an alias, and refreshes public resolution", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(seed);
    const originalSlug = buildSlug(`current-${seed}`);
    const nextSlug = normalizeWriteSlug(`Integration Test Fresh Slug ${seed}`);
    const post = await createPost({
      authorId: editor.id,
      title: "Original title",
      slug: originalSlug,
      excerpt: "Original excerpt",
      content: "Original content",
      status: "published",
      publishedAt: new Date("2026-03-26T16:00:00.000Z"),
      updatedAt: new Date("2026-03-26T16:10:00.000Z"),
    });

    await createSitemapEntry(post.id, originalSlug);

    const result = await updatePost(post.id, {
      title: "Updated title",
      slug: `  Integration Test Fresh Slug ${seed}  `,
      excerpt: "",
      content: "Updated content body",
      status: "published",
    });

    expect(result).toMatchObject({
      success: true,
      postId: post.id,
      affectedSlugs: [originalSlug, nextSlug],
    });

    const persistedPost = await getPost(post.id);
    expect(persistedPost).toMatchObject({
      slug: nextSlug,
      title: "Updated title",
      status: "published",
    });
    expect(persistedPost?.publishedAt).not.toBeNull();

    await expect(listAliases(post.id)).resolves.toEqual([originalSlug]);
    await expect(resolveSlug(nextSlug)).resolves.toMatchObject({ kind: "post" });
    await expect(resolveSlug(originalSlug)).resolves.toEqual({
      kind: "redirect",
      currentSlug: nextSlug,
    });

    const sitemap = await getSitemapEntry(post.id);
    expect(sitemap?.loc).toBe(`/post/${nextSlug}`);

    const latestRevision = await getLatestRevision(post.id);
    expect(latestRevision).toMatchObject({
      editorId: editor.id,
      status: "published",
      reason: "manual update",
      title: "Updated title",
    });
    expect(notifyPostPublishedMock).not.toHaveBeenCalled();
  });

  it("lists revisions and restores a revision as the current draft", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(`${seed}-revisions`);
    const post = await createPost({
      authorId: editor.id,
      title: "Published title",
      slug: buildSlug(`revision-post-${seed}`),
      excerpt: "Published excerpt",
      content: "Published content",
      status: "published",
      publishedAt: new Date("2026-03-26T17:00:00.000Z"),
      updatedAt: new Date("2026-03-26T17:10:00.000Z"),
    });

    await createSitemapEntry(post.id, post.slug);
    await createRevision({
      postId: post.id,
      editorId: editor.id,
      title: "Published title",
      excerpt: "Published excerpt",
      content: "Published content",
      status: "published",
      reason: "initial create",
    });

    await updatePost(post.id, {
      title: "Draft title after publish",
      slug: post.slug,
      excerpt: "",
      content: "Draft content after publish",
      status: "draft",
    });

    const { listAdminPostRevisions, restoreAdminPostRevision } = await import("@/lib/admin/posts");
    const revisions = await listAdminPostRevisions(post.id);

    expect(revisions.length).toBeGreaterThanOrEqual(2);
    expect(revisions[0]).toMatchObject({
      title: "Draft title after publish",
      status: "draft",
      reason: "manual update",
    });
    expect(revisions[1]).toMatchObject({
      title: "Published title",
      status: "published",
      reason: "initial create",
    });

    removePublishedPostFromSearchIndexMock.mockClear();

    const restoreResult = await restoreAdminPostRevision(post.id, revisions[1].id);

    expect(restoreResult).toMatchObject({
      success: true,
      postId: post.id,
      affectedSlugs: [post.slug],
    });

    const restoredPost = await getPost(post.id);
    expect(restoredPost).toMatchObject({
      title: "Published title",
      status: "draft",
      publishedAt: null,
    });
    expect(await getSitemapEntry(post.id)).toBeNull();

    const latestRevision = await getLatestRevision(post.id);
    expect(latestRevision).toMatchObject({
      title: "Published title",
      status: "draft",
      reason: "restored from revision",
    });
    expect(removePublishedPostFromSearchIndexMock).toHaveBeenCalledTimes(1);
    expect(removePublishedPostFromSearchIndexMock).toHaveBeenCalledWith(post.id);
  });

  it("rejects invalid revision restore requests", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(`${seed}-invalid-rev`);
    const post = await createPost({
      authorId: editor.id,
      title: "Invalid restore target",
      slug: buildSlug(`invalid-revision-${seed}`),
      excerpt: null,
      content: "Invalid revision content",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-03-26T17:20:00.000Z"),
    });

    const { restoreAdminPostRevision } = await import("@/lib/admin/posts");
    const result = await restoreAdminPostRevision(post.id, 999999);

    expect(result).toMatchObject({
      success: false,
      errors: {
        form: "修订记录不存在。",
      },
    });
  });

  it("preserves scheduled status and publishedAt when updating a scheduled post", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(`${seed}-scheduled`);
    const scheduledAt = new Date("2026-04-05T08:30:00.000Z");
    const post = await createPost({
      authorId: editor.id,
      title: "Scheduled title",
      slug: buildSlug(`scheduled-${seed}`),
      excerpt: "Scheduled excerpt",
      content: "Scheduled content",
      status: "scheduled",
      publishedAt: scheduledAt,
      updatedAt: new Date("2026-03-26T16:10:00.000Z"),
    });

    const { getAdminPostEditorData, updateAdminPost } = await import("@/lib/admin/posts");
    const editorData = await getAdminPostEditorData(post.id);

    expect(editorData?.currentStatus).toBe("scheduled");
    expect(editorData?.values.status).toBe("scheduled");
    expect(editorData?.values.scheduledAtIso).toBe(scheduledAt.toISOString());

    const result = await updateAdminPost(post.id, {
      title: "Scheduled title updated",
      slug: post.slug,
      categoryId: "",
      excerpt: "Scheduled excerpt updated",
      content: "Scheduled content updated",
      status: "scheduled",
      scheduledAt: editorData?.values.scheduledAt ?? "",
      scheduledAtIso: editorData?.values.scheduledAtIso ?? "",
      tagIds: [],
      seriesIds: [],
      metaTitle: "",
      metaDescription: "",
      ogTitle: "",
      ogDescription: "",
      canonicalUrl: "",
      breadcrumbEnabled: false,
      noindex: false,
      nofollow: false,
    });

    expect(result).toMatchObject({ success: true, postId: post.id });

    const persistedPost = await getPost(post.id);
    expect(persistedPost?.status).toBe("scheduled");
    expect(persistedPost?.publishedAt?.toISOString()).toBe(scheduledAt.toISOString());
    expect(notifyPostPublishedMock).not.toHaveBeenCalled();
  });

  it("prunes revisions by revision_limit after post updates", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(`${seed}-prune`);
    const db = await getDb();
    await upsertSetting("revision_limit", "2");
    await upsertSetting("revision_ttl_days", "0");

    const post = await createPost({
      authorId: editor.id,
      title: "Revision prune title",
      slug: buildSlug(`revision-prune-${seed}`),
      excerpt: "Revision prune excerpt",
      content: "Revision prune content",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-03-26T16:10:00.000Z"),
    });

    await updatePost(post.id, {
      title: "Revision prune title 1",
      slug: post.slug,
      excerpt: "",
      content: "Revision prune content 1",
      status: "draft",
    });
    await updatePost(post.id, {
      title: "Revision prune title 2",
      slug: post.slug,
      excerpt: "",
      content: "Revision prune content 2",
      status: "draft",
    });
    await updatePost(post.id, {
      title: "Revision prune title 3",
      slug: post.slug,
      excerpt: "",
      content: "Revision prune content 3",
      status: "draft",
    });

    const revisionRows = await db
      .select({ id: postRevisions.id })
      .from(postRevisions)
      .where(eq(postRevisions.postId, post.id));

    expect(revisionRows).toHaveLength(2);
  });

  it("syncs the search index when creating and updating published posts", async () => {
    const seed = createSeed();
    await signInAsEditor(`${seed}-search-sync`);

    const { createAdminPost, updateAdminPost } = await import("@/lib/admin/posts");
    const createResult = await createAdminPost({
      title: "Search synced publish",
      slug: buildSlug(`search-sync-${seed}`),
      categoryId: "",
      excerpt: "Search synced excerpt",
      content: "<p>Search synced content</p>",
      status: "published",
      tagIds: [],
      seriesIds: [],
      metaTitle: "",
      metaDescription: "",
      ogTitle: "",
      ogDescription: "",
      canonicalUrl: "",
      breadcrumbEnabled: false,
      noindex: false,
      nofollow: false,
    });

    expect(createResult).toMatchObject({ success: true });

    if (!createResult.success) {
      throw new Error("Expected published post creation to succeed.");
    }

    expect(syncPublishedPostToSearchIndexMock).toHaveBeenCalledTimes(1);
    expect(removePublishedPostFromSearchIndexMock).not.toHaveBeenCalled();

    const createdDocument = syncPublishedPostToSearchIndexMock.mock.calls[0]?.[0];
    expect(createdDocument).toMatchObject({
      id: createResult.postId,
      title: "Search synced publish",
      slug: buildSlug(`search-sync-${seed}`),
      excerpt: "Search synced excerpt",
      publishedAt: expect.stringMatching(/2026-|\d{4}-\d{2}-\d{2}T/),
    });
    expect(createdDocument.contentPlainText).toContain("Search synced content");

    syncPublishedPostToSearchIndexMock.mockClear();
    removePublishedPostFromSearchIndexMock.mockClear();

    const updateResult = await updateAdminPost(createResult.postId, {
      title: "Search synced publish updated",
      slug: buildSlug(`search-sync-updated-${seed}`),
      categoryId: "",
      excerpt: "Updated search excerpt",
      content: "<p>Updated search content body</p>",
      status: "published",
      tagIds: [],
      seriesIds: [],
      metaTitle: "",
      metaDescription: "",
      ogTitle: "",
      ogDescription: "",
      canonicalUrl: "",
      breadcrumbEnabled: false,
      noindex: false,
      nofollow: false,
    });

    expect(updateResult).toMatchObject({ success: true, postId: createResult.postId });
    expect(syncPublishedPostToSearchIndexMock).toHaveBeenCalledTimes(1);
    expect(removePublishedPostFromSearchIndexMock).not.toHaveBeenCalled();

    const updatedDocument = syncPublishedPostToSearchIndexMock.mock.calls[0]?.[0];
    expect(updatedDocument).toMatchObject({
      id: createResult.postId,
      title: "Search synced publish updated",
      slug: buildSlug(`search-sync-updated-${seed}`),
      excerpt: "Updated search excerpt",
    });
    expect(updatedDocument.contentPlainText).toContain("Updated search content body");
  });

  it("removes published posts from the search index when they leave the public surface", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(`${seed}-search-remove`);
    const post = await createPost({
      authorId: editor.id,
      title: "Search removal post",
      slug: buildSlug(`search-removal-${seed}`),
      excerpt: "Search removal excerpt",
      content: "Search removal content",
      status: "published",
      publishedAt: new Date("2026-03-27T10:00:00.000Z"),
      updatedAt: new Date("2026-03-27T12:00:00.000Z"),
    });

    const { moveAdminPostToTrash, restoreAdminPostFromTrash, updateAdminPost } = await import(
      "@/lib/admin/posts"
    );

    removePublishedPostFromSearchIndexMock.mockClear();

    const trashResult = await moveAdminPostToTrash(post.id);
    expect(trashResult).toMatchObject({ success: true, postId: post.id });
    expect(removePublishedPostFromSearchIndexMock).toHaveBeenCalledTimes(1);
    expect(removePublishedPostFromSearchIndexMock).toHaveBeenLastCalledWith(post.id);

    removePublishedPostFromSearchIndexMock.mockClear();

    const restoreResult = await restoreAdminPostFromTrash(post.id);
    expect(restoreResult).toMatchObject({ success: true, postId: post.id });
    expect(removePublishedPostFromSearchIndexMock).toHaveBeenCalledTimes(1);
    expect(removePublishedPostFromSearchIndexMock).toHaveBeenLastCalledWith(post.id);

    removePublishedPostFromSearchIndexMock.mockClear();

    const unpublishResult = await updateAdminPost(post.id, {
      title: "Search removal post draft",
      slug: post.slug,
      categoryId: "",
      excerpt: "Search removal excerpt",
      content: "Search removal content",
      status: "draft",
      tagIds: [],
      seriesIds: [],
      metaTitle: "",
      metaDescription: "",
      ogTitle: "",
      ogDescription: "",
      canonicalUrl: "",
      breadcrumbEnabled: false,
      noindex: false,
      nofollow: false,
    });

    expect(unpublishResult).toMatchObject({ success: true, postId: post.id });
    expect(removePublishedPostFromSearchIndexMock).toHaveBeenCalledTimes(1);
    expect(removePublishedPostFromSearchIndexMock).toHaveBeenLastCalledWith(post.id);
  });

  it("syncs the search index when due scheduled posts are published", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(`${seed}-sched-sync`);
    const dueAt = new Date("2026-03-28T08:00:00.000Z");
    const duePost = await createPost({
      authorId: editor.id,
      title: "Due search indexed post",
      slug: buildSlug(`due-search-indexed-${seed}`),
      excerpt: null,
      content: "Due search indexed content",
      status: "scheduled",
      publishedAt: dueAt,
      updatedAt: new Date("2026-03-27T16:10:00.000Z"),
    });

    const { publishScheduledPosts } = await import("@/lib/admin/posts");

    syncPublishedPostToSearchIndexMock.mockClear();

    const result = await publishScheduledPosts(new Date("2026-03-29T00:00:00.000Z"));

    expect(result).toMatchObject({
      publishedCount: 1,
      publishedPostIds: [duePost.id],
      affectedSlugs: [duePost.slug],
    });
    expect(syncPublishedPostToSearchIndexMock).toHaveBeenCalledTimes(1);

    const indexedDocument = syncPublishedPostToSearchIndexMock.mock.calls[0]?.[0];
    expect(indexedDocument).toMatchObject({
      id: duePost.id,
      title: "Due search indexed post",
      slug: duePost.slug,
      excerpt: null,
    });
    expect(indexedDocument.contentPlainText).toContain("Due search indexed content");
  });

  it("returns engagement counts for admin post list and editor data", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(`${seed}-engagement`);
    const scheduledPost = await createPost({
      authorId: editor.id,
      title: "Scheduled engagement title",
      slug: buildSlug(`scheduled-engagement-${seed}`),
      excerpt: "Scheduled engagement excerpt",
      content: "Scheduled engagement content",
      status: "scheduled",
      publishedAt: new Date("2026-04-08T08:30:00.000Z"),
      updatedAt: new Date("2026-03-28T16:10:00.000Z"),
    });
    const quietPost = await createPost({
      authorId: editor.id,
      title: "Quiet draft title",
      slug: buildSlug(`quiet-draft-${seed}`),
      excerpt: null,
      content: "Quiet draft content",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-03-28T15:10:00.000Z"),
    });

    await createViewCount(scheduledPost.id, "2026-03-25", 3);
    await createViewCount(scheduledPost.id, "2026-03-26", 2);
    await createLike(scheduledPost.id, "203.0.113.10");
    await createLike(scheduledPost.id, "203.0.113.11");

    const { getAdminPostEditorData, listAdminPosts } = await import("@/lib/admin/posts");
    const adminPosts = await listAdminPosts();
    const scheduledListItem = adminPosts.find((post) => post.id === scheduledPost.id);
    const quietListItem = adminPosts.find((post) => post.id === quietPost.id);

    expect(scheduledListItem).toMatchObject({
      id: scheduledPost.id,
      status: "scheduled",
      viewCount: 5,
      likeCount: 2,
    });
    expect(quietListItem).toMatchObject({
      id: quietPost.id,
      status: "draft",
      viewCount: 0,
      likeCount: 0,
    });

    const editorData = await getAdminPostEditorData(scheduledPost.id);

    expect(editorData).not.toBeNull();
    expect(editorData?.currentStatus).toBe("scheduled");
    expect(editorData?.engagement).toEqual({
      viewCount: 5,
      likeCount: 2,
    });
  });

  it("notifies subscribers when a draft is published for the first time", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(`${seed}-publish-now`);
    const post = await createPost({
      authorId: editor.id,
      title: "Draft to publish",
      slug: buildSlug(`draft-to-publish-${seed}`),
      excerpt: "Draft excerpt",
      content: "Draft content",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date("2026-03-27T12:00:00.000Z"),
    });

    const { updateAdminPost } = await import("@/lib/admin/posts");
    const result = await updateAdminPost(post.id, {
      title: "Draft to publish",
      slug: post.slug,
      categoryId: "",
      excerpt: "Draft excerpt",
      content: "Draft content",
      status: "published",
      tagIds: [],
      seriesIds: [],
      metaTitle: "",
      metaDescription: "",
      ogTitle: "",
      ogDescription: "",
      canonicalUrl: "",
      breadcrumbEnabled: false,
      noindex: false,
      nofollow: false,
    });

    expect(result).toMatchObject({ success: true, postId: post.id });
    expect(notifyPostPublishedMock).toHaveBeenCalledTimes(1);
    expect(notifyPostPublishedMock).toHaveBeenCalledWith({
      postId: post.id,
      postSlug: post.slug,
      postTitle: "Draft to publish",
      excerpt: "Draft excerpt",
    });
  });

  it("does not re-notify subscribers when updating an already published post", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(`${seed}-republish`);
    const post = await createPost({
      authorId: editor.id,
      title: "Already published",
      slug: buildSlug(`already-published-${seed}`),
      excerpt: "Published excerpt",
      content: "Published content",
      status: "published",
      publishedAt: new Date("2026-03-27T10:00:00.000Z"),
      updatedAt: new Date("2026-03-27T12:00:00.000Z"),
    });

    const { updateAdminPost } = await import("@/lib/admin/posts");
    const result = await updateAdminPost(post.id, {
      title: "Already published updated",
      slug: post.slug,
      categoryId: "",
      excerpt: "Published excerpt",
      content: "Published content updated",
      status: "published",
      tagIds: [],
      seriesIds: [],
      metaTitle: "",
      metaDescription: "",
      ogTitle: "",
      ogDescription: "",
      canonicalUrl: "",
      breadcrumbEnabled: false,
      noindex: false,
      nofollow: false,
    });

    expect(result).toMatchObject({ success: true, postId: post.id });
    expect(notifyPostPublishedMock).not.toHaveBeenCalled();
  });

  it("publishes due scheduled posts and updates sitemap entries", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(`${seed}-auto-publish`);
    const dueAt = new Date("2026-03-28T08:00:00.000Z");
    const futureAt = new Date("2026-04-28T08:00:00.000Z");
    const duePost = await createPost({
      authorId: editor.id,
      title: "Due scheduled post",
      slug: buildSlug(`due-scheduled-${seed}`),
      excerpt: null,
      content: "Due scheduled content",
      status: "scheduled",
      publishedAt: dueAt,
      updatedAt: new Date("2026-03-27T16:10:00.000Z"),
    });
    const futurePost = await createPost({
      authorId: editor.id,
      title: "Future scheduled post",
      slug: buildSlug(`future-scheduled-${seed}`),
      excerpt: null,
      content: "Future scheduled content",
      status: "scheduled",
      publishedAt: futureAt,
      updatedAt: new Date("2026-03-27T16:10:00.000Z"),
    });

    const { publishScheduledPosts } = await import("@/lib/admin/posts");
    const result = await publishScheduledPosts(new Date("2026-03-29T00:00:00.000Z"));

    expect(result).toMatchObject({
      publishedCount: 1,
      publishedPostIds: [duePost.id],
      affectedSlugs: [duePost.slug],
    });

    const persistedDuePost = await getPost(duePost.id);
    const persistedFuturePost = await getPost(futurePost.id);
    expect(persistedDuePost?.status).toBe("published");
    expect(persistedFuturePost?.status).toBe("scheduled");
    expect((await getSitemapEntry(duePost.id))?.loc).toBe(`/post/${duePost.slug}`);
    expect(notifyPostPublishedMock).toHaveBeenCalledTimes(1);
    expect(notifyPostPublishedMock).toHaveBeenCalledWith({
      postId: duePost.id,
      postSlug: duePost.slug,
      postTitle: "Due scheduled post",
      excerpt: null,
    });
  });

  it("publishes nothing when no scheduled post is due", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(`${seed}-no-due`);
    const futureAt = new Date("2026-04-28T08:00:00.000Z");
    await createPost({
      authorId: editor.id,
      title: "Future only scheduled post",
      slug: buildSlug(`future-only-${seed}`),
      excerpt: null,
      content: "Future only content",
      status: "scheduled",
      publishedAt: futureAt,
      updatedAt: new Date("2026-03-27T16:10:00.000Z"),
    });

    const { publishScheduledPosts } = await import("@/lib/admin/posts");
    const result = await publishScheduledPosts(new Date("2026-03-29T00:00:00.000Z"));

    expect(result).toEqual({
      publishedCount: 0,
      publishedPostIds: [],
      affectedSlugs: [],
    });
    expect(notifyPostPublishedMock).not.toHaveBeenCalled();
  });
});

function createSeed() {
  return randomUUID().replaceAll("-", "");
}

function buildSlug(value: string) {
  return `${INTEGRATION_PREFIX}${value}`;
}

function normalizeWriteSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

async function upsertSetting(key: string, value: string) {
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key, value, isSecret: false, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, isSecret: false, updatedAt: new Date() },
    });
}

async function resolveSlug(slug: string) {
  const { resolvePublishedPostBySlug } = await import("@/lib/blog/posts");
  return resolvePublishedPostBySlug(slug);
}

async function updatePost(
  postId: number,
  input: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    status: "draft" | "published";
  },
) {
  const { updateAdminPost } = await import("@/lib/admin/posts");

  return updateAdminPost(postId, {
    title: input.title,
    slug: input.slug,
    categoryId: "",
    excerpt: input.excerpt,
    content: input.content,
    status: input.status,
    tagIds: [],
    seriesIds: [],
    metaTitle: "",
    metaDescription: "",
    ogTitle: "",
    ogDescription: "",
    canonicalUrl: "",
    breadcrumbEnabled: false,
    noindex: false,
    nofollow: false,
  });
}

async function signInAsEditor(seed: string) {
  const editor = await createUser({
    seed,
    role: "editor",
    displayName: `Editor ${seed}`,
  });

  getAdminSessionMock.mockResolvedValue({
    isAuthenticated: true,
    userId: editor.id,
    role: "editor",
  });

  return editor;
}

async function createUser(input: {
  seed: string;
  role: "author" | "editor" | "subscriber";
  displayName: string;
}) {
  const db = await getDb();
  const normalizedSeed = `${INTEGRATION_PREFIX}${input.seed}`;
  const [user] = await db
    .insert(users)
    .values({
      email: `${normalizedSeed}@example.com`,
      username: normalizedSeed,
      displayName: input.displayName,
      passwordHash: "hashed-password",
      role: input.role,
    })
    .returning({ id: users.id, username: users.username });

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
    .returning({ id: posts.id, slug: posts.slug });

  return post;
}

async function createViewCount(postId: number, viewDate: string, viewCount: number) {
  const db = await getDb();
  await db.insert(postViews).values({
    postId,
    viewDate,
    viewCount,
    updatedAt: new Date("2026-03-28T12:00:00.000Z"),
  });
}

async function createLike(postId: number, ipAddress: string) {
  const db = await getDb();
  await db.insert(postLikes).values({
    postId,
    ipAddress,
    createdAt: new Date("2026-03-28T12:00:00.000Z"),
  });
}

async function createRevision(input: {
  postId: number;
  editorId: number;
  title: string;
  excerpt: string | null;
  content: string;
  status: "draft" | "published" | "scheduled" | "trash";
  reason: string;
}) {
  const db = await getDb();
  await db.insert(postRevisions).values({
    postId: input.postId,
    editorId: input.editorId,
    title: input.title,
    excerpt: input.excerpt,
    content: input.content,
    status: input.status,
    reason: input.reason,
  });
}

async function createSitemapEntry(postId: number, slug: string) {
  const db = await getDb();
  await db.insert(sitemapEntries).values({
    postId,
    loc: `/post/${slug}`,
    lastModifiedAt: new Date("2026-03-26T20:00:00.000Z"),
  });
}

async function getPost(postId: number) {
  const db = await getDb();
  const [post] = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      status: posts.status,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  return post ?? null;
}

async function listAliases(postId: number) {
  const db = await getDb();
  const aliasRows = await db
    .select({ slug: postSlugAliases.slug })
    .from(postSlugAliases)
    .where(eq(postSlugAliases.postId, postId))
    .orderBy(postSlugAliases.slug);

  return aliasRows.map((row) => row.slug);
}

async function getSitemapEntry(postId: number) {
  const db = await getDb();
  const [entry] = await db
    .select({ loc: sitemapEntries.loc })
    .from(sitemapEntries)
    .where(eq(sitemapEntries.postId, postId))
    .limit(1);

  return entry ?? null;
}

async function getLatestRevision(postId: number) {
  const db = await getDb();
  const [revision] = await db
    .select({
      editorId: postRevisions.editorId,
      status: postRevisions.status,
      reason: postRevisions.reason,
      title: postRevisions.title,
    })
    .from(postRevisions)
    .where(eq(postRevisions.postId, postId))
    .orderBy(desc(postRevisions.createdAt), desc(postRevisions.id))
    .limit(1);

  return revision ?? null;
}

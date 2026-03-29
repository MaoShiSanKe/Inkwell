import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { comments, posts, settings, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
let originalCommentModeration: string | null = null;
const { getAdminSessionMock, notifyCommentApprovedMock, notifyCommentPendingMock, notifyCommentReplyMock } =
  vi.hoisted(() => ({
    getAdminSessionMock: vi.fn(),
    notifyCommentApprovedMock: vi.fn(),
    notifyCommentPendingMock: vi.fn(),
    notifyCommentReplyMock: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock("@/lib/email-notifications", () => ({
  notifyCommentApproved: notifyCommentApprovedMock,
  notifyCommentPending: notifyCommentPendingMock,
  notifyCommentReply: notifyCommentReplyMock,
}));

describe("blog comments integration", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    getAdminSessionMock.mockReset();
    notifyCommentApprovedMock.mockReset();
    notifyCommentPendingMock.mockReset();
    notifyCommentReplyMock.mockReset();
    notifyCommentApprovedMock.mockResolvedValue({ attempted: false, deliveries: [], scenario: "comment_approved" });
    notifyCommentPendingMock.mockResolvedValue({ attempted: false, deliveries: [], scenario: "comment_pending" });
    notifyCommentReplyMock.mockResolvedValue({ attempted: false, deliveries: [], scenario: "comment_reply" });
    originalCommentModeration = await getCurrentCommentModeration();
    await setCommentModeration("pending");
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
    await restoreCommentModeration(originalCommentModeration);
    originalCommentModeration = null;
  });

  it("enforces the two-level nesting rule for public comments", async () => {
    const seed = createSeed();
    const author = await createAuthor(seed);
    const post = await createPublishedPost(seed, author.id);
    const topLevelComment = await insertComment({
      postId: post.id,
      authorName: "Top level",
      authorEmail: `${INTEGRATION_PREFIX}${seed}@example.com`,
      content: "Top level content",
      status: "approved",
      parentId: null,
      ipAddress: "127.0.0.1",
    });
    const replyComment = await insertComment({
      postId: post.id,
      parentId: topLevelComment.id,
      authorName: "Reply level",
      authorEmail: `${INTEGRATION_PREFIX}reply-${seed}@example.com`,
      content: "Reply content",
      status: "approved",
      ipAddress: "127.0.0.1",
    });

    const { submitPublicComment } = await import("@/lib/blog/comments");
    const result = await submitPublicComment({
      postId: String(post.id),
      parentId: String(replyComment.id),
      authorName: "Third level",
      authorEmail: `${INTEGRATION_PREFIX}third-${seed}@example.com`,
      content: "Should fail",
      ipAddress: "127.0.0.1",
      userAgent: "integration-test",
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        parentId: "当前仅支持回复顶层评论，不能继续创建第三级回复。",
      },
    });
  });

  it("auto-approves normalized whitelist emails with visible approved history", async () => {
    const seed = createSeed();
    const author = await createAuthor(seed);
    const post = await createPublishedPost(seed, author.id);
    await insertComment({
      postId: post.id,
      authorName: "Existing comment",
      authorEmail: `Whitelist-${seed}@Example.com`,
      content: "Existing approved comment",
      status: "approved",
      parentId: null,
      ipAddress: "127.0.0.1",
    });

    const { submitPublicComment } = await import("@/lib/blog/comments");
    const result = await submitPublicComment({
      postId: String(post.id),
      authorName: "Whitelist user",
      authorEmail: `  whitelist-${seed}@example.com  `,
      content: "Should auto approve",
      ipAddress: "127.0.0.1",
      userAgent: "integration-test",
    });

    expect(result).toMatchObject({
      success: true,
      status: "approved",
    });

    const latestComment = await getLatestComment(post.id);
    expect(latestComment).toMatchObject({
      status: "approved",
      authorEmail: `whitelist-${seed}@example.com`,
    });
    expect(latestComment?.approvedAt).not.toBeNull();
  });

  it("does not auto-approve when only hidden approved reply history exists", async () => {
    const seed = createSeed();
    const author = await createAuthor(seed);
    const post = await createPublishedPost(seed, author.id);
    const hiddenParent = await insertComment({
      postId: post.id,
      authorName: "Hidden parent",
      authorEmail: `${INTEGRATION_PREFIX}hidden-parent-${seed}@example.com`,
      content: "Hidden parent content",
      status: "pending",
      parentId: null,
      ipAddress: "127.0.0.1",
    });
    await insertComment({
      postId: post.id,
      parentId: hiddenParent.id,
      authorName: "Hidden approved reply",
      authorEmail: `Hidden-Reply-${seed}@Example.com`,
      content: "Hidden approved reply content",
      status: "approved",
      ipAddress: "127.0.0.1",
    });

    const { submitPublicComment } = await import("@/lib/blog/comments");
    const result = await submitPublicComment({
      postId: String(post.id),
      authorName: "Same hidden reply author",
      authorEmail: `  hidden-reply-${seed}@example.com  `,
      content: "Should stay pending",
      ipAddress: "127.0.0.1",
      userAgent: "integration-test",
    });

    expect(result).toMatchObject({
      success: true,
      status: "pending",
    });
  });

  it("respects pending moderation for non-whitelisted emails and notifies admins", async () => {
    const seed = createSeed();
    const author = await createAuthor(seed);
    const post = await createPublishedPost(seed, author.id);

    const { submitPublicComment } = await import("@/lib/blog/comments");
    const result = await submitPublicComment({
      postId: String(post.id),
      authorName: "Pending user",
      authorEmail: `${INTEGRATION_PREFIX}pending-${seed}@example.com`,
      content: "Need review",
      ipAddress: "127.0.0.1",
      userAgent: "integration-test",
    });

    expect(result).toMatchObject({
      success: true,
      status: "pending",
    });
    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected pending comment submission to succeed.");
    }

    const latestComment = await getLatestComment(post.id);
    expect(latestComment).toMatchObject({
      status: "pending",
      authorEmail: `${INTEGRATION_PREFIX}pending-${seed}@example.com`,
    });
    expect(latestComment?.approvedAt).toBeNull();
    expect(notifyCommentPendingMock).toHaveBeenCalledTimes(1);
    expect(notifyCommentPendingMock).toHaveBeenCalledWith(result.commentId);
  });

  it("notifies parent authors when a reply is auto-approved", async () => {
    const seed = createSeed();
    const author = await createAuthor(seed);
    const post = await createPublishedPost(seed, author.id);
    const topLevelComment = await insertComment({
      postId: post.id,
      authorName: "Visible parent",
      authorEmail: `${INTEGRATION_PREFIX}visible-parent-${seed}@example.com`,
      content: "Visible parent content",
      status: "approved",
      parentId: null,
      ipAddress: "127.0.0.1",
    });
    await insertComment({
      postId: post.id,
      authorName: "Existing approved top-level",
      authorEmail: `reply-whitelist-${seed}@example.com`,
      content: "Approved history",
      status: "approved",
      parentId: null,
      ipAddress: "127.0.0.1",
    });

    const { submitPublicComment } = await import("@/lib/blog/comments");
    const result = await submitPublicComment({
      postId: String(post.id),
      parentId: String(topLevelComment.id),
      authorName: "Whitelisted replier",
      authorEmail: `reply-whitelist-${seed}@example.com`,
      content: "Auto approved reply",
      ipAddress: "127.0.0.1",
      userAgent: "integration-test",
    });

    expect(result).toMatchObject({ success: true, status: "approved" });
    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected approved reply submission to succeed.");
    }
    expect(notifyCommentReplyMock).toHaveBeenCalledTimes(1);
    expect(notifyCommentReplyMock).toHaveBeenCalledWith(result.commentId);
    expect(notifyCommentPendingMock).not.toHaveBeenCalled();
  });

  it("hides approved replies after the parent becomes non-public and notifies on later approval", async () => {
    const seed = createSeed();
    const author = await createAuthor(seed);
    const post = await createPublishedPost(seed, author.id);
    const topLevelComment = await insertComment({
      postId: post.id,
      authorName: "Visible parent",
      authorEmail: `${INTEGRATION_PREFIX}visible-parent-${seed}@example.com`,
      content: "Visible parent content",
      status: "approved",
      parentId: null,
      ipAddress: "127.0.0.1",
    });
    const replyComment = await insertComment({
      postId: post.id,
      parentId: topLevelComment.id,
      authorName: "Visible reply",
      authorEmail: `${INTEGRATION_PREFIX}visible-reply-${seed}@example.com`,
      content: "Visible reply content",
      status: "approved",
      ipAddress: "127.0.0.1",
    });

    getAdminSessionMock.mockResolvedValue({
      isAuthenticated: true,
      userId: author.id,
      role: "editor",
    });

    const { markAdminCommentAsSpam, approveAdminComment } = await import(
      "@/lib/admin/comments"
    );

    const spamResult = await markAdminCommentAsSpam(topLevelComment.id);
    expect(spamResult).toMatchObject({
      success: true,
      status: "spam",
    });

    const replyAfterSpam = await getComment(replyComment.id);
    expect(replyAfterSpam).toMatchObject({
      status: "pending",
    });

    const approveResult = await approveAdminComment(topLevelComment.id);
    expect(approveResult).toMatchObject({
      success: true,
      status: "approved",
    });

    const replyAfterParentApprove = await getComment(replyComment.id);
    expect(replyAfterParentApprove).toMatchObject({
      status: "pending",
    });
    expect(notifyCommentApprovedMock).toHaveBeenCalledWith(topLevelComment.id);
    expect(notifyCommentReplyMock).not.toHaveBeenCalledWith(replyComment.id);
  });

  it("notifies authors and parent commenters when an admin approves a reply", async () => {
    const seed = createSeed();
    const author = await createAuthor(seed);
    const post = await createPublishedPost(seed, author.id);
    const topLevelComment = await insertComment({
      postId: post.id,
      authorName: "Visible parent",
      authorEmail: `${INTEGRATION_PREFIX}visible-parent-${seed}@example.com`,
      content: "Visible parent content",
      status: "approved",
      parentId: null,
      ipAddress: "127.0.0.1",
    });
    const replyComment = await insertComment({
      postId: post.id,
      parentId: topLevelComment.id,
      authorName: "Pending reply",
      authorEmail: `${INTEGRATION_PREFIX}pending-reply-${seed}@example.com`,
      content: "Pending reply content",
      status: "pending",
      ipAddress: "127.0.0.1",
    });

    getAdminSessionMock.mockResolvedValue({
      isAuthenticated: true,
      userId: author.id,
      role: "editor",
    });

    const { approveAdminComment } = await import("@/lib/admin/comments");
    const approveResult = await approveAdminComment(replyComment.id);

    expect(approveResult).toMatchObject({ success: true, status: "approved" });
    expect(notifyCommentApprovedMock).toHaveBeenCalledWith(replyComment.id);
    expect(notifyCommentReplyMock).toHaveBeenCalledWith(replyComment.id);
  });
});

function createSeed() {
  return randomUUID().replaceAll("-", "");
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
    .returning({
      id: users.id,
    });

  return user;
}

async function createPublishedPost(seed: string, authorId: number) {
  const db = await getDb();
  const [post] = await db
    .insert(posts)
    .values({
      authorId,
      title: `Comment Post ${seed}`,
      slug: `${INTEGRATION_PREFIX}comment-post-${seed}`,
      excerpt: "Comment excerpt",
      content: "Comment content",
      status: "published",
      publishedAt: new Date("2026-03-26T12:00:00.000Z"),
      updatedAt: new Date("2026-03-26T12:00:00.000Z"),
    })
    .returning({
      id: posts.id,
      slug: posts.slug,
    });

  return post;
}

async function insertComment(input: {
  postId: number;
  parentId?: number | null;
  authorName: string;
  authorEmail: string;
  content: string;
  status: "pending" | "approved" | "spam" | "trash";
  ipAddress: string;
}) {
  const db = await getDb();
  const now = new Date();
  const [comment] = await db
    .insert(comments)
    .values({
      postId: input.postId,
      parentId: input.parentId ?? null,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      content: input.content,
      status: input.status,
      ipAddress: input.ipAddress,
      approvedAt: input.status === "approved" ? now : null,
      updatedAt: now,
    })
    .returning({
      id: comments.id,
    });

  return comment;
}

async function setCommentModeration(value: "pending" | "approved") {
  const db = await getDb();
  await db
    .insert(settings)
    .values({
      key: "comment_moderation",
      value,
      isSecret: false,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value,
        isSecret: false,
        updatedAt: new Date(),
      },
    });
}

async function getCurrentCommentModeration() {
  const db = await getDb();
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "comment_moderation"))
    .limit(1);

  return row?.value ?? null;
}

async function restoreCommentModeration(value: string | null) {
  const db = await getDb();

  if (value === null) {
    await db.delete(settings).where(eq(settings.key, "comment_moderation"));
    return;
  }

  await db
    .insert(settings)
    .values({
      key: "comment_moderation",
      value,
      isSecret: false,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value,
        isSecret: false,
        updatedAt: new Date(),
      },
    });
}

async function getLatestComment(postId: number) {
  const db = await getDb();
  const [comment] = await db
    .select({
      id: comments.id,
      authorEmail: comments.authorEmail,
      status: comments.status,
      approvedAt: comments.approvedAt,
    })
    .from(comments)
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt), desc(comments.id))
    .limit(1);

  return comment ?? null;
}

async function getComment(commentId: number) {
  const db = await getDb();
  const [comment] = await db
    .select({
      id: comments.id,
      status: comments.status,
      approvedAt: comments.approvedAt,
    })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  return comment ?? null;
}

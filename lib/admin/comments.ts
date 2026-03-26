import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { getAdminSession, type AdminRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { comments, posts } from "@/lib/db/schema";

export type AdminCommentStatus = "pending" | "approved" | "spam" | "trash";

export type AdminCommentListItem = {
  id: number;
  postId: number;
  postTitle: string;
  postSlug: string;
  parentId: number | null;
  authorName: string;
  authorEmail: string;
  authorUrl: string | null;
  content: string;
  status: AdminCommentStatus;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  level: 1 | 2;
};

type SuccessfulAdminCommentMutation = {
  success: true;
  commentId: number;
  postId: number;
  postSlug: string;
  status: AdminCommentStatus;
};

export type AdminCommentMutationResult =
  | SuccessfulAdminCommentMutation
  | {
      success: false;
      error: string;
    };

type AdminSessionWithRole = {
  isAuthenticated: true;
  userId: number;
  role: AdminRole;
};

async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session.isAuthenticated || !session.userId || !session.role) {
    return null;
  }

  return session as AdminSessionWithRole;
}

async function updateReplyStatusesForParent(
  parentCommentId: number,
  parentNextStatus: AdminCommentStatus,
  now: Date,
) {
  const replyRows = await db
    .select({
      id: comments.id,
      status: comments.status,
    })
    .from(comments)
    .where(eq(comments.parentId, parentCommentId));

  if (replyRows.length === 0) {
    return;
  }

  if (parentNextStatus === "approved") {
    const suspendedReplyIds = replyRows
      .filter((row) => row.status === "trash" || row.status === "spam")
      .map((row) => row.id);

    if (suspendedReplyIds.length > 0) {
      await db
        .update(comments)
        .set({
          status: "pending",
          approvedAt: null,
          updatedAt: now,
        })
        .where(inArray(comments.id, suspendedReplyIds));
    }

    return;
  }

  const visibleReplyIds = replyRows
    .filter((row) => row.status === "approved")
    .map((row) => row.id);

  if (visibleReplyIds.length === 0) {
    return;
  }

  await db
    .update(comments)
    .set({
      status: "pending",
      approvedAt: null,
      updatedAt: now,
    })
    .where(inArray(comments.id, visibleReplyIds));
}

async function updateAdminCommentStatus(
  commentId: number,
  nextStatus: AdminCommentStatus,
): Promise<AdminCommentMutationResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      error: "未登录或权限不足。",
    };
  }

  if (!Number.isInteger(commentId) || commentId <= 0) {
    return {
      success: false,
      error: "评论 ID 无效。",
    };
  }

  const [comment] = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      status: comments.status,
      postSlug: posts.slug,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!comment) {
    return {
      success: false,
      error: "评论不存在。",
    };
  }

  const allowedTransitionsByTarget: Record<AdminCommentStatus, AdminCommentStatus[]> = {
    approved: ["pending", "spam"],
    pending: ["trash"],
    spam: ["pending", "approved"],
    trash: ["pending", "approved", "spam"],
  };

  if (!allowedTransitionsByTarget[nextStatus].includes(comment.status)) {
    return {
      success: false,
      error: "当前评论状态不允许执行该操作。",
    };
  }

  const now = new Date();

  const updatedRows = await db
    .update(comments)
    .set({
      status: nextStatus,
      approvedAt: nextStatus === "approved" ? now : null,
      updatedAt: now,
    })
    .where(and(eq(comments.id, comment.id), eq(comments.status, comment.status)))
    .returning({
      id: comments.id,
    });

  if (updatedRows.length === 0) {
    return {
      success: false,
      error: "评论状态已被其他管理员更新，请刷新后重试。",
    };
  }

  if (comment.parentId === null) {
    await updateReplyStatusesForParent(comment.id, nextStatus, now);
  }

  if (comment.parentId !== null && nextStatus === "approved") {
    const [parentComment] = await db
      .select({
        status: comments.status,
      })
      .from(comments)
      .where(eq(comments.id, comment.parentId))
      .limit(1);

    if (!parentComment || parentComment.status !== "approved") {
      await db
        .update(comments)
        .set({
          status: "pending",
          approvedAt: null,
          updatedAt: now,
        })
        .where(eq(comments.id, comment.id));

      return {
        success: true,
        commentId: comment.id,
        postId: comment.postId,
        postSlug: comment.postSlug,
        status: "pending",
      };
    }
  }

  return {
    success: true,
    commentId: comment.id,
    postId: comment.postId,
    postSlug: comment.postSlug,
    status: nextStatus,
  };
}

export async function listAdminComments(): Promise<AdminCommentListItem[]> {
  const rows = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      postTitle: posts.title,
      postSlug: posts.slug,
      parentId: comments.parentId,
      authorName: comments.authorName,
      authorEmail: comments.authorEmail,
      authorUrl: comments.authorUrl,
      content: comments.content,
      status: comments.status,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      approvedAt: comments.approvedAt,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .orderBy(desc(comments.createdAt), desc(comments.id))
    .limit(200);

  return rows.map((row) => ({
    ...row,
    level: row.parentId === null ? 1 : 2,
  }));
}

export async function approveAdminComment(
  commentId: number,
): Promise<AdminCommentMutationResult> {
  return updateAdminCommentStatus(commentId, "approved");
}

export async function markAdminCommentAsSpam(
  commentId: number,
): Promise<AdminCommentMutationResult> {
  return updateAdminCommentStatus(commentId, "spam");
}

export async function moveAdminCommentToTrash(
  commentId: number,
): Promise<AdminCommentMutationResult> {
  return updateAdminCommentStatus(commentId, "trash");
}

export async function restoreAdminCommentFromTrash(
  commentId: number,
): Promise<AdminCommentMutationResult> {
  return updateAdminCommentStatus(commentId, "pending");
}

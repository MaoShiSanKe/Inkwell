import "server-only";

import { isIP } from "node:net";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { notifyCommentPending, notifyCommentReply } from "@/lib/email-notifications";
import { db } from "@/lib/db";
import { comments, posts } from "@/lib/db/schema";
import { getCommentModeration } from "@/lib/settings";

import type { CommentFormErrors, CommentFormValues } from "./comment-form";

export type ApprovedCommentReply = {
  id: number;
  parentId: number;
  authorName: string;
  authorUrl: string | null;
  content: string;
  createdAt: Date;
};

export type ApprovedComment = {
  id: number;
  parentId: null;
  authorName: string;
  authorUrl: string | null;
  content: string;
  createdAt: Date;
  replies: ApprovedCommentReply[];
};

export type SubmitPublicCommentInput = {
  postId: string;
  parentId?: string;
  authorName: string;
  authorEmail: string;
  authorUrl?: string;
  content: string;
  ipAddress: string;
  userAgent?: string | null;
};

export type SubmitPublicCommentResult =
  | {
      success: true;
      commentId: number;
      postId: number;
      postSlug: string;
      status: "approved" | "pending";
      values: Pick<CommentFormValues, "authorName" | "authorEmail" | "authorUrl">;
    }
  | {
      success: false;
      values: CommentFormValues;
      errors: CommentFormErrors;
    };

type ValidatedCommentInput = {
  success: true;
  values: CommentFormValues;
  postId: number;
  parentId: number | null;
  ipAddress: string;
  userAgent: string | null;
};

type InvalidCommentInput = {
  success: false;
  values: CommentFormValues;
  errors: CommentFormErrors;
};

type ApprovedCommentRow = {
  id: number;
  parentId: number | null;
  authorName: string;
  authorUrl: string | null;
  content: string;
  createdAt: Date;
};

type ApprovedHistoryCandidate = {
  id: number;
  parentId: number | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeAuthorUrl(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizeUserAgent(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized.slice(0, 512) : null;
}

function buildInitialValues(input: SubmitPublicCommentInput): CommentFormValues {
  return {
    postId: input.postId.trim(),
    parentId: input.parentId?.trim() ?? "",
    authorName: input.authorName.trim(),
    authorEmail: normalizeEmail(input.authorEmail),
    authorUrl: normalizeAuthorUrl(input.authorUrl),
    content: input.content.trim(),
  };
}

function validateAuthorUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateIpAddress(value: string) {
  return isIP(value.trim()) > 0;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildApprovedCommentTree(rows: ApprovedCommentRow[]): ApprovedComment[] {
  const topLevelComments: ApprovedComment[] = [];
  const commentMap = new Map<number, ApprovedComment>();

  for (const row of rows) {
    if (row.parentId !== null) {
      continue;
    }

    const topLevelComment: ApprovedComment = {
      id: row.id,
      parentId: null,
      authorName: row.authorName,
      authorUrl: row.authorUrl,
      content: row.content,
      createdAt: row.createdAt,
      replies: [],
    };

    topLevelComments.push(topLevelComment);
    commentMap.set(row.id, topLevelComment);
  }

  for (const row of rows) {
    if (row.parentId === null) {
      continue;
    }

    const parent = commentMap.get(row.parentId);

    if (!parent) {
      continue;
    }

    parent.replies.push({
      id: row.id,
      parentId: row.parentId,
      authorName: row.authorName,
      authorUrl: row.authorUrl,
      content: row.content,
      createdAt: row.createdAt,
    });
  }

  return topLevelComments;
}

async function listApprovedHistoryCandidatesByEmail(
  normalizedEmail: string,
): Promise<ApprovedHistoryCandidate[]> {
  const exactMatches = await db
    .select({
      id: comments.id,
      parentId: comments.parentId,
    })
    .from(comments)
    .where(and(eq(comments.authorEmail, normalizedEmail), eq(comments.status, "approved")))
    .limit(25);

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  return db
    .select({
      id: comments.id,
      parentId: comments.parentId,
    })
    .from(comments)
    .where(
      and(
        sql`lower(${comments.authorEmail}) = ${normalizedEmail}`,
        eq(comments.status, "approved"),
      ),
    )
    .limit(25);
}

async function hasWhitelistedApprovedHistory(normalizedEmail: string) {
  const approvedHistoryCandidates = await listApprovedHistoryCandidatesByEmail(
    normalizedEmail,
  );

  if (approvedHistoryCandidates.some((candidate) => candidate.parentId === null)) {
    return true;
  }

  const parentIds = Array.from(
    new Set(
      approvedHistoryCandidates
        .map((candidate) => candidate.parentId)
        .filter((value): value is number => value !== null),
    ),
  );

  if (parentIds.length === 0) {
    return false;
  }

  const parentRows = await db
    .select({
      id: comments.id,
      status: comments.status,
    })
    .from(comments)
    .where(inArray(comments.id, parentIds));

  const approvedParentIds = new Set(
    parentRows
      .filter((row) => row.status === "approved")
      .map((row) => row.id),
  );

  return approvedHistoryCandidates.some(
    (candidate) => candidate.parentId !== null && approvedParentIds.has(candidate.parentId),
  );
}

async function validateCommentInput(
  input: SubmitPublicCommentInput,
): Promise<ValidatedCommentInput | InvalidCommentInput> {
  const values = buildInitialValues(input);
  const errors: CommentFormErrors = {};

  const postId = Number.parseInt(values.postId, 10);

  if (!Number.isInteger(postId) || postId <= 0) {
    errors.form = "评论目标无效，请刷新页面后重试。";
  }

  let parentId: number | null = null;

  if (values.parentId) {
    const parsedParentId = Number.parseInt(values.parentId, 10);

    if (!Number.isInteger(parsedParentId) || parsedParentId <= 0) {
      errors.parentId = "回复目标无效，请重新选择要回复的评论。";
    } else {
      parentId = parsedParentId;
    }
  }

  if (!values.authorName || values.authorName.length > 120) {
    errors.authorName = "昵称不能为空，且长度不能超过 120 个字符。";
  }

  if (!values.authorEmail || values.authorEmail.length > 255 || !isValidEmail(values.authorEmail)) {
    errors.authorEmail = "请输入有效的邮箱地址。";
  }

  if (values.authorUrl.length > 255 || !validateAuthorUrl(values.authorUrl)) {
    errors.authorUrl = "个人主页链接仅支持 http 或 https 地址。";
  }

  if (!values.content) {
    errors.content = "评论内容不能为空。";
  }

  const ipAddress = input.ipAddress.trim();

  if (!validateIpAddress(ipAddress)) {
    errors.form = "无法识别当前请求来源，请稍后重试。";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      values,
      errors,
    };
  }

  return {
    success: true,
    values,
    postId,
    parentId,
    ipAddress,
    userAgent: normalizeUserAgent(input.userAgent),
  };
}

export async function listApprovedCommentsForPost(postId: number): Promise<ApprovedComment[]> {
  const rows = await db
    .select({
      id: comments.id,
      parentId: comments.parentId,
      authorName: comments.authorName,
      authorUrl: comments.authorUrl,
      content: comments.content,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(and(eq(comments.postId, postId), eq(comments.status, "approved")))
    .orderBy(asc(comments.createdAt), asc(comments.id));

  return buildApprovedCommentTree(rows);
}

export async function submitPublicComment(
  input: SubmitPublicCommentInput,
): Promise<SubmitPublicCommentResult> {
  const validatedInput = await validateCommentInput(input);

  if (!validatedInput.success) {
    return validatedInput;
  }

  const [post] = await db
    .select({
      id: posts.id,
      slug: posts.slug,
    })
    .from(posts)
    .where(and(eq(posts.id, validatedInput.postId), eq(posts.status, "published")))
    .limit(1);

  if (!post) {
    return {
      success: false,
      values: validatedInput.values,
      errors: {
        form: "文章不存在或尚未发布，暂时无法提交评论。",
      },
    };
  }

  if (validatedInput.parentId !== null) {
    const [parentComment] = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        status: comments.status,
      })
      .from(comments)
      .where(eq(comments.id, validatedInput.parentId))
      .limit(1);

    if (!parentComment || parentComment.postId !== post.id) {
      return {
        success: false,
        values: validatedInput.values,
        errors: {
          parentId: "要回复的评论不存在，或已不属于当前文章。",
        },
      };
    }

    if (parentComment.parentId !== null) {
      return {
        success: false,
        values: validatedInput.values,
        errors: {
          parentId: "当前仅支持回复顶层评论，不能继续创建第三级回复。",
        },
      };
    }

    if (parentComment.status !== "approved") {
      return {
        success: false,
        values: validatedInput.values,
        errors: {
          parentId: "当前只能回复已公开的顶层评论。",
        },
      };
    }
  }

  const hasApprovedHistory = await hasWhitelistedApprovedHistory(
    validatedInput.values.authorEmail,
  );
  const nextStatus = hasApprovedHistory ? "approved" : await getCommentModeration();
  const now = new Date();

  const [insertedComment] = await db
    .insert(comments)
    .values({
      postId: post.id,
      parentId: validatedInput.parentId,
      authorName: validatedInput.values.authorName,
      authorEmail: validatedInput.values.authorEmail,
      authorUrl: validatedInput.values.authorUrl || null,
      content: validatedInput.values.content,
      status: nextStatus,
      ipAddress: validatedInput.ipAddress,
      userAgent: validatedInput.userAgent,
      approvedAt: nextStatus === "approved" ? now : null,
      updatedAt: now,
    })
    .returning({
      id: comments.id,
    });

  if (nextStatus === "pending") {
    await notifyCommentPending(insertedComment.id);
  }

  if (nextStatus === "approved" && validatedInput.parentId !== null) {
    await notifyCommentReply(insertedComment.id);
  }

  return {
    success: true,
    commentId: insertedComment.id,
    postId: post.id,
    postSlug: post.slug,
    status: nextStatus,
    values: {
      authorName: validatedInput.values.authorName,
      authorEmail: validatedInput.values.authorEmail,
      authorUrl: validatedInput.values.authorUrl,
    },
  };
}

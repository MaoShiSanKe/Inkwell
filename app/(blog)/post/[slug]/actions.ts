"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { submitPublicComment } from "@/lib/blog/comments";
import { createCommentFormState, type CommentFormState } from "@/lib/blog/comment-form";

function resolveClientIp(forwardedFor: string | null, realIp: string | null) {
  const forwardedCandidate = forwardedFor
    ?.split(",")
    .map((value) => value.trim())
    .find(Boolean);

  if (forwardedCandidate) {
    return forwardedCandidate;
  }

  if (realIp?.trim()) {
    return realIp.trim();
  }

  if (process.env.NODE_ENV !== "production") {
    return "127.0.0.1";
  }

  return null;
}

export async function submitCommentAction(
  _prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const headerStore = await headers();
  const ipAddress = resolveClientIp(
    headerStore.get("x-forwarded-for"),
    headerStore.get("x-real-ip"),
  );

  if (!ipAddress) {
    return createCommentFormState(
      {
        postId: String(formData.get("postId") ?? ""),
        parentId: String(formData.get("parentId") ?? ""),
        authorName: String(formData.get("authorName") ?? "").trim(),
        authorEmail: String(formData.get("authorEmail") ?? "").trim().toLowerCase(),
        authorUrl: String(formData.get("authorUrl") ?? "").trim(),
        content: String(formData.get("content") ?? "").trim(),
      },
      {
        form: "无法识别当前请求来源，请稍后重试。",
      },
    );
  }

  const result = await submitPublicComment({
    postId: String(formData.get("postId") ?? ""),
    parentId: String(formData.get("parentId") ?? ""),
    authorName: String(formData.get("authorName") ?? ""),
    authorEmail: String(formData.get("authorEmail") ?? ""),
    authorUrl: String(formData.get("authorUrl") ?? ""),
    content: String(formData.get("content") ?? ""),
    ipAddress,
    userAgent: headerStore.get("user-agent"),
  });

  if (!result.success) {
    return createCommentFormState(result.values, result.errors);
  }

  if (result.status === "approved") {
    revalidatePath(`/post/${result.postSlug}`);
  }

  return createCommentFormState(
    {
      postId: String(result.postId),
      parentId: String(formData.get("parentId") ?? ""),
      authorName: result.values.authorName,
      authorEmail: result.values.authorEmail,
      authorUrl: result.values.authorUrl,
      content: "",
    },
    {},
    result.status,
    result.status === "approved" ? "评论已发布。" : "评论已提交，等待审核。",
  );
}

import "server-only";

import { and, count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { postLikes, posts } from "@/lib/db/schema";

type LikePostInput = {
  postId: string;
  ipAddress: string;
};

export type LikePostResult =
  | {
      success: true;
      postId: number;
      alreadyLiked: boolean;
      likeCount: number;
    }
  | {
      success: false;
      error: string;
    };

export async function getPublishedPostLikeCount(postId: number) {
  const [row] = await db
    .select({ value: count() })
    .from(postLikes)
    .where(eq(postLikes.postId, postId));

  return Number(row?.value ?? 0);
}

export async function likePublishedPost(input: LikePostInput): Promise<LikePostResult> {
  const postId = Number.parseInt(input.postId.trim(), 10);
  const ipAddress = input.ipAddress.trim();

  if (!Number.isInteger(postId) || postId <= 0) {
    return {
      success: false,
      error: "文章不存在。",
    };
  }

  if (!ipAddress) {
    return {
      success: false,
      error: "无法识别当前请求来源，请稍后重试。",
    };
  }

  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.status, "published")))
    .limit(1);

  if (!post) {
    return {
      success: false,
      error: "文章不存在。",
    };
  }

  const insertedRows = await db
    .insert(postLikes)
    .values({
      postId,
      ipAddress,
    })
    .onConflictDoNothing()
    .returning({ postId: postLikes.postId });

  const likeCount = await getPublishedPostLikeCount(postId);

  return {
    success: true,
    postId,
    alreadyLiked: insertedRows.length === 0,
    likeCount,
  };
}

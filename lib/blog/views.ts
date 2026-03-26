import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { postViews, posts } from "@/lib/db/schema";

type RecordViewInput = {
  postId: number;
  viewDate?: string;
};

function resolveViewDate(input?: string) {
  if (input) {
    return input;
  }

  return new Date().toISOString().slice(0, 10);
}

export async function getPublishedPostViewCount(postId: number) {
  const [row] = await db
    .select({ value: sql<number>`coalesce(sum(${postViews.viewCount}), 0)` })
    .from(postViews)
    .where(eq(postViews.postId, postId));

  return Number(row?.value ?? 0);
}

export async function recordPublishedPostView(input: RecordViewInput) {
  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, input.postId), eq(posts.status, "published")))
    .limit(1);

  if (!post) {
    return false;
  }

  const viewDate = resolveViewDate(input.viewDate);

  await db
    .insert(postViews)
    .values({
      postId: input.postId,
      viewDate,
      viewCount: 1,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [postViews.postId, postViews.viewDate],
      set: {
        viewCount: sql`${postViews.viewCount} + 1`,
        updatedAt: new Date(),
      },
    });

  return true;
}

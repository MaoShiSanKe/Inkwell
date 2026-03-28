import { createHash, timingSafeEqual } from "node:crypto";

import { revalidatePath } from "next/cache";

import { publishScheduledPosts } from "@/lib/admin/posts";

function revalidateBlogPostPaths(slugs: string[]) {
  for (const slug of Array.from(new Set(slugs.map((value) => value.trim()).filter(Boolean)))) {
    revalidatePath(`/post/${slug}`);
  }
}

function toComparableBuffer(value: string) {
  return createHash("sha256").update(value).digest();
}

function isAuthorized(request: Request, secret: string) {
  const header = request.headers.get("authorization") ?? "";

  if (!header.startsWith("Bearer ")) {
    return false;
  }

  const token = header.slice("Bearer ".length).trim();

  if (!token) {
    return false;
  }

  return timingSafeEqual(toComparableBuffer(token), toComparableBuffer(secret));
}

export async function POST(request: Request) {
  const secret = process.env.INTERNAL_CRON_SECRET?.trim();

  if (!secret) {
    return Response.json(
      {
        data: null,
        error: "INTERNAL_CRON_SECRET is not configured.",
      },
      { status: 503 },
    );
  }

  if (!isAuthorized(request, secret)) {
    return Response.json(
      {
        data: null,
        error: "Unauthorized.",
      },
      { status: 401 },
    );
  }

  const result = await publishScheduledPosts(new Date());

  revalidateBlogPostPaths(result.affectedSlugs);
  revalidatePath("/sitemap.xml");
  revalidatePath("/rss.xml");

  return Response.json({
    data: {
      publishedCount: result.publishedCount,
      publishedPostIds: result.publishedPostIds,
      affectedSlugs: result.affectedSlugs,
      triggeredAt: new Date().toISOString(),
    },
    error: null,
  });
}

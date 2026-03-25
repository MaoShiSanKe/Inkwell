import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { postSlugAliases, posts } from "@/lib/db/schema";

export type BlogPostPageData = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  publishedAt: Date | null;
};

export type ResolvedPublishedPost =
  | {
      kind: "post";
      post: BlogPostPageData;
    }
  | {
      kind: "redirect";
      currentSlug: string;
    }
  | {
      kind: "not-found";
    };

export async function resolvePublishedPostBySlug(
  slug: string,
): Promise<ResolvedPublishedPost> {
  const normalizedSlug = slug.trim().toLowerCase();

  if (!normalizedSlug) {
    return { kind: "not-found" };
  }

  const [post] = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      content: posts.content,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(and(eq(posts.slug, normalizedSlug), eq(posts.status, "published")))
    .limit(1);

  if (post) {
    return { kind: "post", post };
  }

  const [aliasMatch] = await db
    .select({ currentSlug: posts.slug })
    .from(postSlugAliases)
    .innerJoin(posts, eq(postSlugAliases.postId, posts.id))
    .where(
      and(
        eq(postSlugAliases.slug, normalizedSlug),
        eq(posts.status, "published"),
      ),
    )
    .limit(1);

  if (!aliasMatch) {
    return { kind: "not-found" };
  }

  return {
    kind: "redirect",
    currentSlug: aliasMatch.currentSlug,
  };
}

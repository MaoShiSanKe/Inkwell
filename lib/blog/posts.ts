import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { media, postMeta, postSlugAliases, posts, users } from "@/lib/db/schema";

export type BlogPostSeoData = {
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  canonicalUrl: string | null;
  breadcrumbEnabled: boolean;
  noindex: boolean;
  nofollow: boolean;
};

export type BlogPostOgImageData = {
  source: "local" | "external";
  storagePath: string | null;
  thumbnailPath: string | null;
  externalUrl: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type BlogPostPageData = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  publishedAt: Date | null;
  updatedAt: Date;
  author: {
    displayName: string;
  };
  seo: BlogPostSeoData;
  ogImage: BlogPostOgImageData | null;
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
      updatedAt: posts.updatedAt,
      authorDisplayName: users.displayName,
      metaTitle: postMeta.metaTitle,
      metaDescription: postMeta.metaDescription,
      ogTitle: postMeta.ogTitle,
      ogDescription: postMeta.ogDescription,
      canonicalUrl: postMeta.canonicalUrl,
      breadcrumbEnabled: postMeta.breadcrumbEnabled,
      noindex: postMeta.noindex,
      nofollow: postMeta.nofollow,
      ogImageSource: media.source,
      ogImageStoragePath: media.storagePath,
      ogImageThumbnailPath: media.thumbnailPath,
      ogImageExternalUrl: media.externalUrl,
      ogImageAltText: media.altText,
      ogImageWidth: media.width,
      ogImageHeight: media.height,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(postMeta, eq(postMeta.postId, posts.id))
    .leftJoin(media, eq(postMeta.ogImageMediaId, media.id))
    .where(and(eq(posts.slug, normalizedSlug), eq(posts.status, "published")))
    .limit(1);

  if (post) {
    return {
      kind: "post",
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        author: {
          displayName: post.authorDisplayName,
        },
        seo: {
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          ogTitle: post.ogTitle,
          ogDescription: post.ogDescription,
          canonicalUrl: post.canonicalUrl,
          breadcrumbEnabled: post.breadcrumbEnabled ?? false,
          noindex: post.noindex ?? false,
          nofollow: post.nofollow ?? false,
        },
        ogImage: post.ogImageSource
          ? {
              source: post.ogImageSource,
              storagePath: post.ogImageStoragePath,
              thumbnailPath: post.ogImageThumbnailPath,
              externalUrl: post.ogImageExternalUrl,
              altText: post.ogImageAltText,
              width: post.ogImageWidth,
              height: post.ogImageHeight,
            }
          : null,
      },
    };
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

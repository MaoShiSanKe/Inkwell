import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  categories,
  media,
  postMeta,
  postSeries,
  postSlugAliases,
  posts,
  postTags,
  series,
  tags,
  users,
} from "@/lib/db/schema";

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

export type PublishedPostListItem = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date | null;
  author: {
    displayName: string;
  };
  category: {
    name: string;
    slug: string;
  } | null;
};

type BlogArchiveTerm = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
};

export type ResolvedPublishedCategoryArchive =
  | {
      kind: "archive";
      category: BlogArchiveTerm;
      posts: PublishedPostListItem[];
    }
  | {
      kind: "not-found";
    };

export type ResolvedPublishedTagArchive =
  | {
      kind: "archive";
      tag: BlogArchiveTerm;
      posts: PublishedPostListItem[];
    }
  | {
      kind: "not-found";
    };

export type ResolvedPublishedSeriesArchive =
  | {
      kind: "archive";
      series: BlogArchiveTerm;
      posts: PublishedPostListItem[];
    }
  | {
      kind: "not-found";
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

export async function listPublishedPosts(): Promise<PublishedPostListItem[]> {
  const rows = await buildPublishedPostListQuery()
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt));

  return rows.map(mapPublishedPostListItem);
}

export async function resolvePublishedCategoryArchiveBySlug(
  slug: string,
): Promise<ResolvedPublishedCategoryArchive> {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    return { kind: "not-found" };
  }

  const [category] = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
    })
    .from(categories)
    .where(eq(categories.slug, normalizedSlug))
    .limit(1);

  if (!category) {
    return { kind: "not-found" };
  }

  const archivePosts = await buildPublishedPostListQuery()
    .where(and(eq(posts.status, "published"), eq(posts.categoryId, category.id)))
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt));

  return {
    kind: "archive",
    category,
    posts: archivePosts.map(mapPublishedPostListItem),
  };
}

export async function resolvePublishedTagArchiveBySlug(
  slug: string,
): Promise<ResolvedPublishedTagArchive> {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    return { kind: "not-found" };
  }

  const [tag] = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
    })
    .from(tags)
    .where(eq(tags.slug, normalizedSlug))
    .limit(1);

  if (!tag) {
    return { kind: "not-found" };
  }

  const archivePosts = await buildPublishedPostListQuery()
    .innerJoin(postTags, eq(postTags.postId, posts.id))
    .where(and(eq(posts.status, "published"), eq(postTags.tagId, tag.id)))
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt));

  return {
    kind: "archive",
    tag,
    posts: archivePosts.map(mapPublishedPostListItem),
  };
}

export async function resolvePublishedSeriesArchiveBySlug(
  slug: string,
): Promise<ResolvedPublishedSeriesArchive> {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    return { kind: "not-found" };
  }

  const [seriesEntry] = await db
    .select({
      id: series.id,
      name: series.name,
      slug: series.slug,
      description: series.description,
    })
    .from(series)
    .where(eq(series.slug, normalizedSlug))
    .limit(1);

  if (!seriesEntry) {
    return { kind: "not-found" };
  }

  const archivePosts = await buildPublishedPostListQuery()
    .innerJoin(postSeries, eq(postSeries.postId, posts.id))
    .where(and(eq(posts.status, "published"), eq(postSeries.seriesId, seriesEntry.id)))
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt));

  return {
    kind: "archive",
    series: seriesEntry,
    posts: archivePosts.map(mapPublishedPostListItem),
  };
}

export async function resolvePublishedPostBySlug(
  slug: string,
): Promise<ResolvedPublishedPost> {
  const normalizedSlug = normalizeSlug(slug);

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

function buildPublishedPostListQuery() {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
      authorDisplayName: users.displayName,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(categories, eq(posts.categoryId, categories.id));
}

function mapPublishedPostListItem(row: {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date | null;
  authorDisplayName: string;
  categoryName: string | null;
  categorySlug: string | null;
}): PublishedPostListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    publishedAt: row.publishedAt,
    author: {
      displayName: row.authorDisplayName,
    },
    category:
      row.categoryName && row.categorySlug
        ? {
            name: row.categoryName,
            slug: row.categorySlug,
          }
        : null,
  };
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

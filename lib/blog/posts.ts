import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

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
  sitemapEntries,
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

export type BlogPostCategoryData = {
  id: number;
  name: string;
  slug: string;
};

export type BlogPostSeriesData = {
  id: number;
  name: string;
  slug: string;
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
  category: BlogPostCategoryData | null;
  categoryPath: BlogPostCategoryData[];
  series: BlogPostSeriesData | null;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
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

export type SitemapEntryItem = {
  loc: string;
  lastModifiedAt: Date;
};

export type PublishedRssPostItem = {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  publishedAt: Date | null;
  updatedAt: Date;
  author: {
    displayName: string;
  };
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

export async function listSitemapEntries(): Promise<SitemapEntryItem[]> {
  const rows = await db
    .select({
      loc: sitemapEntries.loc,
      lastModifiedAt: sitemapEntries.lastModifiedAt,
    })
    .from(sitemapEntries)
    .orderBy(desc(sitemapEntries.lastModifiedAt), sitemapEntries.loc);

  return rows;
}

export async function listPublishedRssPosts(): Promise<PublishedRssPostItem[]> {
  const rows = await db
    .select({
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      content: posts.content,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      authorDisplayName: users.displayName,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt));

  return rows.map((row) => ({
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    author: {
      displayName: row.authorDisplayName,
    },
  }));
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

export async function listRelatedPublishedPosts(input: {
  postId: number;
  categoryId: number | null;
  tagIds: number[];
}): Promise<PublishedPostListItem[]> {
  const categoryConditions = [eq(posts.status, "published"), sql`${posts.id} <> ${input.postId}`];

  if (input.categoryId !== null) {
    categoryConditions.push(eq(posts.categoryId, input.categoryId));
  }

  const relatedByCategory =
    input.categoryId === null
      ? []
      : await buildPublishedPostListQuery()
          .where(and(...categoryConditions))
          .orderBy(desc(posts.publishedAt), desc(posts.updatedAt), desc(posts.id))
          .limit(4);

  if (relatedByCategory.length >= 4 || input.tagIds.length === 0) {
    return relatedByCategory.map(mapPublishedPostListItem);
  }

  const existingIds = new Set(relatedByCategory.map((row) => row.id));
  const relatedByTags = await buildPublishedPostListQuery()
    .innerJoin(postTags, eq(postTags.postId, posts.id))
    .where(
      and(
        eq(posts.status, "published"),
        sql`${posts.id} <> ${input.postId}`,
        inArray(postTags.tagId, input.tagIds),
      ),
    )
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt), desc(posts.id));

  const combined = [...relatedByCategory];

  for (const row of relatedByTags) {
    if (combined.length >= 4) {
      break;
    }

    if (existingIds.has(row.id)) {
      continue;
    }

    existingIds.add(row.id);
    combined.push(row);
  }

  return combined.map(mapPublishedPostListItem);
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
      categoryId: categories.id,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryParentId: categories.parentId,
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
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(postMeta, eq(postMeta.postId, posts.id))
    .leftJoin(media, eq(postMeta.ogImageMediaId, media.id))
    .where(and(eq(posts.slug, normalizedSlug), eq(posts.status, "published")))
    .limit(1);

  if (post) {
    const category =
      post.categoryId && post.categoryName && post.categorySlug
        ? {
            id: post.categoryId,
            name: post.categoryName,
            slug: post.categorySlug,
          }
        : null;

    const [tagRows, parentCategoryRows, seriesRows] = await Promise.all([
      db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
        })
        .from(postTags)
        .innerJoin(tags, eq(postTags.tagId, tags.id))
        .where(eq(postTags.postId, post.id))
        .orderBy(tags.name),
      post.categoryParentId
        ? db
            .select({
              id: categories.id,
              name: categories.name,
              slug: categories.slug,
            })
            .from(categories)
            .where(eq(categories.id, post.categoryParentId))
            .limit(1)
        : Promise.resolve([]),
      db
        .select({
          id: series.id,
          name: series.name,
          slug: series.slug,
        })
        .from(postSeries)
        .innerJoin(series, eq(postSeries.seriesId, series.id))
        .where(eq(postSeries.postId, post.id))
        .orderBy(asc(postSeries.orderIndex), asc(series.id))
        .limit(1),
    ]);

    const parentCategory = parentCategoryRows[0] ?? null;
    const selectedSeries = seriesRows[0] ?? null;
    const categoryPath =
      category === null ? [] : parentCategory ? [parentCategory, category] : [category];

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
        category,
        categoryPath,
        series: selectedSeries,
        tags: tagRows,
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

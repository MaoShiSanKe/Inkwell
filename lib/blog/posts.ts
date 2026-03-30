import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { searchPublishedPostIds } from "@/lib/meilisearch";
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
    slug: string;
  };
  seo: BlogPostSeoData;
  ogImage: {
    source: "local" | "external";
    storagePath: string | null;
    thumbnailPath: string | null;
    externalUrl: string | null;
    altText: string | null;
    width: number | null;
    height: number | null;
  } | null;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  categoryPath: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  series: {
    id: number;
    name: string;
    slug: string;
  } | null;
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
    slug: string;
  };
  category: {
    name: string;
    slug: string;
  } | null;
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

export type SitemapEntryItem = {
  loc: string;
  lastModifiedAt: Date;
};

export type ResolvedPublishedCategoryArchive =
  | {
      kind: "archive";
      category: {
        id: number;
        name: string;
        slug: string;
        description: string | null;
      };
      posts: PublishedPostListItem[];
    }
  | {
      kind: "not-found";
    };

export type ResolvedPublishedTagArchive =
  | {
      kind: "archive";
      tag: {
        id: number;
        name: string;
        slug: string;
        description: string | null;
      };
      posts: PublishedPostListItem[];
    }
  | {
      kind: "not-found";
    };

export type ResolvedPublishedAuthorArchive =
  | {
      kind: "archive";
      author: {
        id: number;
        displayName: string;
        slug: string;
      };
      posts: PublishedPostListItem[];
    }
  | {
      kind: "not-found";
    };

export type ResolvedPublishedSeriesArchive =
  | {
      kind: "archive";
      series: {
        id: number;
        name: string;
        slug: string;
        description: string | null;
      };
      posts: PublishedPostListItem[];
    }
  | {
      kind: "not-found";
    };

export type ResolvedPublishedCategoryRss =
  | {
      kind: "feed";
      category: {
        id: number;
        name: string;
        slug: string;
        description: string | null;
      };
      posts: PublishedRssPostItem[];
    }
  | {
      kind: "not-found";
    };

export type ResolvedPublishedTagRss =
  | {
      kind: "feed";
      tag: {
        id: number;
        name: string;
        slug: string;
        description: string | null;
      };
      posts: PublishedRssPostItem[];
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

const SEARCH_LIMIT = 20;

export async function listPublishedPosts(): Promise<PublishedPostListItem[]> {
  const rows = await buildPublishedPostListQuery()
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt));

  return rows.map(mapPublishedPostListItem);
}

async function searchPublishedPostsByDatabase(query: string): Promise<PublishedPostListItem[]> {
  const searchTerm = `%${query.slice(0, 100)}%`;
  const rows = await buildPublishedPostListQuery()
    .where(
      and(
        eq(posts.status, "published"),
        sql`(${posts.title} ilike ${searchTerm} or ${posts.excerpt} ilike ${searchTerm})`,
      ),
    )
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt), desc(posts.id))
    .limit(SEARCH_LIMIT);

  return rows.map(mapPublishedPostListItem);
}

async function searchPublishedPostsByIds(postIds: number[]): Promise<PublishedPostListItem[]> {
  if (postIds.length === 0) {
    return [];
  }

  const rows = await buildPublishedPostListQuery()
    .where(and(eq(posts.status, "published"), inArray(posts.id, postIds)))
    .limit(SEARCH_LIMIT);

  const itemsById = new Map(rows.map((row) => [row.id, mapPublishedPostListItem(row)]));

  return postIds
    .map((postId) => itemsById.get(postId) ?? null)
    .filter((item): item is PublishedPostListItem => item !== null);
}

export async function searchPublishedPosts(query: string): Promise<PublishedPostListItem[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const matchedPostIds = await searchPublishedPostIds(normalizedQuery, SEARCH_LIMIT);

  if (matchedPostIds !== null) {
    return searchPublishedPostsByIds(matchedPostIds);
  }

  return searchPublishedPostsByDatabase(normalizedQuery);
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
  const rows = await buildPublishedRssQuery()
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt));

  return rows.map(mapPublishedRssPostItem);
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

export async function resolvePublishedCategoryRssBySlug(
  slug: string,
): Promise<ResolvedPublishedCategoryRss> {
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

  const rssPosts = await buildPublishedRssQuery()
    .where(and(eq(posts.status, "published"), eq(posts.categoryId, category.id)))
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt));

  return {
    kind: "feed",
    category,
    posts: rssPosts.map(mapPublishedRssPostItem),
  };
}

export async function resolvePublishedTagRssBySlug(
  slug: string,
): Promise<ResolvedPublishedTagRss> {
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

  const rssPosts = await buildPublishedRssQuery()
    .innerJoin(postTags, eq(postTags.postId, posts.id))
    .where(and(eq(posts.status, "published"), eq(postTags.tagId, tag.id)))
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt));

  return {
    kind: "feed",
    tag,
    posts: rssPosts.map(mapPublishedRssPostItem),
  };
}

export async function resolvePublishedAuthorArchiveBySlug(
  slug: string,
): Promise<ResolvedPublishedAuthorArchive> {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    return { kind: "not-found" };
  }

  const [author] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      slug: users.username,
    })
    .from(users)
    .where(eq(users.username, normalizedSlug))
    .limit(1);

  if (!author) {
    return { kind: "not-found" };
  }

  const archivePosts = await buildPublishedPostListQuery()
    .where(and(eq(posts.status, "published"), eq(posts.authorId, author.id)))
    .orderBy(desc(posts.publishedAt), desc(posts.updatedAt));

  return {
    kind: "archive",
    author,
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
      authorSlug: users.username,
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
          slug: post.authorSlug,
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
      authorSlug: users.username,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(categories, eq(posts.categoryId, categories.id));
}

function buildPublishedRssQuery() {
  return db
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
    .innerJoin(users, eq(posts.authorId, users.id));
}

function mapPublishedPostListItem(row: {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date | null;
  authorDisplayName: string;
  authorSlug: string;
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
      slug: row.authorSlug,
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

function mapPublishedRssPostItem(row: {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  publishedAt: Date | null;
  updatedAt: Date;
  authorDisplayName: string;
}): PublishedRssPostItem {
  return {
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    author: {
      displayName: row.authorDisplayName,
    },
  };
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

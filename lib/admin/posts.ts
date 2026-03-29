import "server-only";

import { and, count, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { notifyPostPublished } from "@/lib/email-notifications";
import { getAdminSession, type AdminRole } from "@/lib/auth";
import { getPublishedPostLikeCount } from "@/lib/blog/likes";
import { getPublishedPostViewCount } from "@/lib/blog/views";
import { db } from "@/lib/db";
import {
  categories,
  media,
  postLikes,
  postMeta,
  postRevisions,
  postSeries,
  postSlugAliases,
  posts,
  postTags,
  postViews,
  series,
  sitemapEntries,
  tags,
  users,
} from "@/lib/db/schema";
import {
  getExcerptLength,
  getRevisionLimit,
  getRevisionTtlDays,
} from "@/lib/settings";

import {
  createPostFormState,
  formatScheduledAtInputFromIso,
  type PostFormErrors,
  type PostFormValues,
} from "./post-form";

export type AdminPostListItem = {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "published" | "scheduled" | "trash";
  categoryName: string | null;
  authorDisplayName: string;
  authorUsername: string;
  updatedAt: Date;
  publishedAt: Date | null;
  viewCount: number;
  likeCount: number;
};

export type PostCategoryOption = {
  id: number;
  name: string;
  slug: string;
};

export type PostTagOption = {
  id: number;
  name: string;
  slug: string;
};

export type PostSeriesOption = {
  id: number;
  name: string;
  slug: string;
};

export type CreateAdminPostInput = {
  title: string;
  slug: string;
  categoryId?: string;
  excerpt?: string;
  content: string;
  status: "draft" | "published" | "scheduled";
  scheduledAt?: string;
  scheduledAtIso?: string;
  tagIds?: string[];
  seriesIds?: string[];
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageMediaId?: string;
  canonicalUrl?: string;
  breadcrumbEnabled?: boolean;
  noindex?: boolean;
  nofollow?: boolean;
};

type SuccessfulAdminPostMutation = {
  success: true;
  postId: number;
  affectedSlugs: string[];
};

export type CreateAdminPostResult =
  | SuccessfulAdminPostMutation
  | {
      success: false;
      values: PostFormValues;
      errors: PostFormErrors;
    };

export type UpdateAdminPostResult = CreateAdminPostResult;

export type MoveAdminPostToTrashResult =
  | SuccessfulAdminPostMutation
  | {
      success: false;
      error: string;
    };

export type RestoreAdminPostResult =
  | SuccessfulAdminPostMutation
  | {
      success: false;
      error: string;
    };

export type AdminPostEditorData = {
  id: number;
  currentStatus: "draft" | "published" | "scheduled" | "trash";
  values: PostFormValues;
  engagement: {
    viewCount: number;
    likeCount: number;
  };
};

export type AdminPostRevisionItem = {
  id: number;
  title: string;
  excerpt: string | null;
  content: string;
  status: "draft" | "published" | "scheduled" | "trash";
  reason: string | null;
  createdAt: Date;
  editorDisplayName: string | null;
  editorUsername: string | null;
};

export type PublishScheduledPostsResult = {
  publishedCount: number;
  publishedPostIds: number[];
  affectedSlugs: string[];
};

type NewlyPublishedPostNotification = {
  postId: number;
  slug: string;
  title: string;
  excerpt: string | null;
};

type RevisionDbLike = {
  select: typeof db.select;
  delete: typeof db.delete;
};

type RevisionRetentionSettings = {
  revisionLimit: number;
  revisionTtlDays: number;
};

type DatabaseConstraintError = {
  code?: string;
  constraint?: string;
  constraint_name?: string;
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeSelectedIds(values: string[] | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildExcerpt(content: string, length: number) {
  return stripHtml(content).slice(0, length).trim();
}

function normalizeOptionalText(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizeCanonicalUrl(value: string | undefined) {
  return value?.trim() ?? "";
}

function buildPostPath(slug: string) {
  return `/post/${slug}`;
}

function collectAffectedSlugs(...slugs: Array<string | null | undefined>) {
  return Array.from(new Set(slugs.filter((value): value is string => Boolean(value))));
}

function getUniqueConstraintName(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const databaseError = error as DatabaseConstraintError;

  if (databaseError.code !== "23505") {
    return null;
  }

  return databaseError.constraint_name ?? databaseError.constraint ?? null;
}

function getPostMutationErrors(
  error: unknown,
  fallbackMessage: string,
): PostFormErrors {
  const constraintName = getUniqueConstraintName(error);

  if (
    constraintName === "posts_slug_unique" ||
    constraintName === "post_slug_aliases_slug_unique" ||
    constraintName === "sitemap_entries_loc_unique"
  ) {
    return {
      slug: "该 slug 已存在，请更换。",
    };
  }

  return {
    form: fallbackMessage,
  };
}

function parseSelectedIds(values: string[]) {
  const parsed = values.map((value) => Number.parseInt(value, 10));

  if (parsed.some((value) => !Number.isInteger(value) || value <= 0)) {
    return null;
  }

  return Array.from(new Set(parsed));
}

function getInitialValues(input: CreateAdminPostInput): PostFormValues {
  const scheduledAtIso = input.scheduledAtIso?.trim() ?? "";
  const scheduledAt =
    input.scheduledAt?.trim() ?? formatScheduledAtInputFromIso(scheduledAtIso);

  return {
    title: input.title.trim(),
    slug: normalizeSlug(input.slug),
    categoryId: input.categoryId?.trim() ?? "",
    excerpt: input.excerpt?.trim() ?? "",
    content: input.content.trim(),
    status: input.status,
    scheduledAt,
    scheduledAtIso,
    tagIds: normalizeSelectedIds(input.tagIds),
    seriesIds: normalizeSelectedIds(input.seriesIds),
    metaTitle: normalizeOptionalText(input.metaTitle),
    metaDescription: normalizeOptionalText(input.metaDescription),
    ogTitle: normalizeOptionalText(input.ogTitle),
    ogDescription: normalizeOptionalText(input.ogDescription),
    ogImageMediaId: input.ogImageMediaId?.trim() ?? "",
    canonicalUrl: normalizeCanonicalUrl(input.canonicalUrl),
    breadcrumbEnabled: input.breadcrumbEnabled ?? false,
    noindex: input.noindex ?? false,
    nofollow: input.nofollow ?? false,
  };
}

async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session.isAuthenticated || !session.userId || !session.role) {
    return null;
  }

  return session as {
    isAuthenticated: true;
    userId: number;
    role: AdminRole;
  };
}

async function getRevisionRetentionSettings(): Promise<RevisionRetentionSettings> {
  const [revisionLimit, revisionTtlDays] = await Promise.all([
    getRevisionLimit(),
    getRevisionTtlDays(),
  ]);

  return {
    revisionLimit,
    revisionTtlDays,
  };
}

async function prunePostRevisions(
  tx: RevisionDbLike,
  postId: number,
  retention: RevisionRetentionSettings,
) {
  const { revisionLimit, revisionTtlDays } = retention;
  const [post] = await tx
    .select({ status: posts.status })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) {
    return;
  }

  if (revisionTtlDays > 0 && post.status === "published") {
    const cutoff = new Date(Date.now() - revisionTtlDays * 24 * 60 * 60 * 1000);
    const draftRevisionRows = await tx
      .select({ id: postRevisions.id, createdAt: postRevisions.createdAt })
      .from(postRevisions)
      .where(
        and(
          eq(postRevisions.postId, postId),
          eq(postRevisions.status, "draft"),
          ne(postRevisions.reason, "restored from trash"),
        ),
      )
      .orderBy(desc(postRevisions.createdAt), desc(postRevisions.id));

    const staleDraftIds = draftRevisionRows
      .filter((row) => row.createdAt.getTime() < cutoff.getTime())
      .map((row) => row.id);

    if (staleDraftIds.length > 0) {
      await tx.delete(postRevisions).where(inArray(postRevisions.id, staleDraftIds));
    }
  }

  if (revisionLimit <= 0) {
    return;
  }

  const revisionRows = await tx
    .select({ id: postRevisions.id })
    .from(postRevisions)
    .where(eq(postRevisions.postId, postId))
    .orderBy(desc(postRevisions.createdAt), desc(postRevisions.id));

  const staleRevisionIds = revisionRows.slice(revisionLimit).map((row) => row.id);

  if (staleRevisionIds.length === 0) {
    return;
  }

  await tx.delete(postRevisions).where(inArray(postRevisions.id, staleRevisionIds));
}

async function getPostViewCountMap(postIds: number[]) {
  if (postIds.length === 0) {
    return new Map<number, number>();
  }

  const rows = await db
    .select({
      postId: postViews.postId,
      viewCount: sql<number>`coalesce(sum(${postViews.viewCount}), 0)`,
    })
    .from(postViews)
    .where(inArray(postViews.postId, postIds))
    .groupBy(postViews.postId);

  return new Map(rows.map((row) => [row.postId, Number(row.viewCount)]));
}

async function getPostLikeCountMap(postIds: number[]) {
  if (postIds.length === 0) {
    return new Map<number, number>();
  }

  const rows = await db
    .select({
      postId: postLikes.postId,
      likeCount: count(),
    })
    .from(postLikes)
    .where(inArray(postLikes.postId, postIds))
    .groupBy(postLikes.postId);

  return new Map(rows.map((row) => [row.postId, Number(row.likeCount)]));
}

export async function listAdminPosts(): Promise<AdminPostListItem[]> {
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      status: posts.status,
      categoryName: categories.name,
      authorDisplayName: users.displayName,
      authorUsername: users.username,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .orderBy(desc(posts.updatedAt))
    .limit(50);

  const postIds = rows.map((row) => row.id);
  const [viewCountMap, likeCountMap] = await Promise.all([
    getPostViewCountMap(postIds),
    getPostLikeCountMap(postIds),
  ]);

  return rows.map((row) => ({
    ...row,
    viewCount: viewCountMap.get(row.id) ?? 0,
    likeCount: likeCountMap.get(row.id) ?? 0,
  }));
}

export async function listPostCategoryOptions(): Promise<PostCategoryOption[]> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories)
    .orderBy(categories.name);
}

export async function listPostTagOptions(): Promise<PostTagOption[]> {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
    })
    .from(tags)
    .orderBy(tags.name);
}

export async function listPostSeriesOptions(): Promise<PostSeriesOption[]> {
  return db
    .select({
      id: series.id,
      name: series.name,
      slug: series.slug,
    })
    .from(series)
    .orderBy(series.name);
}

export async function getAdminPostEditorData(
  postId: number,
): Promise<AdminPostEditorData | null> {
  const [[post], tagRows, seriesRows, [meta], viewCount, likeCount] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        categoryId: posts.categoryId,
        excerpt: posts.excerpt,
        content: posts.content,
        status: posts.status,
        publishedAt: posts.publishedAt,
      })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1),
    db
      .select({ tagId: postTags.tagId })
      .from(postTags)
      .where(eq(postTags.postId, postId)),
    db
      .select({ seriesId: postSeries.seriesId })
      .from(postSeries)
      .where(eq(postSeries.postId, postId))
      .orderBy(postSeries.orderIndex),
    db
      .select({
        metaTitle: postMeta.metaTitle,
        metaDescription: postMeta.metaDescription,
        ogTitle: postMeta.ogTitle,
        ogDescription: postMeta.ogDescription,
        ogImageMediaId: postMeta.ogImageMediaId,
        canonicalUrl: postMeta.canonicalUrl,
        breadcrumbEnabled: postMeta.breadcrumbEnabled,
        noindex: postMeta.noindex,
        nofollow: postMeta.nofollow,
      })
      .from(postMeta)
      .where(eq(postMeta.postId, postId))
      .limit(1),
    getPublishedPostViewCount(postId),
    getPublishedPostLikeCount(postId),
  ]);

  if (!post) {
    return null;
  }

  return {
    id: post.id,
    currentStatus: post.status,
    values: createPostFormState({
      title: post.title,
      slug: post.slug,
      categoryId: post.categoryId ? String(post.categoryId) : "",
      excerpt: post.excerpt ?? "",
      content: post.content,
      status:
        post.status === "published"
          ? "published"
          : post.status === "scheduled"
            ? "scheduled"
            : "draft",
      scheduledAt:
        post.status === "scheduled" && post.publishedAt
          ? formatScheduledAtInputFromIso(post.publishedAt.toISOString())
          : "",
      scheduledAtIso:
        post.status === "scheduled" && post.publishedAt
          ? post.publishedAt.toISOString()
          : "",
      tagIds: tagRows.map((row) => String(row.tagId)),
      seriesIds: seriesRows.map((row) => String(row.seriesId)),
      metaTitle: meta?.metaTitle ?? "",
      metaDescription: meta?.metaDescription ?? "",
      ogTitle: meta?.ogTitle ?? "",
      ogDescription: meta?.ogDescription ?? "",
      ogImageMediaId: meta?.ogImageMediaId ? String(meta.ogImageMediaId) : "",
      canonicalUrl: meta?.canonicalUrl ?? "",
      breadcrumbEnabled: meta?.breadcrumbEnabled ?? false,
      noindex: meta?.noindex ?? false,
      nofollow: meta?.nofollow ?? false,
    }).values,
    engagement: {
      viewCount,
      likeCount,
    },
  };
}

export async function listAdminPostRevisions(
  postId: number,
  limit = 20,
): Promise<AdminPostRevisionItem[]> {
  return db
    .select({
      id: postRevisions.id,
      title: postRevisions.title,
      excerpt: postRevisions.excerpt,
      content: postRevisions.content,
      status: postRevisions.status,
      reason: postRevisions.reason,
      createdAt: postRevisions.createdAt,
      editorDisplayName: users.displayName,
      editorUsername: users.username,
    })
    .from(postRevisions)
    .leftJoin(users, eq(postRevisions.editorId, users.id))
    .where(eq(postRevisions.postId, postId))
    .orderBy(desc(postRevisions.createdAt), desc(postRevisions.id))
    .limit(limit);
}

export async function restoreAdminPostRevision(
  postId: number,
  revisionId: number,
): Promise<UpdateAdminPostResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      values: createPostFormState().values,
      errors: {
        form: "当前会话无效，请重新登录。",
      },
    };
  }

  if (
    !Number.isInteger(postId) ||
    postId <= 0 ||
    !Number.isInteger(revisionId) ||
    revisionId <= 0
  ) {
    return {
      success: false,
      values: createPostFormState().values,
      errors: {
        form: "修订记录不存在。",
      },
    };
  }

  const [[existingPost], [targetRevision], existingAliasRows] = await Promise.all([
    db
      .select({
        id: posts.id,
        slug: posts.slug,
      })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1),
    db
      .select({
        id: postRevisions.id,
        title: postRevisions.title,
        excerpt: postRevisions.excerpt,
        content: postRevisions.content,
      })
      .from(postRevisions)
      .where(and(eq(postRevisions.id, revisionId), eq(postRevisions.postId, postId)))
      .limit(1),
    db
      .select({ slug: postSlugAliases.slug })
      .from(postSlugAliases)
      .where(eq(postSlugAliases.postId, postId)),
  ]);

  if (!existingPost || !targetRevision) {
    return {
      success: false,
      values: createPostFormState().values,
      errors: {
        form: "修订记录不存在。",
      },
    };
  }

  const now = new Date();
  const retention = await getRevisionRetentionSettings();
  const affectedSlugs = collectAffectedSlugs(
    existingPost.slug,
    ...existingAliasRows.map((row) => row.slug),
  );

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(posts)
        .set({
          title: targetRevision.title,
          excerpt: targetRevision.excerpt,
          content: targetRevision.content,
          status: "draft",
          publishedAt: null,
          updatedAt: now,
        })
        .where(eq(posts.id, postId));

      await tx.delete(sitemapEntries).where(eq(sitemapEntries.postId, postId));

      await tx.insert(postRevisions).values({
        postId,
        editorId: session.userId,
        title: targetRevision.title,
        excerpt: targetRevision.excerpt,
        content: targetRevision.content,
        status: "draft",
        reason: "restored from revision",
      });

      await prunePostRevisions(tx, postId, retention);
    });

    return {
      success: true,
      postId,
      affectedSlugs,
    };
  } catch (error) {
    return {
      success: false,
      values: createPostFormState().values,
      errors: getPostMutationErrors(error, "恢复修订失败，请重试。"),
    };
  }
}

export async function publishScheduledPosts(
  now = new Date(),
): Promise<PublishScheduledPostsResult> {
  const scheduledRows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(eq(posts.status, "scheduled"));

  const dueRows = scheduledRows.filter(
    (row) => row.publishedAt && row.publishedAt.getTime() <= now.getTime(),
  );

  if (dueRows.length === 0) {
    return {
      publishedCount: 0,
      publishedPostIds: [],
      affectedSlugs: [],
    };
  }

  const retention = await getRevisionRetentionSettings();
  const publishedPostIds: number[] = [];
  const notifications: NewlyPublishedPostNotification[] = [];

  for (const row of dueRows) {
    const [publishedPost] = await db.transaction(async (tx) => {
      const updatedRows = await tx
        .update(posts)
        .set({
          status: "published",
          updatedAt: now,
        })
        .where(and(eq(posts.id, row.id), eq(posts.status, "scheduled")))
        .returning({
          id: posts.id,
          slug: posts.slug,
          title: posts.title,
          excerpt: posts.excerpt,
        });

      if (updatedRows.length === 0) {
        return [];
      }

      await tx
        .insert(sitemapEntries)
        .values({
          postId: row.id,
          loc: buildPostPath(row.slug),
          lastModifiedAt: now,
        })
        .onConflictDoUpdate({
          target: sitemapEntries.postId,
          set: {
            loc: buildPostPath(row.slug),
            lastModifiedAt: now,
          },
        });

      await prunePostRevisions(tx, row.id, retention);

      return updatedRows;
    });

    if (!publishedPost) {
      continue;
    }

    publishedPostIds.push(row.id);
    notifications.push({
      postId: publishedPost.id,
      slug: publishedPost.slug,
      title: publishedPost.title,
      excerpt: publishedPost.excerpt,
    });
  }

  for (const notification of notifications) {
    await notifyPostPublished({
      postId: notification.postId,
      postSlug: notification.slug,
      postTitle: notification.title,
      excerpt: notification.excerpt,
    });
  }

  return {
    publishedCount: publishedPostIds.length,
    publishedPostIds,
    affectedSlugs: notifications.map((row) => row.slug),
  };
}

export async function createAdminPost(
  input: CreateAdminPostInput,
): Promise<CreateAdminPostResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      values: getInitialValues(input),
      errors: {
        form: "当前会话无效，请重新登录。",
      },
    };
  }

  const values = getInitialValues(input);
  const validation = await validatePostInput(values);

  if (!validation.success) {
    return {
      success: false,
      values,
      errors: validation.errors,
    };
  }

  const { parsedCategoryId, parsedTagIds, parsedSeriesIds, resolvedExcerpt, publishedAt, seo } =
    validation;
  const now = new Date();
  const retention = await getRevisionRetentionSettings();
  const shouldNotifyPublished = values.status === "published";

  try {
    const insertedPost = await db.transaction(async (tx) => {
      const [post] = await tx
        .insert(posts)
        .values({
          authorId: session.userId,
          categoryId: parsedCategoryId,
          title: values.title,
          slug: values.slug,
          excerpt: resolvedExcerpt,
          content: values.content,
          status: values.status,
          publishedAt,
          updatedAt: now,
        })
        .returning({ id: posts.id });

      if (parsedTagIds.length > 0) {
        await tx.insert(postTags).values(
          parsedTagIds.map((tagId) => ({
            postId: post.id,
            tagId,
          })),
        );
      }

      if (parsedSeriesIds.length > 0) {
        await tx.insert(postSeries).values(
          parsedSeriesIds.map((seriesId, index) => ({
            postId: post.id,
            seriesId,
            orderIndex: index,
          })),
        );
      }

      await tx.insert(postMeta).values({
        postId: post.id,
        metaTitle: seo.metaTitle,
        metaDescription: seo.metaDescription,
        ogTitle: seo.ogTitle,
        ogDescription: seo.ogDescription,
        ogImageMediaId: seo.ogImageMediaId,
        canonicalUrl: seo.canonicalUrl,
        breadcrumbEnabled: seo.breadcrumbEnabled,
        noindex: seo.noindex,
        nofollow: seo.nofollow,
        updatedAt: now,
      });

      await tx.insert(postRevisions).values({
        postId: post.id,
        editorId: session.userId,
        title: values.title,
        excerpt: resolvedExcerpt,
        content: values.content,
        status: values.status,
        reason: "initial create",
      });

      if (values.status === "published") {
        await tx
          .insert(sitemapEntries)
          .values({
            postId: post.id,
            loc: buildPostPath(values.slug),
            lastModifiedAt: now,
          })
          .onConflictDoUpdate({
            target: sitemapEntries.postId,
            set: {
              loc: buildPostPath(values.slug),
              lastModifiedAt: now,
            },
          });
      }

      await prunePostRevisions(tx, post.id, retention);

      return post;
    });

    if (shouldNotifyPublished) {
      await notifyPostPublished({
        postId: insertedPost.id,
        postSlug: values.slug,
        postTitle: values.title,
        excerpt: resolvedExcerpt,
      });
    }

    return {
      success: true,
      postId: insertedPost.id,
      affectedSlugs: collectAffectedSlugs(values.slug),
    };
  } catch (error) {
    return {
      success: false,
      values,
      errors: getPostMutationErrors(error, "创建文章失败，请重试。"),
    };
  }
}

export async function updateAdminPost(
  postId: number,
  input: CreateAdminPostInput,
): Promise<UpdateAdminPostResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      values: getInitialValues(input),
      errors: {
        form: "当前会话无效，请重新登录。",
      },
    };
  }

  if (!Number.isInteger(postId) || postId <= 0) {
    return {
      success: false,
      values: getInitialValues(input),
      errors: {
        form: "文章不存在。",
      },
    };
  }

  const [existingPost] = await db
    .select({ id: posts.id, slug: posts.slug, status: posts.status })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!existingPost) {
    return {
      success: false,
      values: getInitialValues(input),
      errors: {
        form: "文章不存在。",
      },
    };
  }

  const values = getInitialValues(input);
  const validation = await validatePostInput(values, postId);

  if (!validation.success) {
    return {
      success: false,
      values,
      errors: validation.errors,
    };
  }

  const existingAliasRows = await db
    .select({ slug: postSlugAliases.slug })
    .from(postSlugAliases)
    .where(eq(postSlugAliases.postId, postId));

  const affectedSlugs = collectAffectedSlugs(
    existingPost.slug,
    values.slug,
    ...existingAliasRows.map((row) => row.slug),
  );

  const { parsedCategoryId, parsedTagIds, parsedSeriesIds, resolvedExcerpt, publishedAt, seo } =
    validation;
  const now = new Date();
  const slugChanged = values.slug !== existingPost.slug;
  const retention = await getRevisionRetentionSettings();
  const shouldNotifyPublished = existingPost.status !== "published" && values.status === "published";

  try {
    await db.transaction(async (tx) => {
      if (slugChanged) {
        const [restoredAlias] = await tx
          .select({ id: postSlugAliases.id })
          .from(postSlugAliases)
          .where(
            and(
              eq(postSlugAliases.postId, postId),
              eq(postSlugAliases.slug, values.slug),
            ),
          )
          .limit(1);

        if (restoredAlias) {
          await tx.delete(postSlugAliases).where(eq(postSlugAliases.id, restoredAlias.id));
        }

        await tx.insert(postSlugAliases).values({
          postId,
          slug: existingPost.slug,
        });
      }

      await tx
        .update(posts)
        .set({
          categoryId: parsedCategoryId,
          title: values.title,
          slug: values.slug,
          excerpt: resolvedExcerpt,
          content: values.content,
          status: values.status,
          publishedAt,
          updatedAt: now,
        })
        .where(eq(posts.id, postId));

      await tx.delete(postTags).where(eq(postTags.postId, postId));
      await tx.delete(postSeries).where(eq(postSeries.postId, postId));

      if (parsedTagIds.length > 0) {
        await tx.insert(postTags).values(
          parsedTagIds.map((tagId) => ({
            postId,
            tagId,
          })),
        );
      }

      if (parsedSeriesIds.length > 0) {
        await tx.insert(postSeries).values(
          parsedSeriesIds.map((seriesId, index) => ({
            postId,
            seriesId,
            orderIndex: index,
          })),
        );
      }

      await tx
        .insert(postMeta)
        .values({
          postId,
          metaTitle: seo.metaTitle,
          metaDescription: seo.metaDescription,
          ogTitle: seo.ogTitle,
          ogDescription: seo.ogDescription,
          ogImageMediaId: seo.ogImageMediaId,
          canonicalUrl: seo.canonicalUrl,
          breadcrumbEnabled: seo.breadcrumbEnabled,
          noindex: seo.noindex,
          nofollow: seo.nofollow,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: postMeta.postId,
          set: {
            metaTitle: seo.metaTitle,
            metaDescription: seo.metaDescription,
            ogTitle: seo.ogTitle,
            ogDescription: seo.ogDescription,
            ogImageMediaId: seo.ogImageMediaId,
            canonicalUrl: seo.canonicalUrl,
            breadcrumbEnabled: seo.breadcrumbEnabled,
            noindex: seo.noindex,
            nofollow: seo.nofollow,
            updatedAt: now,
          },
        });

      await tx.insert(postRevisions).values({
        postId,
        editorId: session.userId,
        title: values.title,
        excerpt: resolvedExcerpt,
        content: values.content,
        status: values.status,
        reason: "manual update",
      });

      if (values.status === "published") {
        await tx
          .insert(sitemapEntries)
          .values({
            postId,
            loc: buildPostPath(values.slug),
            lastModifiedAt: now,
          })
          .onConflictDoUpdate({
            target: sitemapEntries.postId,
            set: {
              loc: buildPostPath(values.slug),
              lastModifiedAt: now,
            },
          });
      } else {
        await tx.delete(sitemapEntries).where(eq(sitemapEntries.postId, postId));
      }

      await prunePostRevisions(tx, postId, retention);
    });

    if (shouldNotifyPublished) {
      await notifyPostPublished({
        postId,
        postSlug: values.slug,
        postTitle: values.title,
        excerpt: resolvedExcerpt,
      });
    }

    return {
      success: true,
      postId,
      affectedSlugs,
    };
  } catch (error) {
    return {
      success: false,
      values,
      errors: getPostMutationErrors(error, "更新文章失败，请重试。"),
    };
  }
}

export async function moveAdminPostToTrash(
  postId: number,
): Promise<MoveAdminPostToTrashResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      error: "当前会话无效，请重新登录。",
    };
  }

  if (!Number.isInteger(postId) || postId <= 0) {
    return {
      success: false,
      error: "文章不存在。",
    };
  }

  const [existingPost] = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      content: posts.content,
      status: posts.status,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!existingPost) {
    return {
      success: false,
      error: "文章不存在。",
    };
  }

  const existingAliasRows = await db
    .select({ slug: postSlugAliases.slug })
    .from(postSlugAliases)
    .where(eq(postSlugAliases.postId, postId));

  const affectedSlugs = collectAffectedSlugs(
    existingPost.slug,
    ...existingAliasRows.map((row) => row.slug),
  );

  if (existingPost.status === "trash") {
    return {
      success: true,
      postId,
      affectedSlugs,
    };
  }

  const retention = await getRevisionRetentionSettings();

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(posts)
        .set({
          status: "trash",
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId));

      await tx.delete(sitemapEntries).where(eq(sitemapEntries.postId, postId));

      await tx.insert(postRevisions).values({
        postId,
        editorId: session.userId,
        title: existingPost.title,
        excerpt: existingPost.excerpt,
        content: existingPost.content,
        status: "trash",
        reason: "moved to trash",
      });

      await prunePostRevisions(tx, postId, retention);
    });

    return {
      success: true,
      postId,
      affectedSlugs,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "移入回收站失败。",
    };
  }
}

export async function restoreAdminPostFromTrash(
  postId: number,
): Promise<RestoreAdminPostResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      error: "当前会话无效，请重新登录。",
    };
  }

  if (!Number.isInteger(postId) || postId <= 0) {
    return {
      success: false,
      error: "文章不存在。",
    };
  }

  const [existingPost] = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      content: posts.content,
      status: posts.status,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!existingPost) {
    return {
      success: false,
      error: "文章不存在。",
    };
  }

  const existingAliasRows = await db
    .select({ slug: postSlugAliases.slug })
    .from(postSlugAliases)
    .where(eq(postSlugAliases.postId, postId));

  const affectedSlugs = collectAffectedSlugs(
    existingPost.slug,
    ...existingAliasRows.map((row) => row.slug),
  );

  if (existingPost.status !== "trash") {
    return {
      success: true,
      postId,
      affectedSlugs,
    };
  }

  const retention = await getRevisionRetentionSettings();

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(posts)
        .set({
          status: "draft",
          publishedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId));

      await tx.delete(sitemapEntries).where(eq(sitemapEntries.postId, postId));

      await tx.insert(postRevisions).values({
        postId,
        editorId: session.userId,
        title: existingPost.title,
        excerpt: existingPost.excerpt,
        content: existingPost.content,
        status: "draft",
        reason: "restored from trash",
      });

      await prunePostRevisions(tx, postId, retention);
    });

    return {
      success: true,
      postId,
      affectedSlugs,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "恢复文章失败。",
    };
  }
}

async function validatePostInput(values: PostFormValues, currentPostId?: number) {
  const errors: PostFormErrors = {};

  if (!values.title || values.title.length > 255) {
    errors.title = "标题不能为空，且长度不能超过 255 个字符。";
  }

  if (!values.slug || values.slug.length > 255) {
    errors.slug = "Slug 不能为空，且长度不能超过 255 个字符。";
  }

  if (!/^[a-z0-9-]+$/.test(values.slug)) {
    errors.slug = "Slug 只能包含小写字母、数字和短横线。";
  }

  if (!values.content) {
    errors.content = "正文不能为空。";
  }

  if (
    values.status !== "draft" &&
    values.status !== "published" &&
    values.status !== "scheduled"
  ) {
    errors.status = "仅支持保存草稿、直接发布或定时发布。";
  }

  let scheduledAtDate: Date | null = null;

  if (values.status === "scheduled") {
    const scheduledAtSource = values.scheduledAtIso || values.scheduledAt;

    if (!scheduledAtSource) {
      errors.scheduledAt = "请选择未来的发布时间。";
    } else {
      scheduledAtDate = new Date(scheduledAtSource);

      if (Number.isNaN(scheduledAtDate.getTime())) {
        errors.scheduledAt = "计划发布时间格式无效。";
        scheduledAtDate = null;
      } else if (scheduledAtDate.getTime() <= Date.now()) {
        errors.scheduledAt = "计划发布时间必须晚于当前时间。";
        scheduledAtDate = null;
      }
    }
  }

  if (values.metaTitle.length > 255) {
    errors.metaTitle = "Meta Title 不能超过 255 个字符。";
  }

  if (values.ogTitle.length > 255) {
    errors.ogTitle = "OG Title 不能超过 255 个字符。";
  }

  let parsedOgImageMediaId: number | null = null;

  if (values.ogImageMediaId) {
    parsedOgImageMediaId = Number.parseInt(values.ogImageMediaId, 10);

    if (!Number.isInteger(parsedOgImageMediaId) || parsedOgImageMediaId <= 0) {
      errors.ogImageMediaId = "所选 OG 图片无效。";
      parsedOgImageMediaId = null;
    }
  }

  if (values.canonicalUrl) {
    try {
      const url = new URL(values.canonicalUrl);

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        errors.canonicalUrl = "Canonical URL 必须使用 http 或 https。";
      }
    } catch {
      errors.canonicalUrl = "Canonical URL 格式无效。";
    }
  }

  let parsedCategoryId: number | null = null;

  if (values.categoryId) {
    parsedCategoryId = Number.parseInt(values.categoryId, 10);

    if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
      errors.categoryId = "分类无效。";
    }
  }

  const parsedTagIds = parseSelectedIds(values.tagIds);

  if (parsedTagIds === null) {
    errors.tagIds = "标签数据无效。";
  }

  const parsedSeriesIds = parseSelectedIds(values.seriesIds);

  if (parsedSeriesIds === null) {
    errors.seriesIds = "系列数据无效。";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false as const,
      errors,
    };
  }

  if (parsedCategoryId !== null) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, parsedCategoryId))
      .limit(1);

    if (!category) {
      return {
        success: false as const,
        errors: {
          categoryId: "所选分类不存在。",
        },
      };
    }
  }

  if (parsedOgImageMediaId !== null) {
    const [ogImage] = await db
      .select({ id: media.id })
      .from(media)
      .where(eq(media.id, parsedOgImageMediaId))
      .limit(1);

    if (!ogImage) {
      return {
        success: false as const,
        errors: {
          ogImageMediaId: "所选 OG 图片不存在。",
        },
      };
    }
  }

  const tagIds = parsedTagIds ?? [];
  const seriesIds = parsedSeriesIds ?? [];

  if (tagIds.length > 0) {
    const existingTags = await db
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.id, tagIds));

    if (existingTags.length !== tagIds.length) {
      return {
        success: false as const,
        errors: {
          tagIds: "所选标签不存在。",
        },
      };
    }
  }

  if (seriesIds.length > 0) {
    const existingSeries = await db
      .select({ id: series.id })
      .from(series)
      .where(inArray(series.id, seriesIds));

    if (existingSeries.length !== seriesIds.length) {
      return {
        success: false as const,
        errors: {
          seriesIds: "所选系列不存在。",
        },
      };
    }
  }

  const [[existingPost], [existingAlias]] = await Promise.all([
    db
      .select({ id: posts.id })
      .from(posts)
      .where(
        currentPostId
          ? and(eq(posts.slug, values.slug), ne(posts.id, currentPostId))
          : eq(posts.slug, values.slug),
      )
      .limit(1),
    db
      .select({ postId: postSlugAliases.postId })
      .from(postSlugAliases)
      .where(eq(postSlugAliases.slug, values.slug))
      .limit(1),
  ]);

  if (existingPost || (existingAlias && existingAlias.postId !== currentPostId)) {
    return {
      success: false as const,
      errors: {
        slug: existingPost
          ? "该 slug 已被其他文章使用。"
          : "该 slug 已存在于历史记录中，请更换。",
      },
    };
  }

  const excerptLength = await getExcerptLength();
  const resolvedExcerpt = values.excerpt || buildExcerpt(values.content, excerptLength);
  const publishedAt =
    values.status === "published"
      ? new Date()
      : values.status === "scheduled"
        ? scheduledAtDate
        : null;
  const seo = {
    metaTitle: values.metaTitle || null,
    metaDescription: values.metaDescription || null,
    ogTitle: values.ogTitle || null,
    ogDescription: values.ogDescription || null,
    ogImageMediaId: parsedOgImageMediaId,
    canonicalUrl: values.canonicalUrl || null,
    breadcrumbEnabled: values.breadcrumbEnabled,
    noindex: values.noindex,
    nofollow: values.nofollow,
  };

  return {
    success: true as const,
    parsedCategoryId,
    parsedTagIds: tagIds,
    parsedSeriesIds: seriesIds,
    resolvedExcerpt,
    publishedAt,
    seo,
  };
}

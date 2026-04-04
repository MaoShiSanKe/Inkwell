import { and, desc, eq, inArray } from "drizzle-orm";

import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { customPageMeta, customPages, media } from "@/lib/db/schema";
import { getAdminPath } from "@/lib/settings";

import type { PageFormErrors, PageFormValues } from "./page-form";

export type AdminPageListItem = {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "published" | "trash";
  publishedAt: Date | null;
  updatedAt: Date;
};

type AdminSessionWithUser = {
  isAuthenticated: true;
  userId: number;
};

export type AdminPageEditorData = {
  id: number;
  currentStatus: "draft" | "published" | "trash";
  values: PageFormValues;
};

export type PublishedCustomPageData = {
  id: number;
  title: string;
  slug: string;
  content: string;
  publishedAt: Date | null;
  updatedAt: Date;
  seo: {
    metaTitle: string | null;
    metaDescription: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    canonicalUrl: string | null;
    noindex: boolean;
    nofollow: boolean;
  };
  ogImage: {
    source: "local" | "external";
    storagePath: string | null;
    thumbnailPath: string | null;
    externalUrl: string | null;
    altText: string | null;
    width: number | null;
    height: number | null;
  } | null;
};

export type AdminPageMutationResult =
  | {
      success: true;
      pageId: number;
      affectedSlugs: string[];
    }
  | {
      success: false;
      values: PageFormValues;
      errors: PageFormErrors;
    };

const RESERVED_SEGMENTS = [
  "post",
  "category",
  "tag",
  "author",
  "series",
  "search",
  "subscribe",
  "unsubscribe",
  "friend-links",
  "api",
  "pages",
  "robots.txt",
  "sitemap.xml",
  "rss.xml",
  "favicon.ico",
] as const;

function normalizeOptionalText(value: string) {
  return value.trim();
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getInitialValues(input: Partial<PageFormValues>): PageFormValues {
  return {
    title: input.title?.trim() ?? "",
    slug: normalizeOptionalText(input.slug ?? ""),
    content: input.content ?? "",
    status:
      input.status === "published" || input.status === "trash"
        ? input.status
        : "draft",
    metaTitle: input.metaTitle?.trim() ?? "",
    metaDescription: input.metaDescription?.trim() ?? "",
    ogTitle: input.ogTitle?.trim() ?? "",
    ogDescription: input.ogDescription?.trim() ?? "",
    ogImageMediaId: input.ogImageMediaId?.trim() ?? "",
    canonicalUrl: input.canonicalUrl?.trim() ?? "",
    noindex: input.noindex ?? false,
    nofollow: input.nofollow ?? false,
  };
}

async function requireAdminSession(): Promise<AdminSessionWithUser | null> {
  const session = await getAdminSession();

  if (!session.isAuthenticated || !session.userId) {
    return null;
  }

  return session as AdminSessionWithUser;
}

async function getReservedSegments() {
  const adminPath = await getAdminPath();
  return new Set([...RESERVED_SEGMENTS, adminPath]);
}

async function validatePageInput(
  values: PageFormValues,
  currentPageId?: number,
): Promise<{ success: true; normalizedSlug: string; publishedAt: Date | null } | { success: false; errors: PageFormErrors }> {
  const errors: PageFormErrors = {};
  const normalizedSlug = normalizeSlug(values.slug);

  if (!values.title) {
    errors.title = "标题不能为空。";
  } else if (values.title.length > 255) {
    errors.title = "标题长度不能超过 255 个字符。";
  }

  if (!normalizedSlug) {
    errors.slug = "Slug 不能为空，且只能包含小写字母、数字和短横线。";
  } else if (normalizedSlug.includes("/")) {
    errors.slug = "Slug 只能是单段路径。";
  } else if ((await getReservedSegments()).has(normalizedSlug)) {
    errors.slug = "该 slug 与现有系统路由冲突，请更换。";
  }

  if (!values.content.trim()) {
    errors.content = "正文不能为空。";
  }

  if (values.metaTitle.length > 255) {
    errors.metaTitle = "Meta Title 长度不能超过 255 个字符。";
  }

  if (values.ogTitle.length > 255) {
    errors.ogTitle = "OG Title 长度不能超过 255 个字符。";
  }

  if (values.ogImageMediaId && !Number.isInteger(Number.parseInt(values.ogImageMediaId, 10))) {
    errors.ogImageMediaId = "OG 图片无效。";
  }

  const publishedAt = values.status === "published" ? new Date() : null;

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const existingRows = await db
    .select({ id: customPages.id })
    .from(customPages)
    .where(eq(customPages.slug, normalizedSlug))
    .limit(1);

  const existing = existingRows[0] ?? null;

  if (existing && existing.id !== currentPageId) {
    return {
      success: false,
      errors: {
        slug: "该 slug 已存在，请更换。",
      },
    };
  }

  return {
    success: true,
    normalizedSlug,
    publishedAt,
  };
}

export async function listAdminPages(): Promise<AdminPageListItem[]> {
  const rows = await db
    .select({
      id: customPages.id,
      title: customPages.title,
      slug: customPages.slug,
      status: customPages.status,
      publishedAt: customPages.publishedAt,
      updatedAt: customPages.updatedAt,
    })
    .from(customPages)
    .where(inArray(customPages.status, ["draft", "published", "trash"]))
    .orderBy(desc(customPages.updatedAt), desc(customPages.id));

  return rows as AdminPageListItem[];
}

export async function getAdminPageEditorData(pageId: number): Promise<AdminPageEditorData | null> {
  const [row] = await db
    .select({
      id: customPages.id,
      title: customPages.title,
      slug: customPages.slug,
      content: customPages.content,
      status: customPages.status,
      metaTitle: customPageMeta.metaTitle,
      metaDescription: customPageMeta.metaDescription,
      ogTitle: customPageMeta.ogTitle,
      ogDescription: customPageMeta.ogDescription,
      ogImageMediaId: customPageMeta.ogImageMediaId,
      canonicalUrl: customPageMeta.canonicalUrl,
      noindex: customPageMeta.noindex,
      nofollow: customPageMeta.nofollow,
    })
    .from(customPages)
    .leftJoin(customPageMeta, eq(customPageMeta.pageId, customPages.id))
    .where(eq(customPages.id, pageId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    currentStatus: row.status as "draft" | "published" | "trash",
    values: getInitialValues({
      title: row.title,
      slug: row.slug,
      content: row.content,
      status: row.status as "draft" | "published" | "trash",
      metaTitle: row.metaTitle ?? "",
      metaDescription: row.metaDescription ?? "",
      ogTitle: row.ogTitle ?? "",
      ogDescription: row.ogDescription ?? "",
      ogImageMediaId: row.ogImageMediaId ? String(row.ogImageMediaId) : "",
      canonicalUrl: row.canonicalUrl ?? "",
      noindex: row.noindex ?? false,
      nofollow: row.nofollow ?? false,
    }),
  };
}

async function upsertPageMeta(pageId: number, values: PageFormValues) {
  await db
    .insert(customPageMeta)
    .values({
      pageId,
      metaTitle: values.metaTitle || null,
      metaDescription: values.metaDescription || null,
      ogTitle: values.ogTitle || null,
      ogDescription: values.ogDescription || null,
      ogImageMediaId: values.ogImageMediaId ? Number.parseInt(values.ogImageMediaId, 10) : null,
      canonicalUrl: values.canonicalUrl || null,
      noindex: values.noindex,
      nofollow: values.nofollow,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: customPageMeta.pageId,
      set: {
        metaTitle: values.metaTitle || null,
        metaDescription: values.metaDescription || null,
        ogTitle: values.ogTitle || null,
        ogDescription: values.ogDescription || null,
        ogImageMediaId: values.ogImageMediaId ? Number.parseInt(values.ogImageMediaId, 10) : null,
        canonicalUrl: values.canonicalUrl || null,
        noindex: values.noindex,
        nofollow: values.nofollow,
        updatedAt: new Date(),
      },
    });
}

export async function createAdminPage(input: Partial<PageFormValues>): Promise<AdminPageMutationResult> {
  const session = await requireAdminSession();
  const values = getInitialValues(input);

  if (!session) {
    return {
      success: false,
      values,
      errors: { form: "当前会话无效，请重新登录。" },
    };
  }

  const validation = await validatePageInput(values);

  if (!validation.success) {
    return {
      success: false,
      values,
      errors: validation.errors,
    };
  }

  const [page] = await db
    .insert(customPages)
    .values({
      authorId: session.userId,
      title: values.title,
      slug: validation.normalizedSlug,
      content: values.content,
      status: values.status,
      publishedAt: validation.publishedAt,
      updatedAt: new Date(),
    })
    .returning({ id: customPages.id, slug: customPages.slug });

  await upsertPageMeta(page.id, values);

  return {
    success: true,
    pageId: page.id,
    affectedSlugs: [page.slug],
  };
}

export async function updateAdminPage(
  pageId: number,
  input: Partial<PageFormValues>,
): Promise<AdminPageMutationResult> {
  const session = await requireAdminSession();
  const values = getInitialValues(input);

  if (!session) {
    return {
      success: false,
      values,
      errors: { form: "当前会话无效，请重新登录。" },
    };
  }

  const [currentPage] = await db
    .select({ id: customPages.id, slug: customPages.slug, status: customPages.status })
    .from(customPages)
    .where(eq(customPages.id, pageId))
    .limit(1);

  if (!currentPage) {
    return {
      success: false,
      values,
      errors: { form: "页面不存在。" },
    };
  }

  const validation = await validatePageInput(values, pageId);

  if (!validation.success) {
    return {
      success: false,
      values,
      errors: validation.errors,
    };
  }

  const [page] = await db
    .update(customPages)
    .set({
      title: values.title,
      slug: validation.normalizedSlug,
      content: values.content,
      status: values.status,
      publishedAt: validation.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(customPages.id, pageId))
    .returning({ id: customPages.id, slug: customPages.slug });

  await upsertPageMeta(page.id, values);

  return {
    success: true,
    pageId: page.id,
    affectedSlugs: currentPage.slug === page.slug ? [page.slug] : [currentPage.slug, page.slug],
  };
}

export async function moveAdminPageToTrash(pageId: number): Promise<AdminPageMutationResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      values: getInitialValues({}),
      errors: { form: "当前会话无效，请重新登录。" },
    };
  }

  const [page] = await db
    .update(customPages)
    .set({
      status: "trash",
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(customPages.id, pageId))
    .returning({ id: customPages.id, slug: customPages.slug });

  if (!page) {
    return {
      success: false,
      values: getInitialValues({}),
      errors: { form: "页面不存在。" },
    };
  }

  return {
    success: true,
    pageId: page.id,
    affectedSlugs: [page.slug],
  };
}

export async function restoreAdminPageFromTrash(pageId: number): Promise<AdminPageMutationResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      values: getInitialValues({}),
      errors: { form: "当前会话无效，请重新登录。" },
    };
  }

  const [page] = await db
    .update(customPages)
    .set({
      status: "draft",
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(customPages.id, pageId))
    .returning({ id: customPages.id, slug: customPages.slug });

  if (!page) {
    return {
      success: false,
      values: getInitialValues({}),
      errors: { form: "页面不存在。" },
    };
  }

  return {
    success: true,
    pageId: page.id,
    affectedSlugs: [page.slug],
  };
}

export async function resolvePublishedCustomPageBySlug(slug: string): Promise<PublishedCustomPageData | null> {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const [row] = await db
    .select({
      id: customPages.id,
      title: customPages.title,
      slug: customPages.slug,
      content: customPages.content,
      publishedAt: customPages.publishedAt,
      updatedAt: customPages.updatedAt,
      metaTitle: customPageMeta.metaTitle,
      metaDescription: customPageMeta.metaDescription,
      ogTitle: customPageMeta.ogTitle,
      ogDescription: customPageMeta.ogDescription,
      canonicalUrl: customPageMeta.canonicalUrl,
      noindex: customPageMeta.noindex,
      nofollow: customPageMeta.nofollow,
      ogImageSource: media.source,
      ogImageStoragePath: media.storagePath,
      ogImageThumbnailPath: media.thumbnailPath,
      ogImageExternalUrl: media.externalUrl,
      ogImageAltText: media.altText,
      ogImageWidth: media.width,
      ogImageHeight: media.height,
    })
    .from(customPages)
    .leftJoin(customPageMeta, eq(customPageMeta.pageId, customPages.id))
    .leftJoin(media, eq(media.id, customPageMeta.ogImageMediaId))
    .where(and(eq(customPages.slug, normalizedSlug), eq(customPages.status, "published")))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    seo: {
      metaTitle: row.metaTitle ?? null,
      metaDescription: row.metaDescription ?? null,
      ogTitle: row.ogTitle ?? null,
      ogDescription: row.ogDescription ?? null,
      canonicalUrl: row.canonicalUrl ?? null,
      noindex: row.noindex ?? false,
      nofollow: row.nofollow ?? false,
    },
    ogImage: row.ogImageSource
      ? {
          source: row.ogImageSource,
          storagePath: row.ogImageStoragePath,
          thumbnailPath: row.ogImageThumbnailPath,
          externalUrl: row.ogImageExternalUrl,
          altText: row.ogImageAltText,
          width: row.ogImageWidth,
          height: row.ogImageHeight,
        }
      : null,
  };
}

export async function listPublishedCustomPagesByIds(pageIds: number[]): Promise<PublishedCustomPageData[]> {
  const uniqueIds = Array.from(new Set(pageIds.filter((value) => Number.isInteger(value) && value > 0)));

  if (uniqueIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: customPages.id,
      title: customPages.title,
      slug: customPages.slug,
      content: customPages.content,
      publishedAt: customPages.publishedAt,
      updatedAt: customPages.updatedAt,
      metaTitle: customPageMeta.metaTitle,
      metaDescription: customPageMeta.metaDescription,
      ogTitle: customPageMeta.ogTitle,
      ogDescription: customPageMeta.ogDescription,
      canonicalUrl: customPageMeta.canonicalUrl,
      noindex: customPageMeta.noindex,
      nofollow: customPageMeta.nofollow,
      ogImageSource: media.source,
      ogImageStoragePath: media.storagePath,
      ogImageThumbnailPath: media.thumbnailPath,
      ogImageExternalUrl: media.externalUrl,
      ogImageAltText: media.altText,
      ogImageWidth: media.width,
      ogImageHeight: media.height,
    })
    .from(customPages)
    .leftJoin(customPageMeta, eq(customPageMeta.pageId, customPages.id))
    .leftJoin(media, eq(media.id, customPageMeta.ogImageMediaId))
    .where(and(inArray(customPages.id, uniqueIds), eq(customPages.status, "published")));

  const pageMap = new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        title: row.title,
        slug: row.slug,
        content: row.content,
        publishedAt: row.publishedAt,
        updatedAt: row.updatedAt,
        seo: {
          metaTitle: row.metaTitle ?? null,
          metaDescription: row.metaDescription ?? null,
          ogTitle: row.ogTitle ?? null,
          ogDescription: row.ogDescription ?? null,
          canonicalUrl: row.canonicalUrl ?? null,
          noindex: row.noindex ?? false,
          nofollow: row.nofollow ?? false,
        },
        ogImage: row.ogImageSource
          ? {
              source: row.ogImageSource,
              storagePath: row.ogImageStoragePath,
              thumbnailPath: row.ogImageThumbnailPath,
              externalUrl: row.ogImageExternalUrl,
              altText: row.ogImageAltText,
              width: row.ogImageWidth,
              height: row.ogImageHeight,
            }
          : null,
      } satisfies PublishedCustomPageData,
    ]),
  );

  return uniqueIds.flatMap((id) => {
    const page = pageMap.get(id);
    return page ? [page] : [];
  });
}

export async function listPublishedCustomPageSitemapEntries() {
  return db
    .select({
      loc: customPages.slug,
      lastModifiedAt: customPages.updatedAt,
    })
    .from(customPages)
    .where(eq(customPages.status, "published"))
    .orderBy(desc(customPages.updatedAt), desc(customPages.id));
}

import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { friendLinks, media } from "@/lib/db/schema";

import type { FriendLinkFormErrors, FriendLinkFormValues } from "./friend-link-form";

export type AdminFriendLinkListItem = {
  id: number;
  siteName: string;
  url: string;
  description: string;
  sortOrder: number;
  status: "draft" | "published" | "trash";
  publishedAt: Date | null;
  updatedAt: Date;
};

type AdminSessionWithUser = {
  isAuthenticated: true;
  userId: number;
};

export type AdminFriendLinkEditorData = {
  id: number;
  currentStatus: "draft" | "published" | "trash";
  values: FriendLinkFormValues;
};

export type PublishedFriendLinkData = {
  id: number;
  siteName: string;
  url: string;
  description: string;
  sortOrder: number;
  updatedAt: Date;
  logo: {
    source: "local" | "external";
    storagePath: string | null;
    thumbnailPath: string | null;
    externalUrl: string | null;
    altText: string | null;
    width: number | null;
    height: number | null;
  } | null;
};

export type FriendLinkMutationResult =
  | {
      success: true;
      friendLinkId: number;
    }
  | {
      success: false;
      values: FriendLinkFormValues;
      errors: FriendLinkFormErrors;
    };

function normalizeOptionalText(value: string) {
  return value.trim();
}

function getInitialValues(input: Partial<FriendLinkFormValues>): FriendLinkFormValues {
  return {
    siteName: input.siteName?.trim() ?? "",
    url: normalizeOptionalText(input.url ?? ""),
    description: input.description?.trim() ?? "",
    logoMediaId: input.logoMediaId?.trim() ?? "",
    sortOrder: normalizeOptionalText(input.sortOrder ?? "0") || "0",
    status:
      input.status === "published" || input.status === "trash"
        ? input.status
        : "draft",
  };
}

async function requireAdminSession(): Promise<AdminSessionWithUser | null> {
  const session = await getAdminSession();

  if (!session.isAuthenticated || !session.userId) {
    return null;
  }

  return session as AdminSessionWithUser;
}

function validateAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function validateFriendLinkInput(
  values: FriendLinkFormValues,
): Promise<
  | { success: true; normalizedUrl: string; logoMediaId: number | null; sortOrder: number; publishedAt: Date | null }
  | { success: false; errors: FriendLinkFormErrors }
> {
  const errors: FriendLinkFormErrors = {};

  if (!values.siteName) {
    errors.siteName = "站点名不能为空。";
  } else if (values.siteName.length > 160) {
    errors.siteName = "站点名长度不能超过 160 个字符。";
  }

  if (!values.url) {
    errors.url = "链接地址不能为空。";
  } else if (!validateAbsoluteUrl(values.url)) {
    errors.url = "链接地址必须是有效的 http 或 https 绝对地址。";
  }

  if (values.description.length > 2000) {
    errors.description = "描述长度不能超过 2000 个字符。";
  }

  const parsedSortOrder = Number.parseInt(values.sortOrder, 10);

  if (!/^-?\d+$/.test(values.sortOrder)) {
    errors.sortOrder = "排序必须为整数。";
  }

  if (values.logoMediaId && !Number.isInteger(Number.parseInt(values.logoMediaId, 10))) {
    errors.logoMediaId = "Logo 图片无效。";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    normalizedUrl: values.url,
    logoMediaId: values.logoMediaId ? Number.parseInt(values.logoMediaId, 10) : null,
    sortOrder: parsedSortOrder,
    publishedAt: values.status === "published" ? new Date() : null,
  };
}

export async function listAdminFriendLinks(): Promise<AdminFriendLinkListItem[]> {
  const rows = await db
    .select({
      id: friendLinks.id,
      siteName: friendLinks.siteName,
      url: friendLinks.url,
      description: friendLinks.description,
      sortOrder: friendLinks.sortOrder,
      status: friendLinks.status,
      publishedAt: friendLinks.publishedAt,
      updatedAt: friendLinks.updatedAt,
    })
    .from(friendLinks)
    .orderBy(asc(friendLinks.sortOrder), asc(friendLinks.siteName), desc(friendLinks.id));

  return rows as AdminFriendLinkListItem[];
}

export async function getAdminFriendLinkEditorData(
  friendLinkId: number,
): Promise<AdminFriendLinkEditorData | null> {
  const [row] = await db
    .select({
      id: friendLinks.id,
      siteName: friendLinks.siteName,
      url: friendLinks.url,
      description: friendLinks.description,
      logoMediaId: friendLinks.logoMediaId,
      sortOrder: friendLinks.sortOrder,
      status: friendLinks.status,
    })
    .from(friendLinks)
    .where(eq(friendLinks.id, friendLinkId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    currentStatus: row.status as "draft" | "published" | "trash",
    values: getInitialValues({
      siteName: row.siteName,
      url: row.url,
      description: row.description,
      logoMediaId: row.logoMediaId ? String(row.logoMediaId) : "",
      sortOrder: String(row.sortOrder),
      status: row.status as "draft" | "published" | "trash",
    }),
  };
}

export async function createAdminFriendLink(
  input: Partial<FriendLinkFormValues>,
): Promise<FriendLinkMutationResult> {
  const session = await requireAdminSession();
  const values = getInitialValues(input);

  if (!session) {
    return {
      success: false,
      values,
      errors: { form: "当前会话无效，请重新登录。" },
    };
  }

  const validation = await validateFriendLinkInput(values);

  if (!validation.success) {
    return {
      success: false,
      values,
      errors: validation.errors,
    };
  }

  const [created] = await db
    .insert(friendLinks)
    .values({
      authorId: session.userId,
      siteName: values.siteName,
      url: validation.normalizedUrl,
      description: values.description,
      logoMediaId: validation.logoMediaId,
      sortOrder: validation.sortOrder,
      status: values.status,
      publishedAt: validation.publishedAt,
      updatedAt: new Date(),
    })
    .returning({ id: friendLinks.id });

  return {
    success: true,
    friendLinkId: created.id,
  };
}

export async function updateAdminFriendLink(
  friendLinkId: number,
  input: Partial<FriendLinkFormValues>,
): Promise<FriendLinkMutationResult> {
  const session = await requireAdminSession();
  const values = getInitialValues(input);

  if (!session) {
    return {
      success: false,
      values,
      errors: { form: "当前会话无效，请重新登录。" },
    };
  }

  const [current] = await db
    .select({ id: friendLinks.id })
    .from(friendLinks)
    .where(eq(friendLinks.id, friendLinkId))
    .limit(1);

  if (!current) {
    return {
      success: false,
      values,
      errors: { form: "友链不存在。" },
    };
  }

  const validation = await validateFriendLinkInput(values);

  if (!validation.success) {
    return {
      success: false,
      values,
      errors: validation.errors,
    };
  }

  const [updated] = await db
    .update(friendLinks)
    .set({
      siteName: values.siteName,
      url: validation.normalizedUrl,
      description: values.description,
      logoMediaId: validation.logoMediaId,
      sortOrder: validation.sortOrder,
      status: values.status,
      publishedAt: validation.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(friendLinks.id, friendLinkId))
    .returning({ id: friendLinks.id });

  return {
    success: true,
    friendLinkId: updated.id,
  };
}

export async function moveAdminFriendLinkToTrash(
  friendLinkId: number,
): Promise<FriendLinkMutationResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      values: getInitialValues({}),
      errors: { form: "当前会话无效，请重新登录。" },
    };
  }

  const [row] = await db
    .update(friendLinks)
    .set({
      status: "trash",
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(friendLinks.id, friendLinkId))
    .returning({ id: friendLinks.id });

  if (!row) {
    return {
      success: false,
      values: getInitialValues({}),
      errors: { form: "友链不存在。" },
    };
  }

  return {
    success: true,
    friendLinkId: row.id,
  };
}

export async function restoreAdminFriendLinkFromTrash(
  friendLinkId: number,
): Promise<FriendLinkMutationResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      values: getInitialValues({}),
      errors: { form: "当前会话无效，请重新登录。" },
    };
  }

  const [row] = await db
    .update(friendLinks)
    .set({
      status: "draft",
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(friendLinks.id, friendLinkId))
    .returning({ id: friendLinks.id });

  if (!row) {
    return {
      success: false,
      values: getInitialValues({}),
      errors: { form: "友链不存在。" },
    };
  }

  return {
    success: true,
    friendLinkId: row.id,
  };
}

export async function listPublishedFriendLinks(): Promise<PublishedFriendLinkData[]> {
  const rows = await db
    .select({
      id: friendLinks.id,
      siteName: friendLinks.siteName,
      url: friendLinks.url,
      description: friendLinks.description,
      sortOrder: friendLinks.sortOrder,
      updatedAt: friendLinks.updatedAt,
      logoSource: media.source,
      logoStoragePath: media.storagePath,
      logoThumbnailPath: media.thumbnailPath,
      logoExternalUrl: media.externalUrl,
      logoAltText: media.altText,
      logoWidth: media.width,
      logoHeight: media.height,
    })
    .from(friendLinks)
    .leftJoin(media, eq(media.id, friendLinks.logoMediaId))
    .where(eq(friendLinks.status, "published"))
    .orderBy(asc(friendLinks.sortOrder), asc(friendLinks.siteName), desc(friendLinks.id));

  return rows.map((row) => ({
    id: row.id,
    siteName: row.siteName,
    url: row.url,
    description: row.description,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
    logo: row.logoSource
      ? {
          source: row.logoSource,
          storagePath: row.logoStoragePath,
          thumbnailPath: row.logoThumbnailPath,
          externalUrl: row.logoExternalUrl,
          altText: row.logoAltText,
          width: row.logoWidth,
          height: row.logoHeight,
        }
      : null,
  }));
}

export async function getFriendLinksSitemapEntry() {
  const [row] = await db
    .select({ updatedAt: friendLinks.updatedAt })
    .from(friendLinks)
    .where(eq(friendLinks.status, "published"))
    .orderBy(desc(friendLinks.updatedAt), desc(friendLinks.id))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    loc: "/friend-links",
    lastModifiedAt: row.updatedAt,
  };
}

import "server-only";

import { desc, eq } from "drizzle-orm";

import {
  createExternalImageFormState,
  createLocalImageUploadState,
  type ExternalImageFormErrors,
  type ExternalImageFormValues,
  type LocalImageUploadErrors,
  type LocalImageUploadValues,
} from "@/lib/admin/media-form";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { media, postMeta, posts, users } from "@/lib/db/schema";
import {
  buildLocalMediaUrl,
  processLocalImageUpload,
  probeImageMetadata,
  removeStoredMediaFiles,
} from "@/lib/media";

const LOCAL_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"]);

type SuccessfulAdminMediaMutation = {
  success: true;
  mediaId: number;
};

export type UploadedImageFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type UploadAdminLocalImageInput = {
  file: UploadedImageFile | null;
  altText?: string;
  caption?: string;
};

export type CreateAdminExternalImageInput = {
  externalUrl: string;
  altText?: string;
  caption?: string;
  width?: string;
  height?: string;
};

export type UploadAdminLocalImageResult =
  | SuccessfulAdminMediaMutation
  | {
      success: false;
      values: LocalImageUploadValues;
      errors: LocalImageUploadErrors;
    };

export type CreateAdminExternalImageResult =
  | SuccessfulAdminMediaMutation
  | {
      success: false;
      values: ExternalImageFormValues;
      errors: ExternalImageFormErrors;
    };

export type DeleteAdminMediaResult =
  | {
      success: true;
      mediaId: number;
      affectedSlugs: string[];
    }
  | {
      success: false;
      error: string;
    };

export type AdminMediaListItem = {
  id: number;
  source: "local" | "external";
  previewUrl: string | null;
  assetUrl: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  uploaderDisplayName: string | null;
  createdAt: Date;
};

export type AdminMediaOption = {
  id: number;
  label: string;
  source: "local" | "external";
  previewUrl: string | null;
  assetUrl: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
};

type MediaPreviewRow = {
  id: number;
  source: "local" | "external";
  originalFilename: string | null;
  storagePath: string | null;
  thumbnailPath: string | null;
  externalUrl: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
};

async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session.isAuthenticated || !session.userId) {
    return null;
  }

  return {
    userId: session.userId,
  };
}

function normalizeOptionalText(value: string | undefined) {
  return value?.trim() ?? "";
}

function truncateVarchar(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength);
}

function buildPreviewUrl(row: {
  source: "local" | "external";
  storagePath: string | null;
  thumbnailPath: string | null;
  externalUrl: string | null;
}) {
  if (row.source === "external") {
    return row.externalUrl;
  }

  return buildLocalMediaUrl(row.thumbnailPath ?? row.storagePath);
}

function buildAssetUrl(row: {
  source: "local" | "external";
  storagePath: string | null;
  thumbnailPath: string | null;
  externalUrl: string | null;
}) {
  if (row.source === "external") {
    return row.externalUrl;
  }

  return buildLocalMediaUrl(row.storagePath ?? row.thumbnailPath);
}

function truncateDisplayText(value: string, maxLength = 60) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildAdminMediaLabel(row: MediaPreviewRow) {
  const baseLabel =
    row.altText?.trim() ||
    row.originalFilename?.trim() ||
    row.externalUrl?.trim() ||
    `媒体 #${row.id}`;
  const dimensions =
    row.width || row.height ? ` · ${row.width ?? "—"}×${row.height ?? "—"}` : "";
  const sourceLabel = row.source === "local" ? "本地" : "外链";

  return `${sourceLabel} · ${truncateDisplayText(baseLabel)}${dimensions}`;
}

function parseOptionalDimension(
  value: string,
  field: "width" | "height",
  errors: ExternalImageFormErrors,
) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (!/^\d+$/.test(normalized)) {
    errors[field] = field === "width" ? "宽度必须为正整数。" : "高度必须为正整数。";
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);

  if (parsed <= 0) {
    errors[field] = field === "width" ? "宽度必须为正整数。" : "高度必须为正整数。";
    return null;
  }

  return parsed;
}

function hasRecognizedImageExtension(url: URL) {
  const pathname = url.pathname.toLowerCase();
  const lastDotIndex = pathname.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return true;
  }

  return IMAGE_EXTENSIONS.has(pathname.slice(lastDotIndex));
}

function collectAffectedSlugs(slugs: Array<string | null | undefined>) {
  return Array.from(new Set(slugs.map((value) => value?.trim() ?? "").filter(Boolean)));
}

export async function listAdminMedia(): Promise<AdminMediaListItem[]> {
  const rows = await db
    .select({
      id: media.id,
      source: media.source,
      originalFilename: media.originalFilename,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      width: media.width,
      height: media.height,
      storagePath: media.storagePath,
      thumbnailPath: media.thumbnailPath,
      externalUrl: media.externalUrl,
      altText: media.altText,
      caption: media.caption,
      uploaderDisplayName: users.displayName,
      uploaderUsername: users.username,
      createdAt: media.createdAt,
    })
    .from(media)
    .leftJoin(users, eq(media.uploaderId, users.id))
    .orderBy(desc(media.createdAt), desc(media.id));

  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    previewUrl: buildPreviewUrl(row),
    assetUrl: buildAssetUrl(row),
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    altText: row.altText,
    caption: row.caption,
    uploaderDisplayName: row.uploaderDisplayName ?? row.uploaderUsername,
    createdAt: row.createdAt,
  }));
}

export async function listAdminMediaOptions(): Promise<AdminMediaOption[]> {
  const rows = await db
    .select({
      id: media.id,
      source: media.source,
      originalFilename: media.originalFilename,
      storagePath: media.storagePath,
      thumbnailPath: media.thumbnailPath,
      externalUrl: media.externalUrl,
      altText: media.altText,
      width: media.width,
      height: media.height,
      createdAt: media.createdAt,
    })
    .from(media)
    .orderBy(desc(media.createdAt), desc(media.id));

  return rows.map((row) => ({
    id: row.id,
    label: buildAdminMediaLabel(row),
    source: row.source,
    previewUrl: buildPreviewUrl(row),
    assetUrl: buildAssetUrl(row),
    altText: row.altText,
    width: row.width,
    height: row.height,
  }));
}

export async function uploadAdminLocalImage(
  input: UploadAdminLocalImageInput,
): Promise<UploadAdminLocalImageResult> {
  const session = await requireAdminSession();
  const values = createLocalImageUploadState({
    altText: normalizeOptionalText(input.altText),
    caption: normalizeOptionalText(input.caption),
    fileName: input.file?.name?.trim() ?? "",
  }).values;

  if (!session) {
    return {
      success: false,
      values,
      errors: {
        form: "当前会话无效，请重新登录。",
      },
    };
  }

  const errors: LocalImageUploadErrors = {};

  if (!input.file || input.file.size === 0) {
    errors.image = "请选择要上传的图片。";
  }

  if (input.file && input.file.size > LOCAL_UPLOAD_MAX_BYTES) {
    errors.image = "图片大小不能超过 10 MB。";
  }

  if (input.file?.type && !input.file.type.startsWith("image/")) {
    errors.image = "仅支持上传图片文件。";
  }

  if (values.altText.length > 255) {
    errors.altText = "Alt 文本不能超过 255 个字符。";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      values,
      errors,
    };
  }

  let buffer: Buffer;

  try {
    buffer = Buffer.from(await input.file!.arrayBuffer());
    await probeImageMetadata(buffer);
  } catch {
    return {
      success: false,
      values,
      errors: {
        image: "图片格式不受支持，无法生成 WebP。",
      },
    };
  }

  try {
    const processed = await processLocalImageUpload({
      buffer,
      fileName: input.file?.name?.trim() || "image",
    });
    const [insertedMedia] = await db
      .insert(media)
      .values({
        uploaderId: session.userId,
        source: "local",
        originalFilename: truncateVarchar(processed.originalFilename, 255),
        mimeType: processed.mimeType,
        sizeBytes: processed.sizeBytes,
        width: processed.width,
        height: processed.height,
        storagePath: processed.storagePath,
        thumbnailPath: processed.thumbnailPath,
        altText: values.altText || null,
        caption: values.caption || null,
      })
      .returning({ id: media.id });

    return {
      success: true,
      mediaId: insertedMedia.id,
    };
  } catch {
    return {
      success: false,
      values,
      errors: {
        form: "保存图片失败，请稍后重试。",
      },
    };
  }
}

export async function createAdminExternalImage(
  input: CreateAdminExternalImageInput,
): Promise<CreateAdminExternalImageResult> {
  const session = await requireAdminSession();
  const values = createExternalImageFormState({
    externalUrl: normalizeOptionalText(input.externalUrl),
    altText: normalizeOptionalText(input.altText),
    caption: normalizeOptionalText(input.caption),
    width: input.width?.trim() ?? "",
    height: input.height?.trim() ?? "",
  }).values;

  if (!session) {
    return {
      success: false,
      values,
      errors: {
        form: "当前会话无效，请重新登录。",
      },
    };
  }

  const errors: ExternalImageFormErrors = {};

  if (!values.externalUrl) {
    errors.externalUrl = "图片地址不能为空。";
  }

  if (values.altText.length > 255) {
    errors.altText = "Alt 文本不能超过 255 个字符。";
  }

  const parsedWidth = parseOptionalDimension(values.width, "width", errors);
  const parsedHeight = parseOptionalDimension(values.height, "height", errors);

  if (values.externalUrl) {
    try {
      const url = new URL(values.externalUrl);

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        errors.externalUrl = "图片地址必须使用 http 或 https。";
      } else if (!hasRecognizedImageExtension(url)) {
        errors.externalUrl = "图片地址应指向常见图片格式资源。";
      }
    } catch {
      errors.externalUrl = "图片地址格式无效。";
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      values,
      errors,
    };
  }

  try {
    const [insertedMedia] = await db
      .insert(media)
      .values({
        uploaderId: session.userId,
        source: "external",
        externalUrl: values.externalUrl,
        altText: values.altText || null,
        caption: values.caption || null,
        width: parsedWidth,
        height: parsedHeight,
      })
      .returning({ id: media.id });

    return {
      success: true,
      mediaId: insertedMedia.id,
    };
  } catch {
    return {
      success: false,
      values,
      errors: {
        form: "保存外链图片失败，请稍后重试。",
      },
    };
  }
}

export async function deleteAdminMedia(mediaId: number): Promise<DeleteAdminMediaResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      error: "当前会话无效，请重新登录。",
    };
  }

  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    return {
      success: false,
      error: "媒体不存在。",
    };
  }

  const [existingMedia, affectedPostRows] = await Promise.all([
    db
      .select({
        id: media.id,
        source: media.source,
        storagePath: media.storagePath,
        thumbnailPath: media.thumbnailPath,
      })
      .from(media)
      .where(eq(media.id, mediaId))
      .limit(1),
    db
      .select({
        slug: posts.slug,
      })
      .from(postMeta)
      .innerJoin(posts, eq(postMeta.postId, posts.id))
      .where(eq(postMeta.ogImageMediaId, mediaId)),
  ]);

  const mediaRow = existingMedia[0];

  if (!mediaRow) {
    return {
      success: false,
      error: "媒体不存在。",
    };
  }

  try {
    await db.delete(media).where(eq(media.id, mediaId));
    await removeStoredMediaFiles([mediaRow.storagePath, mediaRow.thumbnailPath]);

    return {
      success: true,
      mediaId,
      affectedSlugs: collectAffectedSlugs(affectedPostRows.map((row) => row.slug)),
    };
  } catch {
    return {
      success: false,
      error: "删除媒体失败，请稍后重试。",
    };
  }
}

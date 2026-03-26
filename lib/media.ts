import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { dirname, parse, posix, resolve } from "node:path";

import sharp from "sharp";

const LOCAL_IMAGE_QUALITY = 82;
const THUMBNAIL_MAX_WIDTH = 480;
const THUMBNAIL_MAX_HEIGHT = 480;

export type ProbedImageMetadata = {
  width: number | null;
  height: number | null;
};

export type ProcessLocalImageUploadInput = {
  buffer: Buffer;
  fileName: string;
  now?: Date;
};

export type ProcessedLocalImageUpload = {
  originalFilename: string;
  mimeType: "image/webp";
  sizeBytes: number;
  width: number | null;
  height: number | null;
  storagePath: string;
  thumbnailPath: string;
};

function buildUploadDirectory(now = new Date()) {
  return {
    year: String(now.getUTCFullYear()),
    month: String(now.getUTCMonth() + 1).padStart(2, "0"),
  };
}

function normalizeFileBasename(fileName: string) {
  return (
    parse(fileName)
      .name.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "image"
  );
}

function buildPublicAbsolutePath(relativePath: string) {
  return resolve(process.cwd(), "public", relativePath.replace(/^\/+/, ""));
}

export function buildLocalMediaUrl(relativePath: string | null) {
  if (!relativePath) {
    return null;
  }

  return `/${relativePath.replace(/^\/+/, "")}`;
}

export async function removeStoredMediaFiles(relativePaths: Array<string | null | undefined>) {
  await Promise.allSettled(
    relativePaths
      .filter((value): value is string => Boolean(value))
      .map((value) => rm(buildPublicAbsolutePath(value), { force: true })),
  );
}

export async function probeImageMetadata(buffer: Buffer): Promise<ProbedImageMetadata> {
  const metadata = await sharp(buffer, { failOn: "error" }).metadata();

  return {
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  };
}

export async function processLocalImageUpload(
  input: ProcessLocalImageUploadInput,
): Promise<ProcessedLocalImageUpload> {
  const { year, month } = buildUploadDirectory(input.now);
  const fileStem = `${normalizeFileBasename(input.fileName)}-${randomUUID().slice(0, 8)}`;
  const storagePath = posix.join("uploads", "images", year, month, `${fileStem}.webp`);
  const thumbnailPath = posix.join(
    "uploads",
    "images",
    year,
    month,
    `${fileStem}-thumb.webp`,
  );
  const absoluteStoragePath = buildPublicAbsolutePath(storagePath);
  const absoluteThumbnailPath = buildPublicAbsolutePath(thumbnailPath);

  await mkdir(dirname(absoluteStoragePath), { recursive: true });

  try {
    const image = sharp(input.buffer, { failOn: "error" }).rotate();
    const storageResult = await image
      .clone()
      .webp({ quality: LOCAL_IMAGE_QUALITY })
      .toFile(absoluteStoragePath);

    await image
      .clone()
      .resize({
        width: THUMBNAIL_MAX_WIDTH,
        height: THUMBNAIL_MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: LOCAL_IMAGE_QUALITY })
      .toFile(absoluteThumbnailPath);

    return {
      originalFilename: input.fileName,
      mimeType: "image/webp",
      sizeBytes: storageResult.size,
      width: storageResult.width ?? null,
      height: storageResult.height ?? null,
      storagePath,
      thumbnailPath,
    };
  } catch (error) {
    await removeStoredMediaFiles([storagePath, thumbnailPath]);
    throw error;
  }
}

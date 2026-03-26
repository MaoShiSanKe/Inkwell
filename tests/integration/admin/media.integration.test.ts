import { File } from "node:buffer";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { media, postMeta, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
const TEST_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5np8sAAAAASUVORK5CYII=";

const { getAdminSessionMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

describe("admin media library", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    getAdminSessionMock.mockReset();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("uploads a local image, writes webp assets, and exposes it in picker options", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(seed);
    const altText = `${INTEGRATION_PREFIX}local-image-${seed}`;

    const { uploadAdminLocalImage, listAdminMediaOptions } = await import("@/lib/admin/media");
    const result = await uploadAdminLocalImage({
      file: createTestImageFile(seed),
      altText,
      caption: "Local upload caption",
    });

    expect(result).toMatchObject({
      success: true,
    });

    if (!result.success) {
      throw new Error("Expected local upload to succeed.");
    }

    const persistedMedia = await getMedia(result.mediaId);

    expect(persistedMedia).toMatchObject({
      uploaderId: editor.id,
      source: "local",
      mimeType: "image/webp",
      altText,
      caption: "Local upload caption",
    });
    expect(persistedMedia?.storagePath).toMatch(/^uploads\/images\/\d{4}\/\d{2}\/.+\.webp$/);
    expect(persistedMedia?.thumbnailPath).toMatch(/-thumb\.webp$/);

    if (!persistedMedia?.storagePath || !persistedMedia.thumbnailPath) {
      throw new Error("Expected persisted local media paths.");
    }

    expect(existsSync(resolve(process.cwd(), "public", persistedMedia.storagePath))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "public", persistedMedia.thumbnailPath))).toBe(true);

    const options = await listAdminMediaOptions();

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: result.mediaId,
          label: expect.stringContaining(altText),
          previewUrl: expect.stringContaining("-thumb.webp"),
        }),
      ]),
    );
  });

  it("creates external media rows with validated dimensions", async () => {
    const seed = createSeed();
    await signInAsEditor(seed);
    const altText = `${INTEGRATION_PREFIX}external-image-${seed}`;
    const externalUrl = `https://cdn.example.com/${seed}/hero.png`;

    const { createAdminExternalImage } = await import("@/lib/admin/media");
    const result = await createAdminExternalImage({
      externalUrl,
      altText,
      caption: "External media caption",
      width: "1200",
      height: "630",
    });

    expect(result).toMatchObject({
      success: true,
    });

    if (!result.success) {
      throw new Error("Expected external media creation to succeed.");
    }

    const persistedMedia = await getMedia(result.mediaId);

    expect(persistedMedia).toMatchObject({
      source: "external",
      externalUrl,
      altText,
      caption: "External media caption",
      width: 1200,
      height: 630,
    });
  });

  it("persists og_image_media_id on create and public resolution returns the joined og image", async () => {
    const seed = createSeed();
    await signInAsEditor(seed);
    const slug = buildSlug(`og-image-post-${seed}`);
    const altText = `${INTEGRATION_PREFIX}og-image-${seed}`;
    const externalUrl = `https://cdn.example.com/${seed}/og-card.png`;

    const { createAdminExternalImage } = await import("@/lib/admin/media");
    const externalMediaResult = await createAdminExternalImage({
      externalUrl,
      altText,
      width: "1200",
      height: "630",
    });

    if (!externalMediaResult.success) {
      throw new Error("Expected external media creation to succeed.");
    }

    const { createAdminPost } = await import("@/lib/admin/posts");
    const createResult = await createAdminPost({
      title: "Media OG image post",
      slug,
      categoryId: "",
      excerpt: "",
      content: "<p>Media OG integration content</p>",
      status: "published",
      tagIds: [],
      seriesIds: [],
      metaTitle: "",
      metaDescription: "",
      ogTitle: "",
      ogDescription: "",
      ogImageMediaId: String(externalMediaResult.mediaId),
      canonicalUrl: "",
      breadcrumbEnabled: false,
      noindex: false,
      nofollow: false,
    });

    expect(createResult).toMatchObject({
      success: true,
    });

    if (!createResult.success) {
      throw new Error("Expected admin post creation to succeed.");
    }

    const persistedPostMeta = await getPostMeta(createResult.postId);

    expect(persistedPostMeta?.ogImageMediaId).toBe(externalMediaResult.mediaId);

    const { resolvePublishedPostBySlug } = await import("@/lib/blog/posts");
    const resolved = await resolvePublishedPostBySlug(slug);

    expect(resolved.kind).toBe("post");

    if (resolved.kind !== "post") {
      throw new Error("Expected a published post result.");
    }

    expect(resolved.post.ogImage).toMatchObject({
      source: "external",
      externalUrl,
      altText,
      width: 1200,
      height: 630,
    });
  });
});

function createSeed() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildSlug(value: string) {
  return `${INTEGRATION_PREFIX}${value}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function createTestImageFile(seed: string) {
  return new File(
    [Buffer.from(TEST_IMAGE_BASE64, "base64")],
    `${INTEGRATION_PREFIX}${seed}.png`,
    { type: "image/png" },
  );
}

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

async function signInAsEditor(seed: string) {
  const editor = await createUser(seed);

  getAdminSessionMock.mockResolvedValue({
    isAuthenticated: true,
    userId: editor.id,
    role: "editor",
  });

  return editor;
}

async function createUser(seed: string) {
  const db = await getDb();
  const normalizedSeed = `${INTEGRATION_PREFIX}${seed}`;
  const [user] = await db
    .insert(users)
    .values({
      email: `${normalizedSeed}@example.com`,
      username: normalizedSeed,
      displayName: `Media Editor ${seed}`,
      passwordHash: "hashed-password",
      role: "editor",
    })
    .returning({
      id: users.id,
      username: users.username,
    });

  return user;
}

async function getMedia(mediaId: number) {
  const db = await getDb();
  const [row] = await db
    .select({
      id: media.id,
      uploaderId: media.uploaderId,
      source: media.source,
      mimeType: media.mimeType,
      storagePath: media.storagePath,
      thumbnailPath: media.thumbnailPath,
      externalUrl: media.externalUrl,
      altText: media.altText,
      caption: media.caption,
      width: media.width,
      height: media.height,
    })
    .from(media)
    .where(eq(media.id, mediaId))
    .limit(1);

  return row ?? null;
}

async function getPostMeta(postId: number) {
  const db = await getDb();
  const [row] = await db
    .select({
      ogImageMediaId: postMeta.ogImageMediaId,
    })
    .from(postMeta)
    .where(eq(postMeta.postId, postId))
    .limit(1);

  return row ?? null;
}

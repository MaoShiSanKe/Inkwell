import { File } from "node:buffer";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { media, settings, users } from "@/lib/db/schema";

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

describe("backup export integration", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    getAdminSessionMock.mockReset();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("exports db tables, uploads, and a redacted manifest", async () => {
    const seed = createSeed();
    await signInAsEditor(seed);

    const { uploadAdminLocalImage } = await import("@/lib/admin/media");
    const imageResult = await uploadAdminLocalImage({
      file: createTestImageFile(seed),
      altText: `${INTEGRATION_PREFIX}backup-image-${seed}`,
      caption: "Backup image",
    });

    if (!imageResult.success) {
      throw new Error("Expected media upload to succeed.");
    }

    await seedSecretSetting();

    const outputDir = await mkdtemp(resolve(tmpdir(), "inkwell-backup-export-"));

    try {
      const { exportBackup } = await import("@/lib/backup/export");
      const result = await exportBackup({
        outputDir,
        includeSecrets: false,
      });

      const manifest = JSON.parse(await readFile(result.manifestPath, "utf8")) as {
        secretPolicy: string;
        redactedSettingsKeys: string[];
        tables: Array<{ key: string; fileName: string; rowCount: number }>;
        media: { root: string; fileCount: number; missingReferencedFiles: string[] };
      };
      const settingsRows = JSON.parse(
        await readFile(resolve(outputDir, "db", "settings.json"), "utf8"),
      ) as Array<{ key: string; value: string | null; redacted: boolean }>;

      expect(manifest.secretPolicy).toBe("redacted");
      expect(manifest.redactedSettingsKeys).toContain("smtp_password");
      expect(manifest.tables.some((entry) => entry.key === "users" && entry.rowCount >= 1)).toBe(true);
      expect(manifest.media.missingReferencedFiles).toEqual([]);
      expect(manifest.media.fileCount).toBeGreaterThan(0);
      expect(existsSync(resolve(outputDir, manifest.media.root))).toBe(true);

      const smtpPasswordRow = settingsRows.find((row) => row.key === "smtp_password");
      expect(smtpPasswordRow).toMatchObject({
        value: null,
        redacted: true,
      });

      const mediaRows = await getMediaRows();
      for (const row of mediaRows) {
        if (row.source !== "local") {
          continue;
        }

        if (row.storagePath) {
          expect(existsSync(resolve(outputDir, "media", row.storagePath))).toBe(true);
        }

        if (row.thumbnailPath) {
          expect(existsSync(resolve(outputDir, "media", row.thumbnailPath))).toBe(true);
        }
      }
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("fails when a referenced local upload file is missing", async () => {
    const seed = createSeed();
    await signInAsEditor(seed);

    const { uploadAdminLocalImage } = await import("@/lib/admin/media");
    const imageResult = await uploadAdminLocalImage({
      file: createTestImageFile(seed),
      altText: `${INTEGRATION_PREFIX}missing-image-${seed}`,
    });

    if (!imageResult.success) {
      throw new Error("Expected media upload to succeed.");
    }

    const db = await getDb();
    const [persisted] = await db
      .select({ storagePath: media.storagePath })
      .from(media)
      .where(eq(media.id, imageResult.mediaId))
      .limit(1);

    if (!persisted?.storagePath) {
      throw new Error("Expected persisted storagePath.");
    }

    await rm(resolve(process.cwd(), "public", persisted.storagePath), { force: true });

    const outputDir = await mkdtemp(resolve(tmpdir(), "inkwell-backup-missing-"));

    try {
      const { exportBackup } = await import("@/lib/backup/export");
      await expect(
        exportBackup({
          outputDir,
          includeSecrets: false,
        }),
      ).rejects.toThrow(/Missing referenced local media files/);
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });
});

function createSeed() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
  const db = await getDb();
  const normalizedSeed = `${INTEGRATION_PREFIX}${seed}`;
  const [user] = await db
    .insert(users)
    .values({
      email: `${normalizedSeed}@example.com`,
      username: normalizedSeed,
      displayName: `Backup Editor ${seed}`,
      passwordHash: "hashed-password",
      role: "editor",
    })
    .returning({ id: users.id });

  getAdminSessionMock.mockResolvedValue({
    isAuthenticated: true,
    userId: user.id,
    role: "editor",
  });

  return user;
}

async function seedSecretSetting() {
  const db = await getDb();
  await db
    .insert(settings)
    .values({
      key: "smtp_password",
      value: "integration-secret-value",
      isSecret: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: "integration-secret-value",
        isSecret: true,
        updatedAt: new Date(),
      },
    });
}

async function getMediaRows() {
  const db = await getDb();
  return db
    .select({
      source: media.source,
      storagePath: media.storagePath,
      thumbnailPath: media.thumbnailPath,
    })
    .from(media);
}

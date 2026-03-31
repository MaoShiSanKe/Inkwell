import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { settings, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-backup-import-";

const { reindexMainMock } = vi.hoisted(() => ({
  reindexMainMock: vi.fn(),
}));

vi.mock("@/scripts/reindex-search-posts", () => ({
  main: reindexMainMock,
}));

describe("backup import integration", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    reindexMainMock.mockReset();
    reindexMainMock.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("refuses to import into a non-empty target without --force", async () => {
    const exportDir = await mkdtemp(resolve(tmpdir(), "inkwell-backup-export-"));

    try {
      const db = await getDb();
      await db
        .insert(settings)
        .values({
          key: "smtp_password",
          value: "persisted-secret",
          isSecret: true,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: "persisted-secret",
            isSecret: true,
            updatedAt: new Date(),
          },
        });

      const { main: exportMain } = await import("@/scripts/export-backup");
      await exportMain(["--output", exportDir]);

      await db
        .update(settings)
        .set({
          value: "changed-after-export",
          updatedAt: new Date(),
        })
        .where(eq(settings.key, "smtp_password"));

      const { importBackup } = await import("@/lib/backup/import");
      await expect(
        importBackup({
          inputDir: exportDir,
          force: false,
        }),
      ).rejects.toThrow(/Import target is not empty/);
    } finally {
      await rm(exportDir, { recursive: true, force: true });
    }
  });

  it("imports a snapshot with force and preserves redacted secrets", async () => {
    const exportDir = await mkdtemp(resolve(tmpdir(), "inkwell-backup-roundtrip-"));

    try {
      const db = await getDb();
      const seed = createSeed();
      await db
        .insert(settings)
        .values([
          {
            key: "smtp_password",
            value: "persisted-secret",
            isSecret: true,
            updatedAt: new Date(),
          },
          {
            key: `${INTEGRATION_PREFIX}${seed}-custom-secret`,
            value: "custom-persisted-secret",
            isSecret: true,
            updatedAt: new Date(),
          },
        ])
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: "persisted-secret",
            isSecret: true,
            updatedAt: new Date(),
          },
        });

      const [userBeforeExport] = await db
        .insert(users)
        .values({
          email: `${INTEGRATION_PREFIX}${seed}@example.com`,
          username: `${INTEGRATION_PREFIX}${seed}`,
          displayName: "Backup Import Identity",
          passwordHash: "hashed-password",
          role: "editor",
        })
        .returning({ id: users.id, email: users.email });

      const { main: exportMain } = await import("@/scripts/export-backup");
      await exportMain(["--output", exportDir]);

      const settingsPath = resolve(exportDir, "db", "settings.json");
      const originalSettings = JSON.parse(await readFile(settingsPath, "utf8")) as Array<{
        key: string;
        value: string | null;
        isSecret: boolean;
        redacted?: boolean;
      }>;
      const smtpPasswordRow = originalSettings.find((row) => row.key === "smtp_password");
      const customSecretRow = originalSettings.find((row) => row.key === `${INTEGRATION_PREFIX}${seed}-custom-secret`);
      expect(smtpPasswordRow?.value).toBeNull();
      expect(smtpPasswordRow?.redacted).toBe(true);
      expect(customSecretRow?.value).toBeNull();
      expect(customSecretRow?.redacted).toBe(true);

      await db
        .update(settings)
        .set({
          value: "replacement-secret",
          updatedAt: new Date(),
        })
        .where(eq(settings.key, "smtp_password"));
      await db
        .update(settings)
        .set({
          value: "custom-replacement-secret",
          updatedAt: new Date(),
        })
        .where(eq(settings.key, `${INTEGRATION_PREFIX}${seed}-custom-secret`));

      const { importBackup } = await import("@/lib/backup/import");
      const result = await importBackup({
        inputDir: exportDir,
        force: true,
        reindexSearch: true,
      });

      const [restoredSecret] = await db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, "smtp_password"))
        .limit(1);
      const [restoredCustomSecret] = await db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, `${INTEGRATION_PREFIX}${seed}-custom-secret`))
        .limit(1);
      const [restoredUser] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, userBeforeExport.email))
        .limit(1);

      expect(result.importedTableCount).toBeGreaterThan(0);
      expect(result.preservedSecretKeys).toEqual(
        expect.arrayContaining(["smtp_password", `${INTEGRATION_PREFIX}${seed}-custom-secret`]),
      );
      expect(result.reindexedSearch).toBe(true);
      expect(restoredSecret?.value).toBe("replacement-secret");
      expect(restoredCustomSecret?.value).toBe("custom-replacement-secret");
      expect(restoredUser).toEqual(userBeforeExport);
      expect(reindexMainMock).toHaveBeenCalledTimes(1);
    } finally {
      await rm(exportDir, { recursive: true, force: true });
    }
  });
});

function createSeed() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

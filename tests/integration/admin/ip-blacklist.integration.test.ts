import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ipBlacklist, users } from "@/lib/db/schema";
import { isIpBlacklisted } from "@/lib/ip-blacklist";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
const { getAdminSessionMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

describe("admin ip blacklist write paths", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    getAdminSessionMock.mockReset();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("creates and lists blacklist entries with normalized networks", async () => {
    const seed = createSeed();
    const editor = await createEditor(seed);
    getAdminSessionMock.mockResolvedValue({
      isAuthenticated: true,
      userId: editor.id,
      role: "editor",
    });

    const { createAdminIpBlacklistEntry, listAdminIpBlacklist } = await import(
      "@/lib/admin/ip-blacklist"
    );
    const result = await createAdminIpBlacklistEntry({
      network: "203.0.113.10",
      reason: `${INTEGRATION_PREFIX}manual-${seed}`,
    });

    expect(result).toMatchObject({ success: true });

    const entries = await listAdminIpBlacklist();
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          network: "203.0.113.10/32",
          reason: `${INTEGRATION_PREFIX}manual-${seed}`,
          createdByDisplayName: `IP Editor ${seed}`,
        }),
      ]),
    );
  });

  it("matches active networks and ignores expired blacklist entries", async () => {
    const seed = createSeed();
    const editor = await createEditor(seed);
    const db = await getDb();
    const now = Date.now();

    await db.insert(ipBlacklist).values([
      {
        network: "203.0.113.0/24",
        reason: `${INTEGRATION_PREFIX}active-${seed}`,
        createdBy: editor.id,
      },
      {
        network: "198.51.100.0/24",
        reason: `${INTEGRATION_PREFIX}expired-${seed}`,
        createdBy: editor.id,
        createdAt: new Date(now - 1000 * 60 * 60 * 24),
        updatedAt: new Date(now - 1000 * 60 * 60 * 24),
        expiresAt: new Date(now - 1000 * 60 * 60),
      },
    ]);

    await expect(isIpBlacklisted("203.0.113.42")).resolves.toBe(true);
    await expect(isIpBlacklisted("198.51.100.42")).resolves.toBe(false);
    await expect(isIpBlacklisted("192.0.2.42")).resolves.toBe(false);
  });

  it("deletes blacklist entries", async () => {
    const seed = createSeed();
    const editor = await createEditor(seed);
    const db = await getDb();
    const [entry] = await db
      .insert(ipBlacklist)
      .values({
        network: "192.0.2.10/32",
        reason: `${INTEGRATION_PREFIX}delete-${seed}`,
        createdBy: editor.id,
      })
      .returning({ id: ipBlacklist.id });

    getAdminSessionMock.mockResolvedValue({
      isAuthenticated: true,
      userId: editor.id,
      role: "editor",
    });

    const { deleteAdminIpBlacklistEntry } = await import("@/lib/admin/ip-blacklist");
    const result = await deleteAdminIpBlacklistEntry(entry.id);

    expect(result).toEqual({
      success: true,
      entryId: entry.id,
    });

    const [row] = await db
      .select({ id: ipBlacklist.id })
      .from(ipBlacklist)
      .where(eq(ipBlacklist.id, entry.id))
      .limit(1);

    expect(row).toBeUndefined();
  });
});

function createSeed() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

async function createEditor(seed: string) {
  const db = await getDb();
  const normalizedSeed = `${INTEGRATION_PREFIX}${seed}`;
  const [user] = await db
    .insert(users)
    .values({
      email: `${normalizedSeed}@example.com`,
      username: normalizedSeed,
      displayName: `IP Editor ${seed}`,
      passwordHash: "hashed-password",
      role: "editor",
    })
    .returning({ id: users.id });

  return user;
}

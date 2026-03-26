import { eq, inArray } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emailNotifications, settings } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
const SETTINGS_KEYS = [
  "admin_path",
  "revision_limit",
  "revision_ttl_days",
  "excerpt_length",
  "comment_moderation",
] as const;
const EMAIL_SCENARIOS = [
  "comment_pending",
  "comment_approved",
  "comment_reply",
  "post_published",
] as const;

const { getAdminSessionMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

describe("admin settings write paths", () => {
  let originalSettings: Record<(typeof SETTINGS_KEYS)[number], string | null>;
  let originalEmailNotifications: Record<(typeof EMAIL_SCENARIOS)[number], boolean | null>;

  beforeEach(async () => {
    await cleanupIntegrationTables();
    originalSettings = await snapshotSettings();
    originalEmailNotifications = await snapshotEmailNotifications();
    getAdminSessionMock.mockReset();
    getAdminSessionMock.mockResolvedValue({
      isAuthenticated: true,
      userId: 1,
      role: "editor",
    });
  });

  afterEach(async () => {
    await restoreSettings(originalSettings);
    await restoreEmailNotifications(originalEmailNotifications);
    await cleanupIntegrationTables();
  });

  it("loads default form values when no rows exist", async () => {
    const { getAdminSettingsFormValues } = await import("@/lib/admin/settings");
    const values = await getAdminSettingsFormValues();

    expect(values).toEqual({
      admin_path: "admin",
      revision_limit: "20",
      revision_ttl_days: "30",
      excerpt_length: "150",
      comment_moderation: "pending",
    });
  });

  it("loads email notification defaults when no rows exist", async () => {
    const { getAdminEmailNotifications } = await import("@/lib/admin/settings");
    const scenarios = await getAdminEmailNotifications();

    expect(scenarios).toEqual([
      expect.objectContaining({ scenario: "comment_pending", enabled: true }),
      expect.objectContaining({ scenario: "comment_approved", enabled: true }),
      expect.objectContaining({ scenario: "comment_reply", enabled: true }),
      expect.objectContaining({ scenario: "post_published", enabled: false }),
    ]);
  });

  it("persists validated settings updates", async () => {
    const { updateAdminSettings } = await import("@/lib/admin/settings");
    const result = await updateAdminSettings({
      admin_path: `${INTEGRATION_PREFIX}panel`,
      revision_limit: "25",
      revision_ttl_days: "45",
      excerpt_length: "180",
      comment_moderation: "approved",
    });

    expect(result).toEqual({
      success: true,
      previousAdminPath: originalSettings.admin_path ?? "admin",
      nextAdminPath: `${INTEGRATION_PREFIX}panel`,
      adminPathChanged: (originalSettings.admin_path ?? "admin") !== `${INTEGRATION_PREFIX}panel`,
    });

    const rows = await getSettingRows([...SETTINGS_KEYS]);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "admin_path", value: `${INTEGRATION_PREFIX}panel` }),
        expect.objectContaining({ key: "revision_limit", value: "25" }),
        expect.objectContaining({ key: "revision_ttl_days", value: "45" }),
        expect.objectContaining({ key: "excerpt_length", value: "180" }),
        expect.objectContaining({ key: "comment_moderation", value: "approved" }),
      ]),
    );
  });

  it("persists email notification toggles", async () => {
    const { updateAdminEmailNotifications } = await import("@/lib/admin/settings");
    const result = await updateAdminEmailNotifications({
      comment_pending: false,
      comment_approved: true,
      comment_reply: false,
      post_published: true,
    });

    expect(result).toEqual({
      success: true,
      scenarios: [
        expect.objectContaining({ scenario: "comment_pending", enabled: false }),
        expect.objectContaining({ scenario: "comment_approved", enabled: true }),
        expect.objectContaining({ scenario: "comment_reply", enabled: false }),
        expect.objectContaining({ scenario: "post_published", enabled: true }),
      ],
    });

    const rows = await getEmailNotificationRows([...EMAIL_SCENARIOS]);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scenario: "comment_pending", enabled: false }),
        expect.objectContaining({ scenario: "comment_approved", enabled: true }),
        expect.objectContaining({ scenario: "comment_reply", enabled: false }),
        expect.objectContaining({ scenario: "post_published", enabled: true }),
      ]),
    );
  });

  it("returns field errors for invalid settings values", async () => {
    const { updateAdminSettings } = await import("@/lib/admin/settings");
    const result = await updateAdminSettings({
      admin_path: "Invalid Path",
      revision_limit: "0",
      revision_ttl_days: "-1",
      excerpt_length: "NaN",
      comment_moderation: "manual" as never,
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        admin_path: "后台路径不能为空，且只能包含小写字母、数字和短横线。",
        revision_limit: "修订保留数量必须是正整数。",
        revision_ttl_days: "修订保留天数必须是非负整数。",
        excerpt_length: "自动摘要长度必须是正整数。",
        comment_moderation: "评论审核模式无效。",
      },
    });
  });
});

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

async function getSettingRows(keys: string[]) {
  const db = await getDb();
  return db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, keys));
}

async function getEmailNotificationRows(keys: string[]) {
  const db = await getDb();
  return db
    .select({ scenario: emailNotifications.scenario, enabled: emailNotifications.enabled })
    .from(emailNotifications)
    .where(inArray(emailNotifications.scenario, keys));
}

async function snapshotSettings() {
  const rows = await getSettingRows([...SETTINGS_KEYS]);
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return Object.fromEntries(
    SETTINGS_KEYS.map((key) => [key, byKey.get(key) ?? null]),
  ) as Record<(typeof SETTINGS_KEYS)[number], string | null>;
}

async function snapshotEmailNotifications() {
  const rows = await getEmailNotificationRows([...EMAIL_SCENARIOS]);
  const byKey = new Map(rows.map((row) => [row.scenario, row.enabled]));

  return Object.fromEntries(
    EMAIL_SCENARIOS.map((key) => [key, byKey.get(key) ?? null]),
  ) as Record<(typeof EMAIL_SCENARIOS)[number], boolean | null>;
}

async function restoreSettings(values: Record<(typeof SETTINGS_KEYS)[number], string | null>) {
  const db = await getDb();

  for (const key of SETTINGS_KEYS) {
    const value = values[key];

    if (value === null) {
      await db.delete(settings).where(eq(settings.key, key));
      continue;
    }

    await db
      .insert(settings)
      .values({
        key,
        value,
        isSecret: false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value,
          isSecret: false,
          updatedAt: new Date(),
        },
      });
  }
}

async function restoreEmailNotifications(
  values: Record<(typeof EMAIL_SCENARIOS)[number], boolean | null>,
) {
  const db = await getDb();

  for (const scenario of EMAIL_SCENARIOS) {
    const enabled = values[scenario];

    if (enabled === null) {
      await db.delete(emailNotifications).where(eq(emailNotifications.scenario, scenario));
      continue;
    }

    await db
      .insert(emailNotifications)
      .values({
        scenario,
        description: scenario,
        enabled,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: emailNotifications.scenario,
        set: {
          description: scenario,
          enabled,
          updatedAt: new Date(),
        },
      });
  }
}

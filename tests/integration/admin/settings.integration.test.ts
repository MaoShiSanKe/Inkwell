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
  "smtp_host",
  "smtp_port",
  "smtp_secure",
  "smtp_username",
  "smtp_password",
  "smtp_from_email",
  "smtp_from_name",
  "umami_enabled",
  "umami_website_id",
  "umami_script_url",
  "public_head_html",
  "public_footer_html",
  "public_custom_css",
  "public_notice_enabled",
  "public_notice_variant",
  "public_notice_dismissible",
  "public_notice_version",
  "public_notice_start_at",
  "public_notice_end_at",
  "public_notice_title",
  "public_notice_body",
  "public_notice_link_label",
  "public_notice_link_url",
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
      admin_path: originalSettings.admin_path ?? "admin",
      revision_limit: originalSettings.revision_limit ?? "20",
      revision_ttl_days: originalSettings.revision_ttl_days ?? "30",
      excerpt_length: originalSettings.excerpt_length ?? "150",
      comment_moderation:
        (originalSettings.comment_moderation as "pending" | "approved" | null) ?? "pending",
      smtp_host: originalSettings.smtp_host ?? "",
      smtp_port: originalSettings.smtp_port ?? "587",
      smtp_secure: (originalSettings.smtp_secure === "true" ? "true" : "false") as "true" | "false",
      smtp_username: originalSettings.smtp_username ?? "",
      smtp_password: "",
      smtp_from_email: originalSettings.smtp_from_email ?? "",
      smtp_from_name: originalSettings.smtp_from_name ?? "",
      umami_enabled: (originalSettings.umami_enabled === "true" ? "true" : "false") as "true" | "false",
      umami_website_id: originalSettings.umami_website_id ?? "",
      umami_script_url: originalSettings.umami_script_url ?? "",
      public_head_html: originalSettings.public_head_html ?? "",
      public_footer_html: originalSettings.public_footer_html ?? "",
      public_custom_css: originalSettings.public_custom_css ?? "",
      public_notice_enabled: (originalSettings.public_notice_enabled === "true" ? "true" : "false") as "true" | "false",
      public_notice_variant:
        (originalSettings.public_notice_variant as "info" | "warning" | "success" | null) ??
        "info",
      public_notice_dismissible:
        (originalSettings.public_notice_dismissible === "true" ? "true" : "false") as "true" | "false",
      public_notice_version: originalSettings.public_notice_version ?? "",
      public_notice_start_at: formatDatetimeLocalInput(originalSettings.public_notice_start_at),
      public_notice_start_at_iso: originalSettings.public_notice_start_at ?? "",
      public_notice_end_at: formatDatetimeLocalInput(originalSettings.public_notice_end_at),
      public_notice_end_at_iso: originalSettings.public_notice_end_at ?? "",
      public_notice_title: originalSettings.public_notice_title ?? "",
      public_notice_body: originalSettings.public_notice_body ?? "",
      public_notice_link_label: originalSettings.public_notice_link_label ?? "",
      public_notice_link_url: originalSettings.public_notice_link_url ?? "",
    });
  });

  it("persists notice dismissal and time window settings", async () => {
    const { updateAdminSettings } = await import("@/lib/admin/settings");
    const result = await updateAdminSettings({
      admin_path: `${INTEGRATION_PREFIX}panel`,
      revision_limit: "25",
      revision_ttl_days: "45",
      excerpt_length: "180",
      comment_moderation: "approved",
      smtp_host: "smtp.example.com",
      smtp_port: "465",
      smtp_secure: "true",
      smtp_username: "mailer@example.com",
      smtp_password: "super-secret",
      smtp_from_email: "noreply@example.com",
      smtp_from_name: "Inkwell Mailer",
      umami_enabled: "false",
      umami_website_id: "",
      umami_script_url: "",
      public_head_html: "",
      public_footer_html: "",
      public_custom_css: "",
      public_notice_enabled: "true",
      public_notice_variant: "warning",
      public_notice_dismissible: "true",
      public_notice_version: "2026-04-maintenance",
      public_notice_start_at: "2026-04-01T20:00",
      public_notice_start_at_iso: "2026-04-01T12:00:00.000Z",
      public_notice_end_at: "2026-04-02T08:00",
      public_notice_end_at_iso: "2026-04-02T00:00:00.000Z",
      public_notice_title: "系统维护通知",
      public_notice_body: "今晚 23:00-23:30 将进行短暂维护。",
      public_notice_link_label: "查看详情",
      public_notice_link_url: "/docs/deployment",
    });

    expect(result).toEqual({
      success: true,
      previousAdminPath: originalSettings.admin_path ?? "admin",
      nextAdminPath: `${INTEGRATION_PREFIX}panel`,
      adminPathChanged: (originalSettings.admin_path ?? "admin") !== `${INTEGRATION_PREFIX}panel`,
      publicLayoutChanged: true,
    });

    const rows = await getSettingRows([...SETTINGS_KEYS]);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "public_notice_dismissible", value: "true" }),
        expect.objectContaining({ key: "public_notice_version", value: "2026-04-maintenance" }),
        expect.objectContaining({ key: "public_notice_start_at", value: "2026-04-01T12:00:00.000Z" }),
        expect.objectContaining({ key: "public_notice_end_at", value: "2026-04-02T00:00:00.000Z" }),
      ]),
    );
  });

  it("returns no public layout change when notice settings and window stay the same", async () => {
    await setSettingRow("public_notice_enabled", "true");
    await setSettingRow("public_notice_variant", "warning");
    await setSettingRow("public_notice_dismissible", "true");
    await setSettingRow("public_notice_version", "2026-04-maintenance");
    await setSettingRow("public_notice_start_at", "2026-04-01T12:00:00.000Z");
    await setSettingRow("public_notice_end_at", "2026-04-02T00:00:00.000Z");
    await setSettingRow("public_notice_title", "系统维护通知");
    await setSettingRow("public_notice_body", "今晚 23:00-23:30 将进行短暂维护。");
    await setSettingRow("public_notice_link_label", "查看详情");
    await setSettingRow("public_notice_link_url", "/docs/deployment");

    const { updateAdminSettings } = await import("@/lib/admin/settings");
    const result = await updateAdminSettings({
      admin_path: originalSettings.admin_path ?? "admin",
      revision_limit: originalSettings.revision_limit ?? "20",
      revision_ttl_days: originalSettings.revision_ttl_days ?? "30",
      excerpt_length: originalSettings.excerpt_length ?? "150",
      comment_moderation:
        (originalSettings.comment_moderation as "pending" | "approved" | null) ?? "pending",
      smtp_host: originalSettings.smtp_host ?? "",
      smtp_port: originalSettings.smtp_port ?? "587",
      smtp_secure: (originalSettings.smtp_secure === "true" ? "true" : "false") as "true" | "false",
      smtp_username: originalSettings.smtp_username ?? "",
      smtp_password: "",
      smtp_from_email: originalSettings.smtp_from_email ?? "",
      smtp_from_name: originalSettings.smtp_from_name ?? "",
      umami_enabled: (originalSettings.umami_enabled === "true" ? "true" : "false") as "true" | "false",
      umami_website_id: originalSettings.umami_website_id ?? "",
      umami_script_url: originalSettings.umami_script_url ?? "",
      public_head_html: originalSettings.public_head_html ?? "",
      public_footer_html: originalSettings.public_footer_html ?? "",
      public_custom_css: originalSettings.public_custom_css ?? "",
      public_notice_enabled: "true",
      public_notice_variant: "warning",
      public_notice_dismissible: "true",
      public_notice_version: "2026-04-maintenance",
      public_notice_start_at: "2026-04-01T20:00",
      public_notice_start_at_iso: "2026-04-01T12:00:00.000Z",
      public_notice_end_at: "2026-04-02T08:00",
      public_notice_end_at_iso: "2026-04-02T00:00:00.000Z",
      public_notice_title: "系统维护通知",
      public_notice_body: "今晚 23:00-23:30 将进行短暂维护。",
      public_notice_link_label: "查看详情",
      public_notice_link_url: "/docs/deployment",
    });

    expect(result).toMatchObject({ success: true, publicLayoutChanged: false });
  });

  it("requires notice version when dismissal is enabled", async () => {
    const { updateAdminSettings } = await import("@/lib/admin/settings");
    const result = await updateAdminSettings({
      admin_path: originalSettings.admin_path ?? "admin",
      revision_limit: originalSettings.revision_limit ?? "20",
      revision_ttl_days: originalSettings.revision_ttl_days ?? "30",
      excerpt_length: originalSettings.excerpt_length ?? "150",
      comment_moderation:
        (originalSettings.comment_moderation as "pending" | "approved" | null) ?? "pending",
      smtp_host: originalSettings.smtp_host ?? "",
      smtp_port: originalSettings.smtp_port ?? "587",
      smtp_secure: (originalSettings.smtp_secure === "true" ? "true" : "false") as "true" | "false",
      smtp_username: originalSettings.smtp_username ?? "",
      smtp_password: "",
      smtp_from_email: originalSettings.smtp_from_email ?? "",
      smtp_from_name: originalSettings.smtp_from_name ?? "",
      umami_enabled: (originalSettings.umami_enabled === "true" ? "true" : "false") as "true" | "false",
      umami_website_id: originalSettings.umami_website_id ?? "",
      umami_script_url: originalSettings.umami_script_url ?? "",
      public_head_html: "",
      public_footer_html: "",
      public_custom_css: "",
      public_notice_enabled: "true",
      public_notice_variant: "info",
      public_notice_dismissible: "true",
      public_notice_version: "",
      public_notice_start_at: "",
      public_notice_start_at_iso: "",
      public_notice_end_at: "",
      public_notice_end_at_iso: "",
      public_notice_title: "提醒",
      public_notice_body: "内容",
      public_notice_link_label: "",
      public_notice_link_url: "",
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        public_notice_version: "允许访客关闭公告时必须填写公告版本。",
      },
    });
  });

  it("rejects notice window when end time is not after start time", async () => {
    const { updateAdminSettings } = await import("@/lib/admin/settings");
    const result = await updateAdminSettings({
      admin_path: originalSettings.admin_path ?? "admin",
      revision_limit: originalSettings.revision_limit ?? "20",
      revision_ttl_days: originalSettings.revision_ttl_days ?? "30",
      excerpt_length: originalSettings.excerpt_length ?? "150",
      comment_moderation:
        (originalSettings.comment_moderation as "pending" | "approved" | null) ?? "pending",
      smtp_host: originalSettings.smtp_host ?? "",
      smtp_port: originalSettings.smtp_port ?? "587",
      smtp_secure: (originalSettings.smtp_secure === "true" ? "true" : "false") as "true" | "false",
      smtp_username: originalSettings.smtp_username ?? "",
      smtp_password: "",
      smtp_from_email: originalSettings.smtp_from_email ?? "",
      smtp_from_name: originalSettings.smtp_from_name ?? "",
      umami_enabled: (originalSettings.umami_enabled === "true" ? "true" : "false") as "true" | "false",
      umami_website_id: originalSettings.umami_website_id ?? "",
      umami_script_url: originalSettings.umami_script_url ?? "",
      public_head_html: "",
      public_footer_html: "",
      public_custom_css: "",
      public_notice_enabled: "true",
      public_notice_variant: "info",
      public_notice_dismissible: "false",
      public_notice_version: "",
      public_notice_start_at: "2026-04-01T20:00",
      public_notice_start_at_iso: "2026-04-01T12:00:00.000Z",
      public_notice_end_at: "2026-04-01T20:00",
      public_notice_end_at_iso: "2026-04-01T12:00:00.000Z",
      public_notice_title: "提醒",
      public_notice_body: "内容",
      public_notice_link_label: "",
      public_notice_link_url: "",
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        public_notice_end_at: "公告结束时间必须晚于开始时间。",
      },
    });
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
  });
});

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

async function getSettingRows(keys: string[]) {
  const db = await getDb();
  return db
    .select({ key: settings.key, value: settings.value, isSecret: settings.isSecret })
    .from(settings)
    .where(inArray(settings.key, keys));
}

async function setSettingRow(key: string, value: string, isSecret = false) {
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key, value, isSecret, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, isSecret, updatedAt: new Date() },
    });
}

async function snapshotSettings() {
  const rows = await getSettingRows([...SETTINGS_KEYS]);
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return Object.fromEntries(
    SETTINGS_KEYS.map((key) => [key, byKey.get(key) ?? null]),
  ) as Record<(typeof SETTINGS_KEYS)[number], string | null>;
}

async function snapshotEmailNotifications() {
  const db = await getDb();
  const rows = await db
    .select({ scenario: emailNotifications.scenario, enabled: emailNotifications.enabled })
    .from(emailNotifications)
    .where(inArray(emailNotifications.scenario, [...EMAIL_SCENARIOS]));
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
        isSecret: key === "smtp_password",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value,
          isSecret: key === "smtp_password",
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
      .values({ scenario, description: scenario, enabled, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: emailNotifications.scenario,
        set: { description: scenario, enabled, updatedAt: new Date() },
      });
  }
}

function formatDatetimeLocalInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

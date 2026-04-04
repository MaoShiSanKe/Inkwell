import { describe, expect, it } from "vitest";

import { getBackupTableExports, sanitizeSettingsRows } from "@/lib/backup/export";

describe("backup export helpers", () => {
  it("redacts secret settings by default", () => {
    const result = sanitizeSettingsRows(
      [
        {
          key: "smtp_password",
          value: "super-secret",
          isSecret: true,
          updatedAt: "2026-03-30T12:00:00.000Z",
        },
        {
          key: "admin_path",
          value: "admin",
          isSecret: false,
          updatedAt: "2026-03-30T12:00:00.000Z",
        },
      ],
      false,
    );

    expect(result.redactedKeys).toEqual(["smtp_password"]);
    expect(result.rows).toEqual([
      {
        key: "smtp_password",
        value: null,
        isSecret: true,
        updatedAt: "2026-03-30T12:00:00.000Z",
        redacted: true,
      },
      {
        key: "admin_path",
        value: "admin",
        isSecret: false,
        updatedAt: "2026-03-30T12:00:00.000Z",
        redacted: false,
      },
    ]);
  });

  it("keeps secret settings when includeSecrets is true", () => {
    const result = sanitizeSettingsRows(
      [
        {
          key: "smtp_password",
          value: "super-secret",
          isSecret: true,
        },
      ],
      true,
    );

    expect(result.redactedKeys).toEqual([]);
    expect(result.rows).toEqual([
      {
        key: "smtp_password",
        value: "super-secret",
        isSecret: true,
        redacted: false,
      },
    ]);
  });

  it("exports a stable explicit table registry", () => {
    const exports = getBackupTableExports();

    expect(exports.map((entry) => entry.key)).toEqual([
      "users",
      "categories",
      "tags",
      "series",
      "posts",
      "post_revisions",
      "post_slug_aliases",
      "post_tags",
      "post_series",
      "comments",
      "media",
      "post_meta",
      "post_views",
      "post_likes",
      "ip_blacklist",
      "settings",
      "email_notifications",
      "custom_pages",
      "custom_page_meta",
      "friend_links",
      "site_navigation",
      "sitemap_entries",
    ]);

    expect(exports.find((entry) => entry.key === "users")).toMatchObject({
      tableName: "users",
      identityAlwaysColumnNames: ["id"],
      propertyColumnMap: expect.objectContaining({
        displayName: "display_name",
        passwordHash: "password_hash",
        lastLoginAt: "last_login_at",
      }),
    });

    expect(exports.find((entry) => entry.key === "settings")).toMatchObject({
      tableName: "settings",
      identityAlwaysColumnNames: [],
      propertyColumnMap: expect.objectContaining({
        isSecret: "is_secret",
        updatedAt: "updated_at",
      }),
    });
  });
});

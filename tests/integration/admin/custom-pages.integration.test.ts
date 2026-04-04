import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
const { getAdminSessionMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

describe("admin custom pages", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    getAdminSessionMock.mockReset();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("rejects the reserved friend-links slug", async () => {
    const editor = await createEditor();
    getAdminSessionMock.mockResolvedValue({
      isAuthenticated: true,
      userId: editor.id,
      role: "editor",
    });

    const { createAdminPage } = await import("@/lib/admin/pages");

    const result = await createAdminPage({
      title: "Friend Links",
      slug: "friend-links",
      content: "Body",
      status: "published",
      metaTitle: "",
      metaDescription: "",
      ogTitle: "",
      ogDescription: "",
      ogImageMediaId: "",
      canonicalUrl: "",
      noindex: false,
      nofollow: false,
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        slug: "该 slug 与现有系统路由冲突，请更换。",
      },
    });
  });
});

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

async function createEditor() {
  const db = await getDb();
  const [editor] = await db
    .insert(users)
    .values({
      email: `${INTEGRATION_PREFIX}pages-editor@example.com`,
      username: `${INTEGRATION_PREFIX}pages-editor`,
      displayName: "Pages Editor",
      passwordHash: "hashed-password",
      role: "editor",
    })
    .returning({ id: users.id });

  return editor;
}

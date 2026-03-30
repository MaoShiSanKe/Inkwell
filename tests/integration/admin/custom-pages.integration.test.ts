import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { customPages, users } from "@/lib/db/schema";

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

  it("creates, updates, trashes, and restores a custom page", async () => {
    const editor = await createEditor();
    getAdminSessionMock.mockResolvedValue({
      isAuthenticated: true,
      userId: editor.id,
      role: "editor",
    });

    const { createAdminPage, moveAdminPageToTrash, restoreAdminPageFromTrash, updateAdminPage } =
      await import("@/lib/admin/pages");

    const created = await createAdminPage({
      title: "About",
      slug: "about",
      content: "About body",
      status: "published",
      metaTitle: "About title",
      metaDescription: "About description",
      ogTitle: "",
      ogDescription: "",
      ogImageMediaId: "",
      canonicalUrl: "",
      noindex: false,
      nofollow: false,
    });

    expect(created).toMatchObject({
      success: true,
      affectedSlugs: ["about"],
    });

    if (!created.success) {
      throw new Error("Expected page creation to succeed.");
    }

    const updated = await updateAdminPage(created.pageId, {
      title: "About us",
      slug: "about-us",
      content: "Updated body",
      status: "published",
      metaTitle: "About us",
      metaDescription: "Updated description",
      ogTitle: "",
      ogDescription: "",
      ogImageMediaId: "",
      canonicalUrl: "",
      noindex: false,
      nofollow: false,
    });

    expect(updated).toMatchObject({
      success: true,
      affectedSlugs: ["about", "about-us"],
    });

    const trashed = await moveAdminPageToTrash(created.pageId);
    expect(trashed).toMatchObject({
      success: true,
      affectedSlugs: ["about-us"],
    });

    const restored = await restoreAdminPageFromTrash(created.pageId);
    expect(restored).toMatchObject({
      success: true,
      affectedSlugs: ["about-us"],
    });

    const db = await getDb();
    const [page] = await db
      .select({
        slug: customPages.slug,
        title: customPages.title,
        status: customPages.status,
      })
      .from(customPages)
      .where(eq(customPages.id, created.pageId))
      .limit(1);

    expect(page).toMatchObject({
      slug: "about-us",
      title: "About us",
      status: "draft",
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

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { friendLinks, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
const { getAdminSessionMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

describe("admin friend links", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    getAdminSessionMock.mockReset();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("creates, updates, trashes, and restores a friend link", async () => {
    const editor = await createEditor();
    getAdminSessionMock.mockResolvedValue({
      isAuthenticated: true,
      userId: editor.id,
      role: "editor",
    });

    const {
      createAdminFriendLink,
      moveAdminFriendLinkToTrash,
      restoreAdminFriendLinkFromTrash,
      updateAdminFriendLink,
    } = await import("@/lib/admin/friend-links");

    const created = await createAdminFriendLink({
      siteName: `${INTEGRATION_PREFIX}Friend`,
      url: `https://${INTEGRATION_PREFIX}friend.example.com`,
      description: "Initial description",
      logoMediaId: "",
      sortOrder: "10",
      status: "published",
    });

    expect(created).toMatchObject({
      success: true,
    });

    if (!created.success) {
      throw new Error("Expected friend link creation to succeed.");
    }

    const updated = await updateAdminFriendLink(created.friendLinkId, {
      siteName: `${INTEGRATION_PREFIX}Friend Updated`,
      url: `https://${INTEGRATION_PREFIX}updated.example.com`,
      description: "Updated description",
      logoMediaId: "",
      sortOrder: "2",
      status: "published",
    });

    expect(updated).toMatchObject({
      success: true,
      friendLinkId: created.friendLinkId,
    });

    const trashed = await moveAdminFriendLinkToTrash(created.friendLinkId);
    expect(trashed).toMatchObject({
      success: true,
      friendLinkId: created.friendLinkId,
    });

    const restored = await restoreAdminFriendLinkFromTrash(created.friendLinkId);
    expect(restored).toMatchObject({
      success: true,
      friendLinkId: created.friendLinkId,
    });

    const db = await getDb();
    const [friendLink] = await db
      .select({
        siteName: friendLinks.siteName,
        url: friendLinks.url,
        status: friendLinks.status,
        sortOrder: friendLinks.sortOrder,
      })
      .from(friendLinks)
      .where(eq(friendLinks.id, created.friendLinkId))
      .limit(1);

    expect(friendLink).toMatchObject({
      siteName: `${INTEGRATION_PREFIX}Friend Updated`,
      url: `https://${INTEGRATION_PREFIX}updated.example.com`,
      status: "draft",
      sortOrder: 2,
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
      email: `${INTEGRATION_PREFIX}friend-links-editor@example.com`,
      username: `${INTEGRATION_PREFIX}friend-links-editor`,
      displayName: "Friend Links Editor",
      passwordHash: "hashed-password",
      role: "editor",
    })
    .returning({ id: users.id });

  return editor;
}

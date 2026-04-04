import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { siteNavigation, users } from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-site-navigation-";

const { getAdminSessionMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

describe("admin site navigation", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    getAdminSessionMock.mockReset();
  });

  it("creates, lists, updates, deletes, and filters visible public navigation items", async () => {
    const { db } = await import("@/lib/db");
    const [user] = await db
      .insert(users)
      .values({
        email: `${INTEGRATION_PREFIX}editor@example.com`,
        username: `${INTEGRATION_PREFIX}editor`,
        displayName: "Integration Navigation Editor",
        passwordHash: "hashed-password",
        role: "editor",
      })
      .returning({ id: users.id });

    getAdminSessionMock.mockResolvedValue({
      isAuthenticated: true,
      userId: user.id,
      role: "editor",
    });

    const {
      createAdminSiteNavigation,
      deleteAdminSiteNavigation,
      listAdminSiteNavigation,
      listPublicSiteNavigation,
      updateAdminSiteNavigation,
    } = await import("@/lib/admin/site-navigation");

    const first = await createAdminSiteNavigation({
      label: `${INTEGRATION_PREFIX}首页`,
      url: "/",
      sortOrder: "2",
      openInNewTab: "false",
      visible: "true",
    });
    const second = await createAdminSiteNavigation({
      label: `${INTEGRATION_PREFIX}关于`,
      url: "/about",
      sortOrder: "1",
      openInNewTab: "true",
      visible: "true",
    });
    const hidden = await createAdminSiteNavigation({
      label: `${INTEGRATION_PREFIX}隐藏`,
      url: "/hidden",
      sortOrder: "3",
      openInNewTab: "false",
      visible: "false",
    });

    expect(first).toMatchObject({ success: true });
    expect(second).toMatchObject({ success: true });
    expect(hidden).toMatchObject({ success: true });

    const adminItems = await listAdminSiteNavigation();
    expect(adminItems.map((item) => item.label)).toEqual([
      `${INTEGRATION_PREFIX}关于`,
      `${INTEGRATION_PREFIX}首页`,
      `${INTEGRATION_PREFIX}隐藏`,
    ]);

    const publicItems = await listPublicSiteNavigation();
    expect(publicItems.map((item) => item.label)).toEqual([
      `${INTEGRATION_PREFIX}关于`,
      `${INTEGRATION_PREFIX}首页`,
    ]);
    expect(publicItems[0]).toMatchObject({
      url: "/about",
      openInNewTab: true,
    });

    if (!first.success) {
      throw new Error("Expected first item to be created.");
    }

    const updated = await updateAdminSiteNavigation(first.itemId, {
      label: `${INTEGRATION_PREFIX}首页更新`,
      url: "/home",
      sortOrder: "0",
      openInNewTab: "false",
      visible: "true",
    });

    expect(updated).toEqual({ success: true, itemId: first.itemId });

    const [updatedRow] = await db
      .select({ label: siteNavigation.label, url: siteNavigation.url, sortOrder: siteNavigation.sortOrder })
      .from(siteNavigation)
      .where(eq(siteNavigation.id, first.itemId))
      .limit(1);

    expect(updatedRow).toEqual({
      label: `${INTEGRATION_PREFIX}首页更新`,
      url: "/home",
      sortOrder: 0,
    });

    const deleted = await deleteAdminSiteNavigation(first.itemId);
    expect(deleted).toBe(true);

    const publicItemsAfterDelete = await listPublicSiteNavigation();
    expect(publicItemsAfterDelete.map((item) => item.label)).toEqual([
      `${INTEGRATION_PREFIX}关于`,
    ]);
  });
});

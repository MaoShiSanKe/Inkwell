import { and, eq, like } from "drizzle-orm";
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

describe("blog subscribers", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    getAdminSessionMock.mockReset();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("creates a subscriber and reuses the existing record for duplicate subscriptions", async () => {
    const { subscribeToBlog } = await import("@/lib/blog/subscribers");
    const email = `${INTEGRATION_PREFIX}reader-${Date.now()}@example.com`;

    const first = await subscribeToBlog({
      displayName: "Reader",
      email: ` ${email.toUpperCase()} `,
    });
    const second = await subscribeToBlog({
      displayName: "Reader Again",
      email,
    });

    expect(first).toMatchObject({
      success: true,
      status: "created",
      subscriber: {
        email,
        displayName: "Reader",
      },
    });
    expect(second).toMatchObject({
      success: true,
      status: "existing",
      subscriber: {
        email,
      },
    });

    const db = await getDb();
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        username: users.username,
      })
      .from(users)
      .where(eq(users.email, email));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email,
      displayName: "Reader",
      role: "subscriber",
    });
    expect(rows[0].username).toMatch(/^subscriber-/);
  });

  it("builds a valid unsubscribe token and removes the subscriber by token", async () => {
    const { createSubscriberUnsubscribeToken, subscribeToBlog, unsubscribeSubscriberByToken } =
      await import("@/lib/blog/subscribers");
    const email = `${INTEGRATION_PREFIX}token-reader@example.com`;

    const created = await subscribeToBlog({
      displayName: "Token Reader",
      email,
    });

    expect(created.success).toBe(true);
    if (!created.success) {
      throw new Error("Expected subscriber creation to succeed.");
    }

    const token = createSubscriberUnsubscribeToken({
      subscriberId: created.subscriber.id,
      email: created.subscriber.email,
    });

    expect(token).toBeTruthy();

    const result = await unsubscribeSubscriberByToken(token ?? "");

    expect(result).toEqual({
      success: true,
      status: "removed",
      email,
    });

    const db = await getDb();
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    expect(rows).toHaveLength(0);
  });

  it("lists and deletes subscribers from the admin helper", async () => {
    const { deleteAdminSubscriber, listAdminSubscribers } = await import("@/lib/admin/subscribers");
    const { subscribeToBlog } = await import("@/lib/blog/subscribers");
    const firstEmail = `${INTEGRATION_PREFIX}first-reader@example.com`;
    const secondEmail = `${INTEGRATION_PREFIX}second-reader@example.com`;

    const first = await subscribeToBlog({
      displayName: "First Reader",
      email: firstEmail,
    });
    const second = await subscribeToBlog({
      displayName: "Second Reader",
      email: secondEmail,
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (!first.success || !second.success) {
      throw new Error("Expected subscriber creation to succeed.");
    }

    const admin = await createEditor();
    getAdminSessionMock.mockResolvedValue({
      isAuthenticated: true,
      userId: admin.id,
      role: "editor",
    });

    const subscribers = await listAdminSubscribers();
    expect(subscribers.map((subscriber) => subscriber.email)).toEqual(
      expect.arrayContaining([secondEmail, firstEmail]),
    );

    const deleted = await deleteAdminSubscriber(first.subscriber.id);
    expect(deleted).toEqual({
      success: true,
      subscriberId: first.subscriber.id,
    });

    const remaining = await listAdminSubscribers();
    expect(remaining.map((subscriber) => subscriber.email)).toEqual(
      expect.arrayContaining([secondEmail]),
    );
    expect(remaining.map((subscriber) => subscriber.email)).not.toContain(firstEmail);
  });
});

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

async function createEditor() {
  const db = await getDb();
  const existingRows = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.username, `${INTEGRATION_PREFIX}subscriber-admin`));

  if (existingRows.length > 0) {
    await db.delete(users).where(
      and(
        eq(users.role, "editor"),
        like(users.username, `${INTEGRATION_PREFIX}subscriber-admin`),
      ),
    );
  }

  const [admin] = await db
    .insert(users)
    .values({
      email: `${INTEGRATION_PREFIX}subscriber-admin@example.com`,
      username: `${INTEGRATION_PREFIX}subscriber-admin`,
      displayName: "Subscriber Admin",
      passwordHash: "hashed-password",
      role: "editor",
    })
    .returning({ id: users.id });

  return admin;
}

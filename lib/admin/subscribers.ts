import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type AdminSubscriberListItem = {
  id: number;
  email: string;
  displayName: string;
  createdAt: Date;
};

export type DeleteAdminSubscriberResult =
  | {
      success: true;
      subscriberId: number;
    }
  | {
      success: false;
      error: string;
    };

async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session.isAuthenticated || !session.userId) {
    return null;
  }

  return session;
}

export async function listAdminSubscribers(): Promise<AdminSubscriberListItem[]> {
  return db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, "subscriber"))
    .orderBy(desc(users.createdAt), desc(users.id));
}

export async function deleteAdminSubscriber(
  subscriberId: number,
): Promise<DeleteAdminSubscriberResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      error: "当前会话无效，请重新登录。",
    };
  }

  if (!Number.isInteger(subscriberId) || subscriberId <= 0) {
    return {
      success: false,
      error: "订阅者不存在。",
    };
  }

  const rows = await db
    .delete(users)
    .where(and(eq(users.id, subscriberId), eq(users.role, "subscriber")))
    .returning({
      id: users.id,
    });

  if (rows.length === 0) {
    return {
      success: false,
      error: "订阅者不存在。",
    };
  }

  return {
    success: true,
    subscriberId,
  };
}

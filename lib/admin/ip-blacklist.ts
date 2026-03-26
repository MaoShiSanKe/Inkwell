import "server-only";

import { desc, eq } from "drizzle-orm";

import {
  type IpBlacklistFormErrors,
  type IpBlacklistFormValues,
} from "@/lib/admin/ip-blacklist-form";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ipBlacklist, users } from "@/lib/db/schema";
import { normalizeBlacklistNetworkInput } from "@/lib/ip-blacklist";

type SuccessfulIpBlacklistMutation = {
  success: true;
  entryId: number;
};

export type CreateAdminIpBlacklistInput = {
  network: string;
  reason?: string;
};

export type CreateAdminIpBlacklistResult =
  | SuccessfulIpBlacklistMutation
  | {
      success: false;
      values: IpBlacklistFormValues;
      errors: IpBlacklistFormErrors;
    };

export type DeleteAdminIpBlacklistResult =
  | SuccessfulIpBlacklistMutation
  | {
      success: false;
      error: string;
    };

export type AdminIpBlacklistListItem = {
  id: number;
  network: string;
  reason: string | null;
  createdByDisplayName: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};

function normalizeOptionalText(value: string | undefined) {
  return value?.trim() ?? "";
}

function getInitialValues(input: CreateAdminIpBlacklistInput): IpBlacklistFormValues {
  return {
    network: input.network.trim(),
    reason: normalizeOptionalText(input.reason),
  };
}

function getUniqueConstraintName(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const databaseError = error as { constraint?: string; constraint_name?: string };
  return databaseError.constraint_name ?? databaseError.constraint ?? null;
}

async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session.isAuthenticated || !session.userId) {
    return null;
  }

  return session;
}

export async function listAdminIpBlacklist(): Promise<AdminIpBlacklistListItem[]> {
  const rows = await db
    .select({
      id: ipBlacklist.id,
      network: ipBlacklist.network,
      reason: ipBlacklist.reason,
      createdByDisplayName: users.displayName,
      createdByUsername: users.username,
      expiresAt: ipBlacklist.expiresAt,
      createdAt: ipBlacklist.createdAt,
    })
    .from(ipBlacklist)
    .leftJoin(users, eq(ipBlacklist.createdBy, users.id))
    .orderBy(desc(ipBlacklist.createdAt), desc(ipBlacklist.id));

  return rows.map((row) => ({
    id: row.id,
    network: row.network,
    reason: row.reason,
    createdByDisplayName: row.createdByDisplayName ?? row.createdByUsername,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  }));
}

export async function createAdminIpBlacklistEntry(
  input: CreateAdminIpBlacklistInput,
): Promise<CreateAdminIpBlacklistResult> {
  const session = await requireAdminSession();
  const values = getInitialValues(input);

  if (!session) {
    return {
      success: false,
      values,
      errors: {
        form: "当前会话无效，请重新登录。",
      },
    };
  }

  const errors: IpBlacklistFormErrors = {};
  let normalizedNetwork = "";

  try {
    normalizedNetwork = normalizeBlacklistNetworkInput(values.network);
  } catch {
    errors.network = "请输入有效的 IP 或 CIDR。";
  }

  if (values.reason.length > 255) {
    errors.reason = "原因长度不能超过 255 个字符。";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      values,
      errors,
    };
  }

  try {
    const [row] = await db
      .insert(ipBlacklist)
      .values({
        network: normalizedNetwork,
        reason: values.reason || null,
        createdBy: session.userId,
      })
      .returning({ id: ipBlacklist.id });

    return {
      success: true,
      entryId: row.id,
    };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const constraintName = getUniqueConstraintName(error);

      if (constraintName === "ip_blacklist_network_unique") {
        return {
          success: false,
          values,
          errors: {
            network: "该 IP / CIDR 已在黑名单中。",
          },
        };
      }
    }

    return {
      success: false,
      values,
      errors: {
        form: "保存黑名单失败，请稍后重试。",
      },
    };
  }
}

export async function deleteAdminIpBlacklistEntry(
  entryId: number,
): Promise<DeleteAdminIpBlacklistResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      error: "当前会话无效，请重新登录。",
    };
  }

  if (!Number.isInteger(entryId) || entryId <= 0) {
    return {
      success: false,
      error: "黑名单记录不存在。",
    };
  }

  const rows = await db
    .delete(ipBlacklist)
    .where(eq(ipBlacklist.id, entryId))
    .returning({ id: ipBlacklist.id });

  if (rows.length === 0) {
    return {
      success: false,
      error: "黑名单记录不存在。",
    };
  }

  return {
    success: true,
    entryId,
  };
}

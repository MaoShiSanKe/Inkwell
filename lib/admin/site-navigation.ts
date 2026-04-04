import "server-only";

import { asc, eq } from "drizzle-orm";

import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { siteNavigation } from "@/lib/db/schema";

import type {
  SiteNavigationFormErrors,
  SiteNavigationFormValues,
} from "./site-navigation-form";

export type AdminSiteNavigationListItem = {
  id: number;
  label: string;
  url: string;
  sortOrder: number;
  openInNewTab: boolean;
  visible: boolean;
  updatedAt: Date;
};

export type SiteNavigationMutationResult =
  | {
      success: true;
      itemId: number;
    }
  | {
      success: false;
      values: SiteNavigationFormValues;
      errors: SiteNavigationFormErrors;
    };

export type AdminSiteNavigationEditorData = {
  id: number;
  values: SiteNavigationFormValues;
};

export type PublicSiteNavigationItem = {
  id: number;
  label: string;
  url: string;
  openInNewTab: boolean;
};

function normalizeOptionalText(value: string) {
  return value.trim();
}

function getInitialValues(input: Partial<SiteNavigationFormValues>): SiteNavigationFormValues {
  return {
    label: normalizeOptionalText(input.label ?? ""),
    url: normalizeOptionalText(input.url ?? ""),
    sortOrder: normalizeOptionalText(input.sortOrder ?? "0") || "0",
    openInNewTab: input.openInNewTab?.trim() === "true" ? "true" : "false",
    visible: input.visible?.trim() === "false" ? "false" : "true",
  };
}

async function requireAdminSession(): Promise<{ isAuthenticated: true; userId: number } | null> {
  const session = await getAdminSession();

  if (!session.isAuthenticated || !session.userId) {
    return null;
  }

  return {
    isAuthenticated: true,
    userId: session.userId,
  };
}

function validateNavigationUrl(value: string) {
  if (value.startsWith("/")) {
    return !value.startsWith("//");
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateSiteNavigationInput(values: SiteNavigationFormValues):
  | {
      success: true;
      normalizedUrl: string;
      sortOrder: number;
      openInNewTab: boolean;
      visible: boolean;
    }
  | { success: false; errors: SiteNavigationFormErrors } {
  const errors: SiteNavigationFormErrors = {};

  if (!values.label) {
    errors.label = "导航文案不能为空。";
  } else if (values.label.length > 80) {
    errors.label = "导航文案长度不能超过 80 个字符。";
  }

  if (!values.url) {
    errors.url = "导航链接不能为空。";
  } else if (!validateNavigationUrl(values.url)) {
    errors.url = "导航链接必须是站内路径或有效的 http/https 地址。";
  }

  const parsedSortOrder = Number.parseInt(values.sortOrder, 10);

  if (!/^-?\d+$/.test(values.sortOrder)) {
    errors.sortOrder = "排序必须为整数。";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    normalizedUrl: values.url,
    sortOrder: parsedSortOrder,
    openInNewTab: values.openInNewTab === "true",
    visible: values.visible === "true",
  };
}

export async function listAdminSiteNavigation(): Promise<AdminSiteNavigationListItem[]> {
  const rows = await db
    .select({
      id: siteNavigation.id,
      label: siteNavigation.label,
      url: siteNavigation.url,
      sortOrder: siteNavigation.sortOrder,
      openInNewTab: siteNavigation.openInNewTab,
      visible: siteNavigation.visible,
      updatedAt: siteNavigation.updatedAt,
    })
    .from(siteNavigation)
    .orderBy(asc(siteNavigation.sortOrder), asc(siteNavigation.label), asc(siteNavigation.id));

  return rows.map((row) => ({
    ...row,
    openInNewTab: row.openInNewTab,
    visible: row.visible,
  }));
}

export async function getAdminSiteNavigationEditorData(
  itemId: number,
): Promise<AdminSiteNavigationEditorData | null> {
  const [row] = await db
    .select({
      id: siteNavigation.id,
      label: siteNavigation.label,
      url: siteNavigation.url,
      sortOrder: siteNavigation.sortOrder,
      openInNewTab: siteNavigation.openInNewTab,
      visible: siteNavigation.visible,
    })
    .from(siteNavigation)
    .where(eq(siteNavigation.id, itemId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    values: getInitialValues({
      label: row.label,
      url: row.url,
      sortOrder: String(row.sortOrder),
      openInNewTab: row.openInNewTab ? "true" : "false",
      visible: row.visible ? "true" : "false",
    }),
  };
}

export async function createAdminSiteNavigation(
  input: Partial<SiteNavigationFormValues>,
): Promise<SiteNavigationMutationResult> {
  const session = await requireAdminSession();
  const values = getInitialValues(input);

  if (!session) {
    return {
      success: false,
      values,
      errors: { form: "当前会话无效，请重新登录。" },
    };
  }

  const validation = validateSiteNavigationInput(values);

  if (!validation.success) {
    return {
      success: false,
      values,
      errors: validation.errors,
    };
  }

  const [created] = await db
    .insert(siteNavigation)
    .values({
      authorId: session.userId,
      label: values.label,
      url: validation.normalizedUrl,
      sortOrder: validation.sortOrder,
      openInNewTab: validation.openInNewTab,
      visible: validation.visible,
      updatedAt: new Date(),
    })
    .returning({ id: siteNavigation.id });

  return {
    success: true,
    itemId: created.id,
  };
}

export async function updateAdminSiteNavigation(
  itemId: number,
  input: Partial<SiteNavigationFormValues>,
): Promise<SiteNavigationMutationResult> {
  const session = await requireAdminSession();
  const values = getInitialValues(input);

  if (!session) {
    return {
      success: false,
      values,
      errors: { form: "当前会话无效，请重新登录。" },
    };
  }

  const [current] = await db
    .select({ id: siteNavigation.id })
    .from(siteNavigation)
    .where(eq(siteNavigation.id, itemId))
    .limit(1);

  if (!current) {
    return {
      success: false,
      values,
      errors: { form: "导航项不存在。" },
    };
  }

  const validation = validateSiteNavigationInput(values);

  if (!validation.success) {
    return {
      success: false,
      values,
      errors: validation.errors,
    };
  }

  const [updated] = await db
    .update(siteNavigation)
    .set({
      label: values.label,
      url: validation.normalizedUrl,
      sortOrder: validation.sortOrder,
      openInNewTab: validation.openInNewTab,
      visible: validation.visible,
      updatedAt: new Date(),
    })
    .where(eq(siteNavigation.id, itemId))
    .returning({ id: siteNavigation.id });

  return {
    success: true,
    itemId: updated.id,
  };
}

export async function deleteAdminSiteNavigation(itemId: number): Promise<boolean> {
  const session = await requireAdminSession();

  if (!session) {
    return false;
  }

  const [deleted] = await db
    .delete(siteNavigation)
    .where(eq(siteNavigation.id, itemId))
    .returning({ id: siteNavigation.id });

  return Boolean(deleted);
}

export async function listPublicSiteNavigation(): Promise<PublicSiteNavigationItem[]> {
  const rows = await db
    .select({
      id: siteNavigation.id,
      label: siteNavigation.label,
      url: siteNavigation.url,
      openInNewTab: siteNavigation.openInNewTab,
    })
    .from(siteNavigation)
    .where(eq(siteNavigation.visible, true))
    .orderBy(asc(siteNavigation.sortOrder), asc(siteNavigation.label), asc(siteNavigation.id));

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    url: row.url,
    openInNewTab: row.openInNewTab,
  }));
}

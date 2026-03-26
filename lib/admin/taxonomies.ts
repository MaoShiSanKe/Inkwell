import "server-only";

import { eq, sql } from "drizzle-orm";

import { getAdminSession, type AdminRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  categories,
  postSeries,
  posts,
  postTags,
  series,
  tags,
} from "@/lib/db/schema";

import {
  createTaxonomyFormState,
  type TaxonomyFormErrors,
  type TaxonomyFormValues,
} from "./taxonomy-form";

export type AdminTaxonomyKind = "category" | "tag" | "series";

export type AdminTaxonomyListItem = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  usageCount: number;
  parentId: number | null;
  parentName: string | null;
  childCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminTaxonomyOption = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
};

export type AdminTaxonomyEditorData = {
  id: number;
  slug: string;
  kind: AdminTaxonomyKind;
  usageCount: number;
  childCount: number;
  values: TaxonomyFormValues;
};

export type AdminTaxonomyInput = {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
};

type SuccessfulAdminTaxonomyMutation = {
  success: true;
  taxonomyId: number;
  slug: string;
};

export type CreateAdminTaxonomyResult =
  | SuccessfulAdminTaxonomyMutation
  | {
      success: false;
      values: TaxonomyFormValues;
      errors: TaxonomyFormErrors;
    };

export type UpdateAdminTaxonomyResult = CreateAdminTaxonomyResult;

export type DeleteAdminTaxonomyResult =
  | SuccessfulAdminTaxonomyMutation
  | {
      success: false;
      error: string;
    };

type DatabaseConstraintError = {
  code?: string;
  constraint?: string;
  constraint_name?: string;
};

type AdminSessionWithRole = {
  isAuthenticated: true;
  userId: number;
  role: AdminRole;
};

type ValidatedTaxonomyInput = {
  success: true;
  parsedParentId: number | null;
};

type InvalidTaxonomyInput = {
  success: false;
  errors: TaxonomyFormErrors;
};

type CategoryDepthRow = {
  id: number;
  parentId: number | null;
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeOptionalText(value: string | undefined) {
  return value?.trim() ?? "";
}

function getInitialValues(kind: AdminTaxonomyKind, input: AdminTaxonomyInput): TaxonomyFormValues {
  return {
    name: input.name.trim(),
    slug: normalizeSlug(input.slug ?? ""),
    description: normalizeOptionalText(input.description),
    parentId: kind === "category" ? input.parentId?.trim() ?? "" : "",
  };
}

function getUniqueConstraintName(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const databaseError = error as DatabaseConstraintError;

  return databaseError.constraint_name ?? databaseError.constraint ?? null;
}

function getTaxonomyMutationErrors(
  kind: AdminTaxonomyKind,
  error: unknown,
  fallbackMessage: string,
): TaxonomyFormErrors {
  const databaseError = error as DatabaseConstraintError;
  const constraintName = getUniqueConstraintName(error);

  if (databaseError?.code === "23505") {
    if (constraintName === "categories_slug_unique") {
      return {
        slug: "该 slug 已存在，请更换。",
      };
    }

    if (constraintName === "tags_name_unique" || constraintName === "series_name_unique") {
      return {
        name: "该名称已存在，请更换。",
      };
    }

    if (constraintName === "tags_slug_unique" || constraintName === "series_slug_unique") {
      return {
        slug: "该 slug 已存在，请更换。",
      };
    }
  }

  if (kind === "category" && databaseError?.code === "23514") {
    if (constraintName === "categories_not_self_parent") {
      return {
        parentId: "父分类不能是当前分类本身。",
      };
    }
  }

  return {
    form: fallbackMessage,
  };
}

async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session.isAuthenticated || !session.userId || !session.role) {
    return null;
  }

  return session as AdminSessionWithRole;
}

async function getCategoryRowsForValidation() {
  return db
    .select({
      id: categories.id,
      parentId: categories.parentId,
    })
    .from(categories);
}

function computeCategoryDepth(rows: CategoryDepthRow[], categoryId: number) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  let depth = 0;
  let current = byId.get(categoryId) ?? null;
  const visited = new Set<number>();

  while (current?.parentId) {
    if (visited.has(current.id)) {
      return Number.POSITIVE_INFINITY;
    }

    visited.add(current.id);
    depth += 1;
    current = byId.get(current.parentId) ?? null;

    if (!current) {
      break;
    }
  }

  return depth;
}

async function validateCategoryParent(
  parentId: number,
  currentCategoryId?: number,
): Promise<ValidatedTaxonomyInput | InvalidTaxonomyInput> {
  const rows = await getCategoryRowsForValidation();
  const byId = new Map(rows.map((row) => [row.id, row]));
  const parent = byId.get(parentId);

  if (!parent) {
    return {
      success: false,
      errors: {
        parentId: "所选父分类不存在。",
      },
    };
  }

  if (currentCategoryId && parentId === currentCategoryId) {
    return {
      success: false,
      errors: {
        parentId: "父分类不能是当前分类本身。",
      },
    };
  }

  let currentAncestor = parent;
  const visited = new Set<number>(currentCategoryId ? [currentCategoryId] : []);

  while (currentAncestor.parentId) {
    if (visited.has(currentAncestor.id)) {
      return {
        success: false,
        errors: {
          parentId: "不能把分类移动到自己的后代分类下。",
        },
      };
    }

    visited.add(currentAncestor.id);
    const nextAncestor = byId.get(currentAncestor.parentId);

    if (!nextAncestor) {
      return {
        success: false,
        errors: {
          parentId: "所选父分类不存在。",
        },
      };
    }

    currentAncestor = nextAncestor;
  }

  const parentDepth = computeCategoryDepth(rows, parentId);

  if (parentDepth >= 1) {
    return {
      success: false,
      errors: {
        parentId: "父分类必须是顶级分类，不能创建三级分类。",
      },
    };
  }

  return {
    success: true,
    parsedParentId: parentId,
  };
}

async function validateTaxonomyInput(
  kind: AdminTaxonomyKind,
  values: TaxonomyFormValues,
  currentTaxonomyId?: number,
): Promise<ValidatedTaxonomyInput | InvalidTaxonomyInput> {
  const errors: TaxonomyFormErrors = {};

  if (!values.name || values.name.length > 120) {
    errors.name = "名称不能为空，且长度不能超过 120 个字符。";
  }

  if (!values.slug || values.slug.length > 160) {
    errors.slug = "Slug 不能为空，且长度不能超过 160 个字符。";
  }

  if (!/^[a-z0-9-]+$/.test(values.slug)) {
    errors.slug = "Slug 只能包含小写字母、数字和短横线。";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
    };
  }

  if (kind !== "category" || !values.parentId) {
    return {
      success: true,
      parsedParentId: null,
    };
  }

  const parsedParentId = Number.parseInt(values.parentId, 10);

  if (!Number.isInteger(parsedParentId) || parsedParentId <= 0) {
    return {
      success: false,
      errors: {
        parentId: "父分类无效。",
      },
    };
  }

  return validateCategoryParent(parsedParentId, currentTaxonomyId);
}

async function getCategoryUsageMap() {
  const rows = await db
    .select({
      categoryId: posts.categoryId,
      usageCount: sql<number>`count(*)`,
    })
    .from(posts)
    .where(sql`${posts.categoryId} is not null`)
    .groupBy(posts.categoryId);

  return new Map(
    rows
      .filter((row): row is { categoryId: number; usageCount: number } => row.categoryId !== null)
      .map((row) => [row.categoryId, Number(row.usageCount)]),
  );
}

async function getTagUsageMap() {
  const rows = await db
    .select({
      tagId: postTags.tagId,
      usageCount: sql<number>`count(*)`,
    })
    .from(postTags)
    .groupBy(postTags.tagId);

  return new Map(rows.map((row) => [row.tagId, Number(row.usageCount)]));
}

async function getSeriesUsageMap() {
  const rows = await db
    .select({
      seriesId: postSeries.seriesId,
      usageCount: sql<number>`count(*)`,
    })
    .from(postSeries)
    .groupBy(postSeries.seriesId);

  return new Map(rows.map((row) => [row.seriesId, Number(row.usageCount)]));
}

async function getCategoryChildCountMap() {
  const rows = await db
    .select({
      parentId: categories.parentId,
      childCount: sql<number>`count(*)`,
    })
    .from(categories)
    .where(sql`${categories.parentId} is not null`)
    .groupBy(categories.parentId);

  return new Map(
    rows
      .filter((row): row is { parentId: number; childCount: number } => row.parentId !== null)
      .map((row) => [row.parentId, Number(row.childCount)]),
  );
}

async function getCategoryParentMap() {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
    })
    .from(categories);

  return new Map(rows.map((row) => [row.id, row.name]));
}

export async function listAdminTaxonomies(
  kind: AdminTaxonomyKind,
): Promise<AdminTaxonomyListItem[]> {
  if (kind === "category") {
    const [items, usageMap, childCountMap, parentNameMap] = await Promise.all([
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          parentId: categories.parentId,
          createdAt: categories.createdAt,
          updatedAt: categories.updatedAt,
        })
        .from(categories)
        .orderBy(categories.name),
      getCategoryUsageMap(),
      getCategoryChildCountMap(),
      getCategoryParentMap(),
    ]);

    return items.map((item) => ({
      ...item,
      usageCount: usageMap.get(item.id) ?? 0,
      parentName: item.parentId ? parentNameMap.get(item.parentId) ?? null : null,
      childCount: childCountMap.get(item.id) ?? 0,
    }));
  }

  if (kind === "tag") {
    const [items, usageMap] = await Promise.all([
      db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          description: tags.description,
          createdAt: tags.createdAt,
          updatedAt: tags.updatedAt,
        })
        .from(tags)
        .orderBy(tags.name),
      getTagUsageMap(),
    ]);

    return items.map((item) => ({
      ...item,
      usageCount: usageMap.get(item.id) ?? 0,
      parentId: null,
      parentName: null,
      childCount: 0,
    }));
  }

  const [items, usageMap] = await Promise.all([
    db
      .select({
        id: series.id,
        name: series.name,
        slug: series.slug,
        description: series.description,
        createdAt: series.createdAt,
        updatedAt: series.updatedAt,
      })
      .from(series)
      .orderBy(series.name),
    getSeriesUsageMap(),
  ]);

  return items.map((item) => ({
    ...item,
    usageCount: usageMap.get(item.id) ?? 0,
    parentId: null,
    parentName: null,
    childCount: 0,
  }));
}

export async function listCategoryParentOptions(
  currentCategoryId?: number,
): Promise<AdminTaxonomyOption[]> {
  const options = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      parentId: categories.parentId,
    })
    .from(categories)
    .orderBy(categories.name);

  return options.filter(
    (option) => option.id !== currentCategoryId && option.parentId === null,
  );
}

export async function getAdminTaxonomyEditorData(
  kind: AdminTaxonomyKind,
  taxonomyId: number,
): Promise<AdminTaxonomyEditorData | null> {
  if (kind === "category") {
    const [items, usageMap, childCountMap] = await Promise.all([
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          parentId: categories.parentId,
        })
        .from(categories)
        .where(eq(categories.id, taxonomyId))
        .limit(1),
      getCategoryUsageMap(),
      getCategoryChildCountMap(),
    ]);

    const item = items[0];

    if (!item) {
      return null;
    }

    return {
      id: item.id,
      slug: item.slug,
      kind,
      usageCount: usageMap.get(item.id) ?? 0,
      childCount: childCountMap.get(item.id) ?? 0,
      values: createTaxonomyFormState({
        name: item.name,
        slug: item.slug,
        description: item.description ?? "",
        parentId: item.parentId ? String(item.parentId) : "",
      }).values,
    };
  }

  if (kind === "tag") {
    const [items, usageMap] = await Promise.all([
      db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          description: tags.description,
        })
        .from(tags)
        .where(eq(tags.id, taxonomyId))
        .limit(1),
      getTagUsageMap(),
    ]);

    const item = items[0];

    if (!item) {
      return null;
    }

    return {
      id: item.id,
      slug: item.slug,
      kind,
      usageCount: usageMap.get(item.id) ?? 0,
      childCount: 0,
      values: createTaxonomyFormState({
        name: item.name,
        slug: item.slug,
        description: item.description ?? "",
      }).values,
    };
  }

  const [items, usageMap] = await Promise.all([
    db
      .select({
        id: series.id,
        name: series.name,
        slug: series.slug,
        description: series.description,
      })
      .from(series)
      .where(eq(series.id, taxonomyId))
      .limit(1),
    getSeriesUsageMap(),
  ]);

  const item = items[0];

  if (!item) {
    return null;
  }

  return {
    id: item.id,
    slug: item.slug,
    kind,
    usageCount: usageMap.get(item.id) ?? 0,
    childCount: 0,
    values: createTaxonomyFormState({
      name: item.name,
      slug: item.slug,
      description: item.description ?? "",
    }).values,
  };
}

export async function createAdminTaxonomy(
  kind: AdminTaxonomyKind,
  input: AdminTaxonomyInput,
): Promise<CreateAdminTaxonomyResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      values: getInitialValues(kind, input),
      errors: {
        form: "当前会话无效，请重新登录。",
      },
    };
  }

  const values = getInitialValues(kind, input);
  const validation = await validateTaxonomyInput(kind, values);

  if (!validation.success) {
    return {
      success: false,
      values,
      errors: validation.errors,
    };
  }

  try {
    if (kind === "category") {
      const [category] = await db
        .insert(categories)
        .values({
          name: values.name,
          slug: values.slug,
          description: values.description || null,
          parentId: validation.parsedParentId,
          updatedAt: new Date(),
        })
        .returning({ id: categories.id });

      return {
        success: true,
        taxonomyId: category.id,
        slug: values.slug,
      };
    }

    if (kind === "tag") {
      const [tag] = await db
        .insert(tags)
        .values({
          name: values.name,
          slug: values.slug,
          description: values.description || null,
          updatedAt: new Date(),
        })
        .returning({ id: tags.id });

      return {
        success: true,
        taxonomyId: tag.id,
        slug: values.slug,
      };
    }

    const [seriesRow] = await db
      .insert(series)
      .values({
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        updatedAt: new Date(),
      })
      .returning({ id: series.id });

    return {
      success: true,
      taxonomyId: seriesRow.id,
      slug: values.slug,
    };
  } catch (error) {
    return {
      success: false,
      values,
      errors: getTaxonomyMutationErrors(kind, error, "创建分类项失败，请重试。"),
    };
  }
}

export async function updateAdminTaxonomy(
  kind: AdminTaxonomyKind,
  taxonomyId: number,
  input: AdminTaxonomyInput,
): Promise<UpdateAdminTaxonomyResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      values: getInitialValues(kind, input),
      errors: {
        form: "当前会话无效，请重新登录。",
      },
    };
  }

  if (!Number.isInteger(taxonomyId) || taxonomyId <= 0) {
    return {
      success: false,
      values: getInitialValues(kind, input),
      errors: {
        form: "内容不存在。",
      },
    };
  }

  const existing = await getAdminTaxonomyEditorData(kind, taxonomyId);

  if (!existing) {
    return {
      success: false,
      values: getInitialValues(kind, input),
      errors: {
        form: "内容不存在。",
      },
    };
  }

  const values = createTaxonomyFormState({
    ...getInitialValues(kind, input),
    slug: existing.slug,
  }).values;
  const validation = await validateTaxonomyInput(kind, values, taxonomyId);

  if (!validation.success) {
    return {
      success: false,
      values,
      errors: validation.errors,
    };
  }

  try {
    if (kind === "category") {
      await db
        .update(categories)
        .set({
          name: values.name,
          description: values.description || null,
          parentId: validation.parsedParentId,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, taxonomyId));
    } else if (kind === "tag") {
      await db
        .update(tags)
        .set({
          name: values.name,
          description: values.description || null,
          updatedAt: new Date(),
        })
        .where(eq(tags.id, taxonomyId));
    } else {
      await db
        .update(series)
        .set({
          name: values.name,
          description: values.description || null,
          updatedAt: new Date(),
        })
        .where(eq(series.id, taxonomyId));
    }

    return {
      success: true,
      taxonomyId,
      slug: existing.slug,
    };
  } catch (error) {
    return {
      success: false,
      values,
      errors: getTaxonomyMutationErrors(kind, error, "更新分类项失败，请重试。"),
    };
  }
}

async function getCategoryDeletionGuards(taxonomyId: number) {
  const [[usage], [children]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.categoryId, taxonomyId))
      .limit(1),
    db
      .select({ count: sql<number>`count(*)` })
      .from(categories)
      .where(eq(categories.parentId, taxonomyId))
      .limit(1),
  ]);

  return {
    usageCount: Number(usage?.count ?? 0),
    childCount: Number(children?.count ?? 0),
  };
}

async function getTagDeletionUsageCount(taxonomyId: number) {
  const [usage] = await db
    .select({ count: sql<number>`count(*)` })
    .from(postTags)
    .where(eq(postTags.tagId, taxonomyId))
    .limit(1);

  return Number(usage?.count ?? 0);
}

async function getSeriesDeletionUsageCount(taxonomyId: number) {
  const [usage] = await db
    .select({ count: sql<number>`count(*)` })
    .from(postSeries)
    .where(eq(postSeries.seriesId, taxonomyId))
    .limit(1);

  return Number(usage?.count ?? 0);
}

export async function deleteAdminTaxonomy(
  kind: AdminTaxonomyKind,
  taxonomyId: number,
): Promise<DeleteAdminTaxonomyResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      error: "当前会话无效，请重新登录。",
    };
  }

  if (!Number.isInteger(taxonomyId) || taxonomyId <= 0) {
    return {
      success: false,
      error: "内容不存在。",
    };
  }

  if (kind === "category") {
    const [existingCategory] = await db
      .select({ id: categories.id, slug: categories.slug })
      .from(categories)
      .where(eq(categories.id, taxonomyId))
      .limit(1);

    if (!existingCategory) {
      return {
        success: false,
        error: "分类不存在。",
      };
    }

    const guards = await getCategoryDeletionGuards(taxonomyId);

    if (guards.usageCount > 0) {
      return {
        success: false,
        error: "该分类仍被文章使用，无法删除。",
      };
    }

    if (guards.childCount > 0) {
      return {
        success: false,
        error: "该分类仍包含子分类，无法删除。",
      };
    }

    await db.delete(categories).where(eq(categories.id, taxonomyId));

    return {
      success: true,
      taxonomyId,
      slug: existingCategory.slug,
    };
  }

  if (kind === "tag") {
    const [existingTag] = await db
      .select({ id: tags.id, slug: tags.slug })
      .from(tags)
      .where(eq(tags.id, taxonomyId))
      .limit(1);

    if (!existingTag) {
      return {
        success: false,
        error: "标签不存在。",
      };
    }

    const usageCount = await getTagDeletionUsageCount(taxonomyId);

    if (usageCount > 0) {
      return {
        success: false,
        error: "该标签仍被文章使用，无法删除。",
      };
    }

    await db.delete(tags).where(eq(tags.id, taxonomyId));

    return {
      success: true,
      taxonomyId,
      slug: existingTag.slug,
    };
  }

  const [existingSeries] = await db
    .select({ id: series.id, slug: series.slug })
    .from(series)
    .where(eq(series.id, taxonomyId))
    .limit(1);

  if (!existingSeries) {
    return {
      success: false,
      error: "系列不存在。",
    };
  }

  const usageCount = await getSeriesDeletionUsageCount(taxonomyId);

  if (usageCount > 0) {
    return {
      success: false,
      error: "该系列仍被文章使用，无法删除。",
    };
  }

  await db.delete(series).where(eq(series.id, taxonomyId));

  return {
    success: true,
    taxonomyId,
    slug: existingSeries.slug,
  };
}

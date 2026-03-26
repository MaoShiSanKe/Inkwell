import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  categories,
  postSeries,
  posts,
  postTags,
  series,
  tags,
  users,
} from "@/lib/db/schema";

import { cleanupIntegrationTables } from "../setup";

const INTEGRATION_PREFIX = "integration-test-";
const { getAdminSessionMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminSession: getAdminSessionMock,
}));

describe("admin taxonomy write paths", () => {
  beforeEach(async () => {
    await cleanupIntegrationTables();
    getAdminSessionMock.mockReset();
  });

  afterEach(async () => {
    await cleanupIntegrationTables();
  });

  it("rejects assigning a child category as the parent of another child category", async () => {
    const seed = createSeed();
    await signInAsEditor(seed);
    const root = await createCategory({
      name: `Root ${seed}`,
      slug: buildSlug(`root-${seed}`),
      parentId: null,
    });
    const child = await createCategory({
      name: `Child ${seed}`,
      slug: buildSlug(`child-${seed}`),
      parentId: root.id,
    });

    const { createAdminTaxonomy } = await import("@/lib/admin/taxonomies");
    const result = await createAdminTaxonomy("category", {
      name: `Grandchild ${seed}`,
      slug: `Grandchild ${seed}`,
      parentId: String(child.id),
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        parentId: "父分类必须是顶级分类，不能创建三级分类。",
      },
    });
  });

  it("rejects moving a root category under its own child", async () => {
    const seed = createSeed();
    await signInAsEditor(seed);
    const root = await createCategory({
      name: `Cycle Root ${seed}`,
      slug: buildSlug(`cycle-root-${seed}`),
      parentId: null,
    });
    const child = await createCategory({
      name: `Cycle Child ${seed}`,
      slug: buildSlug(`cycle-child-${seed}`),
      parentId: root.id,
    });

    const { updateAdminTaxonomy } = await import("@/lib/admin/taxonomies");
    const result = await updateAdminTaxonomy("category", root.id, {
      name: `Cycle Root ${seed}`,
      slug: root.slug,
      parentId: String(child.id),
    });

    expect(result).toMatchObject({
      success: false,
      errors: {
        parentId: "父分类必须是顶级分类，不能创建三级分类。",
      },
    });
  });

  it("blocks deleting a category that is still referenced by posts", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(seed);
    const category = await createCategory({
      name: `Used Category ${seed}`,
      slug: buildSlug(`used-category-${seed}`),
      parentId: null,
    });

    await createPost({
      authorId: editor.id,
      title: `Post ${seed}`,
      slug: buildSlug(`post-${seed}`),
      categoryId: category.id,
    });

    const { deleteAdminTaxonomy } = await import("@/lib/admin/taxonomies");
    const result = await deleteAdminTaxonomy("category", category.id);

    expect(result).toEqual({
      success: false,
      error: "该分类仍被文章使用，无法删除。",
    });
    expect(await getCategory(category.id)).not.toBeNull();
  });

  it("blocks deleting a tag that is still referenced by posts", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(seed);
    const tag = await createTag({
      name: `Tag ${seed}`,
      slug: buildSlug(`tag-${seed}`),
    });
    const post = await createPost({
      authorId: editor.id,
      title: `Tagged Post ${seed}`,
      slug: buildSlug(`tagged-post-${seed}`),
      categoryId: null,
    });

    await attachTag(post.id, tag.id);

    const { deleteAdminTaxonomy } = await import("@/lib/admin/taxonomies");
    const result = await deleteAdminTaxonomy("tag", tag.id);

    expect(result).toEqual({
      success: false,
      error: "该标签仍被文章使用，无法删除。",
    });
    expect(await getTag(tag.id)).not.toBeNull();
  });

  it("blocks deleting a series that is still referenced by posts", async () => {
    const seed = createSeed();
    const editor = await signInAsEditor(seed);
    const seriesItem = await createSeries({
      name: `Series ${seed}`,
      slug: buildSlug(`series-${seed}`),
    });
    const post = await createPost({
      authorId: editor.id,
      title: `Series Post ${seed}`,
      slug: buildSlug(`series-post-${seed}`),
      categoryId: null,
    });

    await attachSeries(post.id, seriesItem.id);

    const { deleteAdminTaxonomy } = await import("@/lib/admin/taxonomies");
    const result = await deleteAdminTaxonomy("series", seriesItem.id);

    expect(result).toEqual({
      success: false,
      error: "该系列仍被文章使用，无法删除。",
    });
    expect(await getSeries(seriesItem.id)).not.toBeNull();
  });
});

function createSeed() {
  return randomUUID().replaceAll("-", "");
}

function buildSlug(value: string) {
  return `${INTEGRATION_PREFIX}${value}`;
}

async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

async function signInAsEditor(seed: string) {
  const editor = await createUser({
    seed,
    role: "editor",
    displayName: `Editor ${seed}`,
  });

  getAdminSessionMock.mockResolvedValue({
    isAuthenticated: true,
    userId: editor.id,
    role: "editor",
  });

  return editor;
}

async function createUser(input: {
  seed: string;
  role: "author" | "editor";
  displayName: string;
}) {
  const db = await getDb();
  const normalizedSeed = `${INTEGRATION_PREFIX}${input.seed}`;
  const [user] = await db
    .insert(users)
    .values({
      email: `${normalizedSeed}@example.com`,
      username: normalizedSeed,
      displayName: input.displayName,
      passwordHash: "hashed-password",
      role: input.role,
    })
    .returning({
      id: users.id,
      username: users.username,
    });

  return user;
}

async function createCategory(input: {
  name: string;
  slug: string;
  parentId: number | null;
}) {
  const db = await getDb();
  const [category] = await db
    .insert(categories)
    .values({
      name: input.name,
      slug: input.slug,
      parentId: input.parentId,
    })
    .returning({
      id: categories.id,
      slug: categories.slug,
    });

  return category;
}

async function createTag(input: { name: string; slug: string }) {
  const db = await getDb();
  const [tag] = await db
    .insert(tags)
    .values({
      name: input.name,
      slug: input.slug,
    })
    .returning({
      id: tags.id,
      slug: tags.slug,
    });

  return tag;
}

async function createSeries(input: { name: string; slug: string }) {
  const db = await getDb();
  const [seriesItem] = await db
    .insert(series)
    .values({
      name: input.name,
      slug: input.slug,
    })
    .returning({
      id: series.id,
      slug: series.slug,
    });

  return seriesItem;
}

async function createPost(input: {
  authorId: number;
  title: string;
  slug: string;
  categoryId: number | null;
}) {
  const db = await getDb();
  const [post] = await db
    .insert(posts)
    .values({
      authorId: input.authorId,
      title: input.title,
      slug: input.slug,
      content: `Content for ${input.title}`,
      status: "draft",
      categoryId: input.categoryId,
      updatedAt: new Date("2026-03-26T20:00:00.000Z"),
    })
    .returning({
      id: posts.id,
    });

  return post;
}

async function attachTag(postId: number, tagId: number) {
  const db = await getDb();
  await db.insert(postTags).values({ postId, tagId });
}

async function attachSeries(postId: number, seriesId: number) {
  const db = await getDb();
  await db.insert(postSeries).values({ postId, seriesId, orderIndex: 0 });
}

async function getCategory(categoryId: number) {
  const db = await getDb();
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);

  return category ?? null;
}

async function getTag(tagId: number) {
  const db = await getDb();
  const [tag] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(eq(tags.id, tagId))
    .limit(1);

  return tag ?? null;
}

async function getSeries(seriesId: number) {
  const db = await getDb();
  const [seriesItem] = await db
    .select({ id: series.id })
    .from(series)
    .where(eq(series.id, seriesId))
    .limit(1);

  return seriesItem ?? null;
}

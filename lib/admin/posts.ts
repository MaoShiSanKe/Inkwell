import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import { getAdminSession, type AdminRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, postRevisions, posts, users } from "@/lib/db/schema";
import { getExcerptLength } from "@/lib/settings";

import {
  createPostFormState,
  type PostFormErrors,
  type PostFormValues,
} from "./post-form";

export type AdminPostListItem = {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "published" | "scheduled" | "trash";
  categoryName: string | null;
  authorDisplayName: string;
  authorUsername: string;
  updatedAt: Date;
  publishedAt: Date | null;
};

export type PostCategoryOption = {
  id: number;
  name: string;
  slug: string;
};

export type CreateAdminPostInput = {
  title: string;
  slug: string;
  categoryId?: string;
  excerpt?: string;
  content: string;
  status: "draft" | "published";
};

export type CreateAdminPostResult =
  | {
      success: true;
      postId: number;
    }
  | {
      success: false;
      values: PostFormValues;
      errors: PostFormErrors;
    };

export type UpdateAdminPostResult = CreateAdminPostResult;

export type AdminPostEditorData = {
  id: number;
  values: PostFormValues;
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

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildExcerpt(content: string, length: number) {
  return stripHtml(content).slice(0, length).trim();
}

function getInitialValues(input: CreateAdminPostInput): PostFormValues {
  return {
    title: input.title.trim(),
    slug: normalizeSlug(input.slug),
    categoryId: input.categoryId?.trim() ?? "",
    excerpt: input.excerpt?.trim() ?? "",
    content: input.content.trim(),
    status: input.status,
  };
}

async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session.isAuthenticated || !session.userId || !session.role) {
    return null;
  }

  return session as {
    isAuthenticated: true;
    userId: number;
    role: AdminRole;
  };
}

export async function listAdminPosts(): Promise<AdminPostListItem[]> {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      status: posts.status,
      categoryName: categories.name,
      authorDisplayName: users.displayName,
      authorUsername: users.username,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .orderBy(desc(posts.updatedAt))
    .limit(50);
}

export async function listPostCategoryOptions(): Promise<PostCategoryOption[]> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories)
    .orderBy(categories.name);
}

export async function getAdminPostEditorData(
  postId: number,
): Promise<AdminPostEditorData | null> {
  const [post] = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      categoryId: posts.categoryId,
      excerpt: posts.excerpt,
      content: posts.content,
      status: posts.status,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) {
    return null;
  }

  return {
    id: post.id,
    values: createPostFormState({
      title: post.title,
      slug: post.slug,
      categoryId: post.categoryId ? String(post.categoryId) : "",
      excerpt: post.excerpt ?? "",
      content: post.content,
      status: post.status === "published" ? "published" : "draft",
    }).values,
  };
}

export async function createAdminPost(
  input: CreateAdminPostInput,
): Promise<CreateAdminPostResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      values: getInitialValues(input),
      errors: {
        form: "当前会话无效，请重新登录。",
      },
    };
  }

  const values = getInitialValues(input);
  const validation = await validatePostInput(values);

  if (!validation.success) {
    return {
      success: false,
      values,
      errors: validation.errors,
    };
  }

  const { parsedCategoryId, resolvedExcerpt, publishedAt } = validation;
  const now = new Date();

  try {
    const insertedPost = await db.transaction(async (tx) => {
      const [post] = await tx
        .insert(posts)
        .values({
          authorId: session.userId,
          categoryId: parsedCategoryId,
          title: values.title,
          slug: values.slug,
          excerpt: resolvedExcerpt,
          content: values.content,
          status: values.status,
          publishedAt,
          updatedAt: now,
        })
        .returning({ id: posts.id });

      await tx.insert(postRevisions).values({
        postId: post.id,
        editorId: session.userId,
        title: values.title,
        excerpt: resolvedExcerpt,
        content: values.content,
        status: values.status,
        reason: "initial create",
      });

      return post;
    });

    return {
      success: true,
      postId: insertedPost.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建文章失败。";

    return {
      success: false,
      values,
      errors: {
        form: message,
      },
    };
  }
}

export async function updateAdminPost(
  postId: number,
  input: CreateAdminPostInput,
): Promise<UpdateAdminPostResult> {
  const session = await requireAdminSession();

  if (!session) {
    return {
      success: false,
      values: getInitialValues(input),
      errors: {
        form: "当前会话无效，请重新登录。",
      },
    };
  }

  if (!Number.isInteger(postId) || postId <= 0) {
    return {
      success: false,
      values: getInitialValues(input),
      errors: {
        form: "文章不存在。",
      },
    };
  }

  const [existingPost] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!existingPost) {
    return {
      success: false,
      values: getInitialValues(input),
      errors: {
        form: "文章不存在。",
      },
    };
  }

  const values = getInitialValues(input);
  const validation = await validatePostInput(values, postId);

  if (!validation.success) {
    return {
      success: false,
      values,
      errors: validation.errors,
    };
  }

  const { parsedCategoryId, resolvedExcerpt, publishedAt } = validation;
  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(posts)
        .set({
          categoryId: parsedCategoryId,
          title: values.title,
          slug: values.slug,
          excerpt: resolvedExcerpt,
          content: values.content,
          status: values.status,
          publishedAt,
          updatedAt: now,
        })
        .where(eq(posts.id, postId));

      await tx.insert(postRevisions).values({
        postId,
        editorId: session.userId,
        title: values.title,
        excerpt: resolvedExcerpt,
        content: values.content,
        status: values.status,
        reason: "manual update",
      });
    });

    return {
      success: true,
      postId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新文章失败。";

    return {
      success: false,
      values,
      errors: {
        form: message,
      },
    };
  }
}

async function validatePostInput(values: PostFormValues, currentPostId?: number) {
  const errors: PostFormErrors = {};

  if (!values.title || values.title.length > 255) {
    errors.title = "标题不能为空，且长度不能超过 255 个字符。";
  }

  if (!values.slug || values.slug.length > 255) {
    errors.slug = "Slug 不能为空，且长度不能超过 255 个字符。";
  }

  if (!/^[a-z0-9-]+$/.test(values.slug)) {
    errors.slug = "Slug 只能包含小写字母、数字和短横线。";
  }

  if (!values.content) {
    errors.content = "正文不能为空。";
  }

  if (values.status !== "draft" && values.status !== "published") {
    errors.status = "仅支持保存草稿或直接发布。";
  }

  let parsedCategoryId: number | null = null;

  if (values.categoryId) {
    parsedCategoryId = Number.parseInt(values.categoryId, 10);

    if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
      errors.categoryId = "分类无效。";
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false as const,
      errors,
    };
  }

  if (parsedCategoryId !== null) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, parsedCategoryId))
      .limit(1);

    if (!category) {
      return {
        success: false as const,
        errors: {
          categoryId: "所选分类不存在。",
        },
      };
    }
  }

  const [existingPost] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      currentPostId
        ? and(eq(posts.slug, values.slug), ne(posts.id, currentPostId))
        : eq(posts.slug, values.slug),
    )
    .limit(1);

  if (existingPost) {
    return {
      success: false as const,
      errors: {
        slug: "该 slug 已存在，请更换。",
      },
    };
  }

  const excerptLength = await getExcerptLength();
  const resolvedExcerpt = values.excerpt || buildExcerpt(values.content, excerptLength);
  const publishedAt = values.status === "published" ? new Date() : null;

  return {
    success: true as const,
    parsedCategoryId,
    resolvedExcerpt,
    publishedAt,
  };
}

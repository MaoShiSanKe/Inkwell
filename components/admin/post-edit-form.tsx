"use client";

import { useActionState } from "react";

import { updatePostAction } from "@/app/(admin)/[adminPath]/(protected)/posts/actions";
import { createPostFormState, type PostFormValues } from "@/lib/admin/post-form";

type PostCategoryOption = {
  id: number;
  name: string;
  slug: string;
};

type PostEditFormProps = {
  adminPath: string;
  postId: number;
  categories: PostCategoryOption[];
  initialValues: PostFormValues;
};

export function PostEditForm({
  adminPath,
  postId,
  categories,
  initialValues,
}: PostEditFormProps) {
  const initialState = createPostFormState(initialValues);
  const [state = initialState, formAction, isPending] = useActionState(
    updatePostAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
    >
      <input type="hidden" name="adminPath" value={adminPath} />
      <input type="hidden" name="postId" value={postId} />

      {state.errors.form ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {state.errors.form}
        </p>
      ) : null}

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        标题
        <input
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          type="text"
          name="title"
          defaultValue={state.values.title}
          required
        />
        {state.errors.title ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.title}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        Slug
        <input
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          type="text"
          name="slug"
          defaultValue={state.values.slug}
          required
        />
        {state.errors.slug ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.slug}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        分类
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          name="categoryId"
          defaultValue={state.values.categoryId}
        >
          <option value="">未分类</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {state.errors.categoryId ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.categoryId}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        摘要
        <textarea
          className="min-h-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          name="excerpt"
          defaultValue={state.values.excerpt}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        正文
        <textarea
          className="min-h-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          name="content"
          defaultValue={state.values.content}
          required
        />
        {state.errors.content ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.content}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        状态
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          name="status"
          defaultValue={state.values.status}
        >
          <option value="draft">草稿</option>
          <option value="published">立即发布</option>
        </select>
        {state.errors.status ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.status}</span>
        ) : null}
      </label>

      <div className="flex items-center gap-3">
        <button
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "保存中..." : "保存修改"}
        </button>
      </div>
    </form>
  );
}

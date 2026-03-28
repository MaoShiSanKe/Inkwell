"use client";

import { useActionState } from "react";

import { createPostAction } from "@/app/(admin)/[adminPath]/(protected)/posts/actions";
import { initialCreatePostState } from "@/app/(admin)/[adminPath]/(protected)/posts/form-state";
import { PostContentEditor } from "@/components/admin/post-content-editor";
import { MediaPicker, type MediaPickerOption } from "@/components/admin/media-picker";

type PostCategoryOption = {
  id: number;
  name: string;
  slug: string;
};

type PostTagOption = {
  id: number;
  name: string;
  slug: string;
};

type PostSeriesOption = {
  id: number;
  name: string;
  slug: string;
};

type PostCreateFormProps = {
  adminPath: string;
  categories: PostCategoryOption[];
  tags: PostTagOption[];
  series: PostSeriesOption[];
  mediaOptions: MediaPickerOption[];
};

export function PostCreateForm({
  adminPath,
  categories,
  tags,
  series,
  mediaOptions,
}: PostCreateFormProps) {
  const [state = initialCreatePostState, formAction, isPending] = useActionState(
    createPostAction,
    initialCreatePostState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
    >
      <input type="hidden" name="adminPath" value={adminPath} />

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

      <fieldset className="flex flex-col gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
        <legend>标签</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {tags.length === 0 ? (
            <p className="text-sm font-normal text-slate-500 dark:text-slate-400">当前还没有标签可选。</p>
          ) : (
            tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                <input
                  type="checkbox"
                  name="tagIds"
                  value={tag.id}
                  defaultChecked={state.values.tagIds.includes(String(tag.id))}
                />
                <span>{tag.name}</span>
              </label>
            ))
          )}
        </div>
        {state.errors.tagIds ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.tagIds}</span>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
        <legend>系列</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {series.length === 0 ? (
            <p className="text-sm font-normal text-slate-500 dark:text-slate-400">当前还没有系列可选。</p>
          ) : (
            series.map((item) => (
              <label key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                <input
                  type="checkbox"
                  name="seriesIds"
                  value={item.id}
                  defaultChecked={state.values.seriesIds.includes(String(item.id))}
                />
                <span>{item.name}</span>
              </label>
            ))
          )}
        </div>
        {state.errors.seriesIds ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.seriesIds}</span>
        ) : null}
      </fieldset>

      <details className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
          SEO 设置
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Meta Title
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="text"
              name="metaTitle"
              defaultValue={state.values.metaTitle}
              placeholder="用于搜索结果标题，留空则沿用文章标题"
            />
            {state.errors.metaTitle ? (
              <span className="text-sm text-red-600 dark:text-red-300">{state.errors.metaTitle}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Meta Description
            <textarea
              className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              name="metaDescription"
              defaultValue={state.values.metaDescription}
              placeholder="用于搜索结果摘要，留空则由前台自行决定。"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            OG Title
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="text"
              name="ogTitle"
              defaultValue={state.values.ogTitle}
              placeholder="用于社交分享标题"
            />
            {state.errors.ogTitle ? (
              <span className="text-sm text-red-600 dark:text-red-300">{state.errors.ogTitle}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            OG Description
            <textarea
              className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              name="ogDescription"
              defaultValue={state.values.ogDescription}
              placeholder="用于社交分享摘要"
            />
          </label>

          <MediaPicker
            adminPath={adminPath}
            mediaOptions={mediaOptions}
            value={state.values.ogImageMediaId}
            error={state.errors.ogImageMediaId}
          />

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Canonical URL
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="url"
              name="canonicalUrl"
              defaultValue={state.values.canonicalUrl}
              placeholder="https://example.com/post"
            />
            {state.errors.canonicalUrl ? (
              <span className="text-sm text-red-600 dark:text-red-300">{state.errors.canonicalUrl}</span>
            ) : null}
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" name="breadcrumbEnabled" defaultChecked={state.values.breadcrumbEnabled} />
              启用面包屑
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" name="noindex" defaultChecked={state.values.noindex} />
              noindex
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" name="nofollow" defaultChecked={state.values.nofollow} />
              nofollow
            </label>
          </div>
        </div>
      </details>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        摘要
        <textarea
          className="min-h-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          name="excerpt"
          defaultValue={state.values.excerpt}
        />
      </label>

      <PostContentEditor
        adminPath={adminPath}
        mediaOptions={mediaOptions}
        value={state.values.content}
        error={state.errors.content}
      />

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
          {isPending ? "保存中..." : "保存文章"}
        </button>
      </div>
    </form>
  );
}

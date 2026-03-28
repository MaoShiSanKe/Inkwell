"use client";

import { useActionState, useMemo, useState } from "react";

import { updatePostAction } from "@/app/(admin)/[adminPath]/(protected)/posts/actions";
import { PostContentEditor } from "@/components/admin/post-content-editor";
import { MediaPicker, type MediaPickerOption } from "@/components/admin/media-picker";
import { createPostFormState, toScheduledAtIso, type PostFormValues } from "@/lib/admin/post-form";

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

type PostEditFormProps = {
  adminPath: string;
  postId: number;
  categories: PostCategoryOption[];
  tags: PostTagOption[];
  series: PostSeriesOption[];
  mediaOptions: MediaPickerOption[];
  initialValues: PostFormValues;
};

export function PostEditForm({
  adminPath,
  postId,
  categories,
  tags,
  series,
  mediaOptions,
  initialValues,
}: PostEditFormProps) {
  const initialState = createPostFormState(initialValues);
  const [state = initialState, formAction, isPending] = useActionState(
    updatePostAction,
    initialState,
  );
  const initialSlug = initialValues.slug;
  const currentSlugValue = state.values.slug;
  const [slugDraft, setSlugDraft] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<
    "draft" | "published" | "scheduled" | null
  >(null);
  const [scheduledAtDraft, setScheduledAtDraft] = useState<string | null>(null);
  const slugValue = slugDraft ?? currentSlugValue;
  const statusValue = statusDraft ?? state.values.status;
  const scheduledAtValue = scheduledAtDraft ?? state.values.scheduledAt;
  const slugChanged = slugValue !== initialSlug;
  const scheduledAtIso = useMemo(
    () => toScheduledAtIso(scheduledAtValue),
    [scheduledAtValue],
  );
  const showScheduledAt = statusValue === "scheduled";

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
    >
      <input type="hidden" name="adminPath" value={adminPath} />
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="scheduledAtIso" value={scheduledAtIso} />

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
          value={slugValue}
          onChange={(event) => setSlugDraft(event.target.value)}
          required
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          aria-describedby={slugChanged ? "slug-warning" : "slug-helper"}
        />
        <span
          id="slug-helper"
          className="text-xs font-normal text-slate-500 dark:text-slate-400"
        >
          修改 slug 后，旧 slug 会被保留，并永久重定向到当前 slug。历史 slug 不能再被其他文章复用。
        </span>
        {slugChanged ? (
          <div
            id="slug-warning"
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <p className="font-semibold">Slug 变更警告</p>
            <p className="mt-1">
              旧地址 <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/60">/post/{initialSlug}</code>
              将永久跳转到
              <code className="ml-1 rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/60">
                /post/{slugValue.trim() || "(待输入)"}
              </code>
              。
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
              <li>旧链接会持续可访问，但会直接跳转到最新 slug。</li>
              <li>历史 slug 会被系统保留，不能再分配给其他文章。</li>
              <li>如果你手动填写了 Canonical URL，请同步检查是否需要修改。</li>
            </ul>
          </div>
        ) : null}

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
          value={statusValue}
          onChange={(event) =>
            setStatusDraft(event.target.value as "draft" | "published" | "scheduled")
          }
        >
          <option value="draft">草稿</option>
          <option value="published">立即发布</option>
          <option value="scheduled">定时发布</option>
        </select>
        {state.errors.status ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.status}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        计划发布时间
        <input
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          type="datetime-local"
          name="scheduledAt"
          value={scheduledAtValue}
          onChange={(event) => setScheduledAtDraft(event.target.value)}
          disabled={!showScheduledAt}
        />
        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
          仅在选择“定时发布”时生效，按你当前浏览器时区输入。
        </span>
        {state.errors.scheduledAt ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.scheduledAt}</span>
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

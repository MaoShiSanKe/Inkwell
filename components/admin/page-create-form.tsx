"use client";

import { useActionState } from "react";

import { createPageAction } from "@/app/(admin)/[adminPath]/(protected)/pages/actions";
import { initialCreatePageState } from "@/app/(admin)/[adminPath]/(protected)/pages/form-state";
import { MediaPicker, type MediaPickerOption } from "@/components/admin/media-picker";
import { PostContentEditor } from "@/components/admin/post-content-editor";

type PageCreateFormProps = {
  adminPath: string;
  mediaOptions: MediaPickerOption[];
};

export function PageCreateForm({ adminPath, mediaOptions }: PageCreateFormProps) {
  const [state = initialCreatePageState, formAction, isPending] = useActionState(
    createPageAction,
    initialCreatePageState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6 rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
      <input type="hidden" name="adminPath" value={adminPath} />

      {state.errors.form ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {state.errors.form}
        </p>
      ) : null}

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        标题
        <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="text" name="title" defaultValue={state.values.title} required />
        {state.errors.title ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.title}</span> : null}
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        Slug
        <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="text" name="slug" defaultValue={state.values.slug} required spellCheck={false} autoCapitalize="none" autoCorrect="off" />
        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">用于根路径访问，例如填写 about 后公开地址为 /about。</span>
        {state.errors.slug ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.slug}</span> : null}
      </label>

      <PostContentEditor adminPath={adminPath} mediaOptions={mediaOptions} value={state.values.content} error={state.errors.content} />

      <details className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">SEO 设置</summary>
        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Meta Title
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="text" name="metaTitle" defaultValue={state.values.metaTitle} />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Meta Description
            <textarea className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" name="metaDescription" defaultValue={state.values.metaDescription} />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            OG Title
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="text" name="ogTitle" defaultValue={state.values.ogTitle} />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            OG Description
            <textarea className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" name="ogDescription" defaultValue={state.values.ogDescription} />
          </label>

          <MediaPicker adminPath={adminPath} mediaOptions={mediaOptions} value={state.values.ogImageMediaId} error={state.errors.ogImageMediaId} />

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Canonical URL
            <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="url" name="canonicalUrl" defaultValue={state.values.canonicalUrl} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
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
        状态
        <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" name="status" defaultValue={state.values.status}>
          <option value="draft">草稿</option>
          <option value="published">发布</option>
        </select>
      </label>

      <button className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300" type="submit" disabled={isPending}>
        {isPending ? "保存中..." : "保存页面"}
      </button>
    </form>
  );
}

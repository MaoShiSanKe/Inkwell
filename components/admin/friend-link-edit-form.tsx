"use client";

import { useActionState } from "react";

import { updateFriendLinkAction } from "@/app/(admin)/[adminPath]/(protected)/friend-links/actions";
import { createFriendLinkFormState, type FriendLinkFormValues } from "@/lib/admin/friend-link-form";
import { MediaPicker, type MediaPickerOption } from "@/components/admin/media-picker";

type FriendLinkEditFormProps = {
  adminPath: string;
  friendLinkId: number;
  mediaOptions: MediaPickerOption[];
  initialValues: FriendLinkFormValues;
};

export function FriendLinkEditForm({
  adminPath,
  friendLinkId,
  mediaOptions,
  initialValues,
}: FriendLinkEditFormProps) {
  const initialState = createFriendLinkFormState(initialValues);
  const [state = initialState, formAction, isPending] = useActionState(updateFriendLinkAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6 rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
      <input type="hidden" name="adminPath" value={adminPath} />
      <input type="hidden" name="friendLinkId" value={friendLinkId} />

      {state.errors.form ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {state.errors.form}
        </p>
      ) : null}

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        站点名
        <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="text" name="siteName" defaultValue={state.values.siteName} required />
        {state.errors.siteName ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.siteName}</span> : null}
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        链接地址
        <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="url" name="url" defaultValue={state.values.url} required spellCheck={false} autoCapitalize="none" autoCorrect="off" />
        {state.errors.url ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.url}</span> : null}
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        描述
        <textarea className="min-h-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" name="description" defaultValue={state.values.description} />
        {state.errors.description ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.description}</span> : null}
      </label>

      <MediaPicker
        adminPath={adminPath}
        mediaOptions={mediaOptions}
        value={state.values.logoMediaId}
        error={state.errors.logoMediaId}
        fieldName="logoMediaId"
        label="Logo"
        emptyLabel="不设置 Logo"
        helperText="可从媒体库选择一张 Logo，用于前台友链卡片展示。"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          排序
          <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="number" name="sortOrder" defaultValue={state.values.sortOrder} required />
          {state.errors.sortOrder ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.sortOrder}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          状态
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" name="status" defaultValue={state.values.status}>
            <option value="draft">草稿</option>
            <option value="published">发布</option>
            <option value="trash">回收站</option>
          </select>
        </label>
      </div>

      <button className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300" type="submit" disabled={isPending}>
        {isPending ? "保存中..." : "更新友链"}
      </button>
    </form>
  );
}

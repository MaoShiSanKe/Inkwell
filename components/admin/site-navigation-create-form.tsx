"use client";

import { useActionState } from "react";

import { createSiteNavigationAction } from "@/app/(admin)/[adminPath]/(protected)/site-navigation/actions";
import { initialCreateSiteNavigationState } from "@/app/(admin)/[adminPath]/(protected)/site-navigation/form-state";

export function SiteNavigationCreateForm({ adminPath }: { adminPath: string }) {
  const [state = initialCreateSiteNavigationState, formAction, isPending] = useActionState(
    createSiteNavigationAction,
    initialCreateSiteNavigationState,
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
        导航文案
        <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="text" name="label" defaultValue={state.values.label} required />
        {state.errors.label ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.label}</span> : null}
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        链接地址
        <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="text" name="url" defaultValue={state.values.url} required spellCheck={false} autoCapitalize="none" autoCorrect="off" placeholder="/about 或 https://example.com" />
        {state.errors.url ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.url}</span> : null}
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          排序
          <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="number" name="sortOrder" defaultValue={state.values.sortOrder} required />
          {state.errors.sortOrder ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.sortOrder}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          新标签页打开
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" name="openInNewTab" defaultValue={state.values.openInNewTab}>
            <option value="false">否</option>
            <option value="true">是</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          是否显示
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" name="visible" defaultValue={state.values.visible}>
            <option value="true">显示</option>
            <option value="false">隐藏</option>
          </select>
        </label>
      </div>

      <button className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300" type="submit" disabled={isPending}>
        {isPending ? "保存中..." : "保存导航项"}
      </button>
    </form>
  );
}

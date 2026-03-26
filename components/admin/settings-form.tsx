"use client";

import { useActionState } from "react";

import { saveSettingsAction } from "@/app/(admin)/[adminPath]/(protected)/settings/actions";
import {
  createSettingsFormState,
  type SettingsFormValues,
} from "@/lib/admin/settings-form";

type SettingsFormProps = {
  adminPath: string;
  initialValues: SettingsFormValues;
};

export function SettingsForm({ adminPath, initialValues }: SettingsFormProps) {
  const initialState = createSettingsFormState(initialValues);
  const [state = initialState, formAction, isPending] = useActionState(
    saveSettingsAction,
    initialState,
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

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          后台路径
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            type="text"
            name="admin_path"
            defaultValue={state.values.admin_path}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            仅允许小写字母、数字和短横线。修改后如路由未立即生效，请重启服务。
          </span>
          {state.errors.admin_path ? (
            <span className="text-sm text-red-600 dark:text-red-300">
              {state.errors.admin_path}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          评论审核模式
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            name="comment_moderation"
            defaultValue={state.values.comment_moderation}
          >
            <option value="pending">待审核</option>
            <option value="approved">直接通过</option>
          </select>
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            控制新评论默认进入待审核还是直接公开，白名单用户仍会跳过审核。
          </span>
          {state.errors.comment_moderation ? (
            <span className="text-sm text-red-600 dark:text-red-300">
              {state.errors.comment_moderation}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          修订保留数量
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            type="number"
            min="1"
            step="1"
            name="revision_limit"
            defaultValue={state.values.revision_limit}
          />
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            每篇文章最多保留多少条修订记录，超过后自动清理最旧项。
          </span>
          {state.errors.revision_limit ? (
            <span className="text-sm text-red-600 dark:text-red-300">
              {state.errors.revision_limit}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          修订保留天数
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            type="number"
            min="0"
            step="1"
            name="revision_ttl_days"
            defaultValue={state.values.revision_ttl_days}
          />
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            已发布文章的草稿修订超过该天数后会被后台清理；填 0 表示仅按数量上限控制。
          </span>
          {state.errors.revision_ttl_days ? (
            <span className="text-sm text-red-600 dark:text-red-300">
              {state.errors.revision_ttl_days}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
          自动摘要长度
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            type="number"
            min="1"
            step="1"
            name="excerpt_length"
            defaultValue={state.values.excerpt_length}
          />
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            当文章摘要留空时，系统会从正文纯文本截取前 N 个字符作为摘要。
          </span>
          {state.errors.excerpt_length ? (
            <span className="text-sm text-red-600 dark:text-red-300">
              {state.errors.excerpt_length}
            </span>
          ) : null}
        </label>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        修改后台路径后，建议立即使用新路径重新访问后台，并确认部署环境中的进程或缓存策略不会延迟生效。
      </div>

      <div className="flex items-center gap-3">
        <button
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "保存中..." : "保存设置"}
        </button>
      </div>
    </form>
  );
}

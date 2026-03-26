"use client";

import { useActionState } from "react";

import {
  createIpBlacklistAction,
  deleteIpBlacklistAction,
} from "@/app/(admin)/[adminPath]/(protected)/ip-blacklist/actions";
import { initialIpBlacklistFormState } from "@/lib/admin/ip-blacklist-form";

export type AdminIpBlacklistListItemView = {
  id: number;
  network: string;
  reason: string | null;
  createdByDisplayName: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type IpBlacklistManagerProps = {
  adminPath: string;
  entries: AdminIpBlacklistListItemView[];
};

export function IpBlacklistManager({ adminPath, entries }: IpBlacklistManagerProps) {
  const [state = initialIpBlacklistFormState, formAction, isPending] = useActionState(
    createIpBlacklistAction,
    initialIpBlacklistFormState,
  );

  return (
    <div className="flex flex-col gap-8">
      <form
        action={formAction}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
      >
        <input type="hidden" name="adminPath" value={adminPath} />

        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">新增黑名单</h2>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            支持单个 IP 或 CIDR 段，例如 <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">203.0.113.10</code>
            、<code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">203.0.113.0/24</code>。
          </p>
        </div>

        {state.errors.form ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {state.errors.form}
          </p>
        ) : null}

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          IP / CIDR
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            type="text"
            name="network"
            defaultValue={state.values.network}
            placeholder="203.0.113.10 或 203.0.113.0/24"
          />
          {state.errors.network ? (
            <span className="text-sm text-red-600 dark:text-red-300">{state.errors.network}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          原因
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            type="text"
            name="reason"
            defaultValue={state.values.reason}
            placeholder="可选，例如 spam crawler"
          />
          {state.errors.reason ? (
            <span className="text-sm text-red-600 dark:text-red-300">{state.errors.reason}</span>
          ) : null}
        </label>

        <button
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "保存中..." : "加入黑名单"}
        </button>
      </form>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <p className="text-lg font-medium">还没有黑名单记录</p>
          <p className="mt-2 text-sm">添加黑名单后，命中的请求将在应用层直接返回 403。</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr className="text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                  <th className="px-4 py-3">网络</th>
                  <th className="px-4 py-3">原因</th>
                  <th className="px-4 py-3">创建人</th>
                  <th className="px-4 py-3">过期时间</th>
                  <th className="px-4 py-3">创建时间</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {entries.map((entry) => (
                  <tr key={entry.id} className="text-sm text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3 font-mono text-xs">{entry.network}</td>
                    <td className="px-4 py-3">{entry.reason ?? "—"}</td>
                    <td className="px-4 py-3">{entry.createdByDisplayName ?? "系统"}</td>
                    <td className="px-4 py-3">{entry.expiresAt ?? "永久"}</td>
                    <td className="px-4 py-3">{entry.createdAt}</td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteIpBlacklistAction} className="inline-flex">
                        <input type="hidden" name="adminPath" value={adminPath} />
                        <input type="hidden" name="entryId" value={entry.id} />
                        <button
                          className="inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                          type="submit"
                        >
                          删除
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

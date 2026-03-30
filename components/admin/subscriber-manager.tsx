"use client";

import { useActionState } from "react";

import { deleteSubscriberAction } from "@/app/(admin)/[adminPath]/(protected)/subscribers/actions";

export type AdminSubscriberListItemView = {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
};

type SubscriberManagerProps = {
  adminPath: string;
  subscribers: AdminSubscriberListItemView[];
};

const initialDeleteState = {
  error: null as string | null,
};

export function SubscriberManager({ adminPath, subscribers }: SubscriberManagerProps) {
  const [state = initialDeleteState, deleteAction] = useActionState(
    deleteSubscriberAction,
    initialDeleteState,
  );

  if (subscribers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <p className="text-lg font-medium">还没有订阅者</p>
        <p className="mt-2 text-sm">公开订阅入口启用后，新的邮件订阅者会显示在这里。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr className="text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                <th className="px-4 py-3">昵称</th>
                <th className="px-4 py-3">邮箱</th>
                <th className="px-4 py-3">订阅时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id} className="text-sm text-slate-700 dark:text-slate-200">
                  <td className="px-4 py-3">{subscriber.displayName}</td>
                  <td className="px-4 py-3">{subscriber.email}</td>
                  <td className="px-4 py-3">{subscriber.createdAt}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteAction} className="inline-flex">
                      <input type="hidden" name="adminPath" value={adminPath} />
                      <input type="hidden" name="subscriberId" value={subscriber.id} />
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
    </div>
  );
}

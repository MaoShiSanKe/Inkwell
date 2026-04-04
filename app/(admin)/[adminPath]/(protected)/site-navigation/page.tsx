import Link from "next/link";

import { deleteSiteNavigationAction } from "./actions";
import { listAdminSiteNavigation } from "@/lib/admin/site-navigation";

type AdminSiteNavigationPageProps = {
  params: Promise<{
    adminPath: string;
  }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  }>;
};

export default async function AdminSiteNavigationPage({
  params,
  searchParams,
}: AdminSiteNavigationPageProps) {
  const [{ adminPath }, { created, updated, deleted, error }] = await Promise.all([
    params,
    searchParams,
  ]);
  const items = await listAdminSiteNavigation();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Site Navigation
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">站点导航</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            管理公开页头导航入口，控制显示、顺序与跳转目标。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          href={`/${adminPath}/site-navigation/new`}
        >
          新建导航项
        </Link>
      </div>

      {created === "1" ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">导航项已创建成功。</p> : null}
      {updated === "1" ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">导航项已更新成功。</p> : null}
      {deleted === "1" ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">导航项已删除。</p> : null}
      {error === "delete_failed" ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">删除导航项失败，请稍后重试。</p> : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <p className="text-lg font-medium">还没有导航项</p>
          <p className="mt-2 text-sm">先创建一个公开页头导航入口，例如关于页、友链或站内专题。</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr className="text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                  <th className="px-4 py-3">文案</th>
                  <th className="px-4 py-3">链接</th>
                  <th className="px-4 py-3">排序</th>
                  <th className="px-4 py-3">可见</th>
                  <th className="px-4 py-3">新标签页</th>
                  <th className="px-4 py-3">更新时间</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {items.map((item) => (
                  <tr key={item.id} className="text-sm text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3 font-medium">
                      <Link className="hover:underline" href={`/${adminPath}/site-navigation/${item.id}`}>
                        {item.label}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-500 dark:text-slate-400">{item.url}</td>
                    <td className="px-4 py-3 tabular-nums">{item.sortOrder}</td>
                    <td className="px-4 py-3">{item.visible ? "显示" : "隐藏"}</td>
                    <td className="px-4 py-3">{item.openInNewTab ? "是" : "否"}</td>
                    <td className="px-4 py-3">{item.updatedAt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteSiteNavigationAction} className="inline-flex">
                        <input type="hidden" name="adminPath" value={adminPath} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <button className="inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40" type="submit">删除</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

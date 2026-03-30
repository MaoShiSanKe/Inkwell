import Link from "next/link";

import { moveFriendLinkToTrashAction, restoreFriendLinkAction } from "./actions";
import { listAdminFriendLinks } from "@/lib/admin/friend-links";

type AdminFriendLinksPageProps = {
  params: Promise<{
    adminPath: string;
  }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    trashed?: string;
    restored?: string;
    error?: string;
  }>;
};

function getStatusLabel(status: "draft" | "published" | "trash") {
  switch (status) {
    case "draft":
      return "草稿";
    case "published":
      return "已发布";
    case "trash":
      return "回收站";
  }
}

export default async function AdminFriendLinksPage({ params, searchParams }: AdminFriendLinksPageProps) {
  const [{ adminPath }, { created, updated, trashed, restored, error }] = await Promise.all([
    params,
    searchParams,
  ]);
  const friendLinks = await listAdminFriendLinks();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Friend Links
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">友链管理</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            结构化管理站点友链列表，控制公开页展示顺序、描述与 Logo。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          href={`/${adminPath}/friend-links/new`}
        >
          新建友链
        </Link>
      </div>

      {created === "1" ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">友链已创建成功。</p> : null}
      {updated === "1" ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">友链已更新成功。</p> : null}
      {trashed === "1" ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">友链已移入回收站。</p> : null}
      {restored === "1" ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">友链已恢复为草稿。</p> : null}
      {error === "trash_failed" ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">移入回收站失败，请稍后重试。</p> : null}
      {error === "restore_failed" ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">恢复友链失败，请稍后重试。</p> : null}

      {friendLinks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <p className="text-lg font-medium">还没有友链</p>
          <p className="mt-2 text-sm">先创建一条公开友链，补齐固定友链页内容。</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr className="text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                  <th className="px-4 py-3">站点名</th>
                  <th className="px-4 py-3">地址</th>
                  <th className="px-4 py-3">排序</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">更新时间</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {friendLinks.map((friendLink) => (
                  <tr key={friendLink.id} className="text-sm text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3 font-medium">
                      <Link className="hover:underline" href={`/${adminPath}/friend-links/${friendLink.id}`}>
                        {friendLink.siteName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-500 dark:text-slate-400">{friendLink.url}</td>
                    <td className="px-4 py-3 tabular-nums">{friendLink.sortOrder}</td>
                    <td className="px-4 py-3">{getStatusLabel(friendLink.status)}</td>
                    <td className="px-4 py-3">{friendLink.updatedAt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      {friendLink.status === "trash" ? (
                        <form action={restoreFriendLinkAction} className="inline-flex">
                          <input type="hidden" name="adminPath" value={adminPath} />
                          <input type="hidden" name="friendLinkId" value={friendLink.id} />
                          <button className="inline-flex items-center justify-center rounded-lg border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40" type="submit">恢复为草稿</button>
                        </form>
                      ) : (
                        <form action={moveFriendLinkToTrashAction} className="inline-flex">
                          <input type="hidden" name="adminPath" value={adminPath} />
                          <input type="hidden" name="friendLinkId" value={friendLink.id} />
                          <button className="inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40" type="submit">移入回收站</button>
                        </form>
                      )}
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

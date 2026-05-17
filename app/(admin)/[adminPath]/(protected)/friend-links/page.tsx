import Link from "next/link";

import { moveFriendLinkToTrashAction, restoreFriendLinkAction } from "./actions";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminPage, AdminPageHeader, AdminActionLink } from "@/components/admin/admin-page";
import { AdminEmptyState, AdminTableContainer } from "@/components/admin/admin-table";
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
    <AdminPage width="wide">
      <AdminPageHeader
        eyebrow="Friend Links"
        title="友链管理"
        description="结构化管理站点友链列表，控制公开页展示顺序、描述与 Logo。"
        actions={<AdminActionLink href={`/${adminPath}/friend-links/new`}>新建友链</AdminActionLink>}
      />

      {created === "1" ? <AdminNotice tone="success">友链已创建成功。</AdminNotice> : null}
      {updated === "1" ? <AdminNotice tone="success">友链已更新成功。</AdminNotice> : null}
      {trashed === "1" ? <AdminNotice tone="warning">友链已移入回收站。</AdminNotice> : null}
      {restored === "1" ? <AdminNotice tone="success">友链已恢复为草稿。</AdminNotice> : null}
      {error === "trash_failed" ? (
        <AdminNotice tone="error">移入回收站失败，请稍后重试。</AdminNotice>
      ) : null}
      {error === "restore_failed" ? (
        <AdminNotice tone="error">恢复友链失败，请稍后重试。</AdminNotice>
      ) : null}

      {friendLinks.length === 0 ? (
        <AdminEmptyState title="还没有友链" description="先创建一条公开友链，补齐固定友链页内容。" />
      ) : (
        <AdminTableContainer>
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
                  <td className="max-w-xs truncate px-4 py-3 text-slate-500 dark:text-slate-400">
                    {friendLink.url}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{friendLink.sortOrder}</td>
                  <td className="px-4 py-3">{getStatusLabel(friendLink.status)}</td>
                  <td className="px-4 py-3">{friendLink.updatedAt.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {friendLink.status === "trash" ? (
                      <form action={restoreFriendLinkAction} className="inline-flex">
                        <input type="hidden" name="adminPath" value={adminPath} />
                        <input type="hidden" name="friendLinkId" value={friendLink.id} />
                        <button
                          className="inline-flex items-center justify-center rounded-lg border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                          type="submit"
                        >
                          恢复为草稿
                        </button>
                      </form>
                    ) : (
                      <form action={moveFriendLinkToTrashAction} className="inline-flex">
                        <input type="hidden" name="adminPath" value={adminPath} />
                        <input type="hidden" name="friendLinkId" value={friendLink.id} />
                        <button
                          className="inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                          type="submit"
                        >
                          移入回收站
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableContainer>
      )}
    </AdminPage>
  );
}

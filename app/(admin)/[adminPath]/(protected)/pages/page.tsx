import Link from "next/link";

import { movePageToTrashAction, restorePageAction } from "./actions";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminPage, AdminPageHeader, AdminActionLink } from "@/components/admin/admin-page";
import { AdminEmptyState, AdminTableContainer } from "@/components/admin/admin-table";
import { listAdminPages } from "@/lib/admin/pages";

type AdminPagesPageProps = {
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

export default async function AdminPagesPage({ params, searchParams }: AdminPagesPageProps) {
  const [{ adminPath }, { created, updated, trashed, restored, error }] = await Promise.all([
    params,
    searchParams,
  ]);
  const pages = await listAdminPages();

  return (
    <AdminPage width="wide">
      <AdminPageHeader
        eyebrow="Pages"
        title="页面管理"
        description="管理站点独立页面，例如关于页或联系页。专用友链请使用独立的友链管理模块。"
        actions={<AdminActionLink href={`/${adminPath}/pages/new`}>新建页面</AdminActionLink>}
      />

      {created === "1" ? <AdminNotice tone="success">页面已创建成功。</AdminNotice> : null}
      {updated === "1" ? <AdminNotice tone="success">页面已更新成功。</AdminNotice> : null}
      {trashed === "1" ? <AdminNotice tone="warning">页面已移入回收站。</AdminNotice> : null}
      {restored === "1" ? <AdminNotice tone="success">页面已恢复为草稿。</AdminNotice> : null}
      {error === "trash_failed" ? (
        <AdminNotice tone="error">移入回收站失败，请稍后重试。</AdminNotice>
      ) : null}
      {error === "restore_failed" ? (
        <AdminNotice tone="error">恢复页面失败，请稍后重试。</AdminNotice>
      ) : null}

      {pages.length === 0 ? (
        <AdminEmptyState title="还没有页面" description="先创建一个关于页或联系页，补齐站点固定内容。" />
      ) : (
        <AdminTableContainer>
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr className="text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                <th className="px-4 py-3">标题</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">更新时间</th>
                <th className="px-4 py-3">发布时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
              {pages.map((page) => (
                <tr key={page.id} className="text-sm text-slate-700 dark:text-slate-200">
                  <td className="px-4 py-3 font-medium">
                    <Link className="hover:underline" href={`/${adminPath}/pages/${page.id}`}>
                      {page.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{page.slug}</td>
                  <td className="px-4 py-3">{getStatusLabel(page.status)}</td>
                  <td className="px-4 py-3">{page.updatedAt.toLocaleString()}</td>
                  <td className="px-4 py-3">{page.publishedAt ? page.publishedAt.toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {page.status === "trash" ? (
                      <form action={restorePageAction} className="inline-flex">
                        <input type="hidden" name="adminPath" value={adminPath} />
                        <input type="hidden" name="pageId" value={page.id} />
                        <button className="inline-flex items-center justify-center rounded-lg border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40" type="submit">恢复为草稿</button>
                      </form>
                    ) : (
                      <form action={movePageToTrashAction} className="inline-flex">
                        <input type="hidden" name="adminPath" value={adminPath} />
                        <input type="hidden" name="pageId" value={page.id} />
                        <button className="inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40" type="submit">移入回收站</button>
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

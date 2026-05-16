import Link from "next/link";

import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminActionLink, AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminEmptyState, AdminTableContainer } from "@/components/admin/admin-table";
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
    <AdminPage width="wide">
      <AdminPageHeader
        actions={<AdminActionLink href={`/${adminPath}/site-navigation/new`}>新建导航项</AdminActionLink>}
        description="管理公开页头导航入口，控制显示、顺序与跳转目标。"
        eyebrow="Site Navigation"
        title="站点导航"
      />

      {created === "1" ? <AdminNotice tone="success">导航项已创建成功。</AdminNotice> : null}
      {updated === "1" ? <AdminNotice tone="success">导航项已更新成功。</AdminNotice> : null}
      {deleted === "1" ? <AdminNotice tone="warning">导航项已删除。</AdminNotice> : null}
      {error === "delete_failed" ? (
        <AdminNotice tone="error">删除导航项失败，请稍后重试。</AdminNotice>
      ) : null}

      {items.length === 0 ? (
        <AdminEmptyState title="还没有导航项" description="先创建一个公开页头导航入口，例如关于页、友链或站内专题。" />
      ) : (
        <AdminTableContainer>
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr className="text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                <th className="px-4 py-3" scope="col">文案</th>
                <th className="px-4 py-3" scope="col">链接</th>
                <th className="px-4 py-3" scope="col">排序</th>
                <th className="px-4 py-3" scope="col">可见</th>
                <th className="px-4 py-3" scope="col">新标签页</th>
                <th className="px-4 py-3" scope="col">更新时间</th>
                <th className="px-4 py-3 text-right" scope="col">操作</th>
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
                  <td className="max-w-xs truncate px-4 py-3 text-slate-500 dark:text-slate-400">{item.url}</td>
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
        </AdminTableContainer>
      )}
    </AdminPage>
  );
}

import Link from "next/link";

import { deleteTagAction } from "./actions";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminPage, AdminPageHeader, AdminActionLink } from "@/components/admin/admin-page";
import { AdminEmptyState, AdminTableContainer } from "@/components/admin/admin-table";
import { listAdminTaxonomies } from "@/lib/admin/taxonomies";

type AdminTagsPageProps = {
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

export default async function AdminTagsPage({ params, searchParams }: AdminTagsPageProps) {
  const [{ adminPath }, { created, updated, deleted, error }] = await Promise.all([
    params,
    searchParams,
  ]);
  const tags = await listAdminTaxonomies("tag");

  return (
    <AdminPage width="wide">
      <AdminPageHeader
        eyebrow="Tags"
        title="标签管理"
        description="在这里维护文章标签，供前台标签归档页与文章编辑表单使用。"
        actions={<AdminActionLink href={`/${adminPath}/tags/new`}>新建标签</AdminActionLink>}
      />

      {created === "1" ? <AdminNotice tone="success">标签已创建成功。</AdminNotice> : null}
      {updated === "1" ? <AdminNotice tone="success">标签已更新成功。</AdminNotice> : null}
      {deleted === "1" ? <AdminNotice tone="warning">标签已删除。</AdminNotice> : null}
      {error === "delete_failed" ? (
        <AdminNotice tone="error">删除标签失败，请确认该标签未被文章引用后重试。</AdminNotice>
      ) : null}

      {tags.length === 0 ? (
        <AdminEmptyState title="还没有标签" description="创建标签后，文章创建页会自动显示可选项。" />
      ) : (
        <AdminTableContainer>
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr className="text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                <th className="px-4 py-3">名称</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">文章数</th>
                <th className="px-4 py-3">更新时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
              {tags.map((tag) => (
                <tr key={tag.id} className="text-sm text-slate-700 dark:text-slate-200">
                  <td className="px-4 py-3 font-medium">
                    <Link className="hover:underline" href={`/${adminPath}/tags/${tag.id}`}>
                      {tag.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {tag.slug}
                  </td>
                  <td className="px-4 py-3">{tag.usageCount}</td>
                  <td className="px-4 py-3">{tag.updatedAt.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                        href={`/${adminPath}/tags/${tag.id}`}
                      >
                        编辑
                      </Link>
                      <form action={deleteTagAction} className="inline-flex">
                        <input type="hidden" name="adminPath" value={adminPath} />
                        <input type="hidden" name="taxonomyId" value={tag.id} />
                        <input type="hidden" name="slug" value={tag.slug} />
                        <button
                          className="inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                          type="submit"
                          disabled={tag.usageCount > 0}
                          title={tag.usageCount > 0 ? "仍有关联文章，无法删除。" : "删除标签"}
                        >
                          删除
                        </button>
                      </form>
                    </div>
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

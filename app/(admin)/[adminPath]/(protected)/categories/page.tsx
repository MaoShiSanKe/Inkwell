import Link from "next/link";

import { deleteCategoryAction } from "./actions";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminPage, AdminPageHeader, AdminActionLink } from "@/components/admin/admin-page";
import { AdminEmptyState, AdminTableContainer } from "@/components/admin/admin-table";
import { listAdminTaxonomies } from "@/lib/admin/taxonomies";

type AdminCategoriesPageProps = {
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

export default async function AdminCategoriesPage({
  params,
  searchParams,
}: AdminCategoriesPageProps) {
  const [{ adminPath }, { created, updated, deleted, error }] = await Promise.all([
    params,
    searchParams,
  ]);
  const categories = await listAdminTaxonomies("category");

  return (
    <AdminPage width="wide">
      <AdminPageHeader
        eyebrow="Categories"
        title="分类管理"
        description="在这里维护文章分类、父子层级与前台归档所依赖的基础信息。"
        actions={<AdminActionLink href={`/${adminPath}/categories/new`}>新建分类</AdminActionLink>}
      />

      {created === "1" ? <AdminNotice tone="success">分类已创建成功。</AdminNotice> : null}
      {updated === "1" ? <AdminNotice tone="success">分类已更新成功。</AdminNotice> : null}
      {deleted === "1" ? <AdminNotice tone="warning">分类已删除。</AdminNotice> : null}
      {error === "delete_failed" ? (
        <AdminNotice tone="error">删除分类失败，请确认该分类未被文章或子分类引用后重试。</AdminNotice>
      ) : null}

      {categories.length === 0 ? (
        <AdminEmptyState title="还没有分类" description="创建分类后，文章表单就可以直接选择它们。" />
      ) : (
        <AdminTableContainer>
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr className="text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                <th className="px-4 py-3">名称</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">父分类</th>
                <th className="px-4 py-3">文章数</th>
                <th className="px-4 py-3">子分类</th>
                <th className="px-4 py-3">更新时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
              {categories.map((category) => {
                const deleteDisabled = category.usageCount > 0 || category.childCount > 0;

                return (
                  <tr key={category.id} className="text-sm text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3 font-medium">
                      <Link className="hover:underline" href={`/${adminPath}/categories/${category.id}`}>
                        {category.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {category.slug}
                    </td>
                    <td className="px-4 py-3">{category.parentName ?? "—"}</td>
                    <td className="px-4 py-3">{category.usageCount}</td>
                    <td className="px-4 py-3">{category.childCount}</td>
                    <td className="px-4 py-3">{category.updatedAt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                          href={`/${adminPath}/categories/${category.id}`}
                        >
                          编辑
                        </Link>
                        <form action={deleteCategoryAction} className="inline-flex">
                          <input type="hidden" name="adminPath" value={adminPath} />
                          <input type="hidden" name="taxonomyId" value={category.id} />
                          <input type="hidden" name="slug" value={category.slug} />
                          <button
                            className="inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                            type="submit"
                            disabled={deleteDisabled}
                            title={deleteDisabled ? "仍有关联文章或子分类，无法删除。" : "删除分类"}
                          >
                            删除
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTableContainer>
      )}
    </AdminPage>
  );
}

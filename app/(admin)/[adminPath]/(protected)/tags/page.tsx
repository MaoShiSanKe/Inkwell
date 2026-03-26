import Link from "next/link";

import { deleteTagAction } from "./actions";
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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Tags
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">标签管理</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            在这里维护文章标签，供前台标签归档页与文章编辑表单使用。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          href={`/${adminPath}/tags/new`}
        >
          新建标签
        </Link>
      </div>

      {created === "1" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          标签已创建成功。
        </p>
      ) : null}

      {updated === "1" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          标签已更新成功。
        </p>
      ) : null}

      {deleted === "1" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          标签已删除。
        </p>
      ) : null}

      {error === "delete_failed" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          删除标签失败，请确认该标签未被文章引用后重试。
        </p>
      ) : null}

      {tags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <p className="text-lg font-medium">还没有标签</p>
          <p className="mt-2 text-sm">创建标签后，文章创建页会自动显示可选项。</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
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
          </div>
        </div>
      )}
    </main>
  );
}

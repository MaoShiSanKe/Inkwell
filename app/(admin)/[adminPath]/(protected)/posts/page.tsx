import Link from "next/link";

import { listAdminPosts } from "@/lib/admin/posts";

type AdminPostsPageProps = {
  params: Promise<{
    adminPath: string;
  }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
  }>;
};

function getStatusLabel(status: "draft" | "published" | "scheduled" | "trash") {
  switch (status) {
    case "draft":
      return "草稿";
    case "published":
      return "已发布";
    case "scheduled":
      return "定时";
    case "trash":
      return "回收站";
  }
}

export default async function AdminPostsPage({
  params,
  searchParams,
}: AdminPostsPageProps) {
  const [{ adminPath }, { created, updated }] = await Promise.all([
    params,
    searchParams,
  ]);
  const posts = await listAdminPosts();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Posts
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">文章管理</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            在这里查看文章列表，并创建新的文章草稿或已发布文章。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          href={`/${adminPath}/posts/new`}
        >
          新建文章
        </Link>
      </div>

      {created === "1" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          文章已创建成功。
        </p>
      ) : null}

      {updated === "1" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          文章已更新成功。
        </p>
      ) : null}

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <p className="text-lg font-medium">还没有文章</p>
          <p className="mt-2 text-sm">从第一篇文章开始搭建你的 Inkwell 内容库。</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr className="text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                  <th className="px-4 py-3">标题</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">分类</th>
                  <th className="px-4 py-3">作者</th>
                  <th className="px-4 py-3">更新时间</th>
                  <th className="px-4 py-3">发布时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {posts.map((post) => (
                  <tr key={post.id} className="text-sm text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3 font-medium">
                      <Link className="hover:underline" href={`/${adminPath}/posts/${post.id}`}>
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {post.slug}
                    </td>
                    <td className="px-4 py-3">{getStatusLabel(post.status)}</td>
                    <td className="px-4 py-3">{post.categoryName ?? "—"}</td>
                    <td className="px-4 py-3">{post.authorDisplayName} ({post.authorUsername})</td>
                    <td className="px-4 py-3">{post.updatedAt.toLocaleString()}</td>
                    <td className="px-4 py-3">{post.publishedAt ? post.publishedAt.toLocaleString() : "—"}</td>
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

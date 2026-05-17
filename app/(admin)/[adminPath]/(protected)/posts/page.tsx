import Link from "next/link";

import { movePostToTrashAction, restorePostAction } from "./actions";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminPage, AdminPageHeader, AdminActionLink } from "@/components/admin/admin-page";
import { AdminEmptyState, AdminTableContainer } from "@/components/admin/admin-table";
import { listAdminPosts } from "@/lib/admin/posts";

type AdminPostsPageProps = {
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
  const [{ adminPath }, { created, updated, trashed, restored, error }] = await Promise.all([
    params,
    searchParams,
  ]);
  const posts = await listAdminPosts();

  return (
    <AdminPage width="wide">
      <AdminPageHeader
        eyebrow="Posts"
        title="文章管理"
        description="在这里查看文章列表，并创建新的文章草稿或已发布文章。"
        actions={<AdminActionLink href={`/${adminPath}/posts/new`}>新建文章</AdminActionLink>}
      />

      {created === "1" ? <AdminNotice tone="success">文章已创建成功。</AdminNotice> : null}
      {updated === "1" ? <AdminNotice tone="success">文章已更新成功。</AdminNotice> : null}
      {trashed === "1" ? <AdminNotice tone="warning">文章已移入回收站。</AdminNotice> : null}
      {restored === "1" ? <AdminNotice tone="success">文章已恢复为草稿。</AdminNotice> : null}
      {error === "trash_failed" ? (
        <AdminNotice tone="error">移入回收站失败，请稍后重试。</AdminNotice>
      ) : null}
      {error === "restore_failed" ? (
        <AdminNotice tone="error">恢复文章失败，请稍后重试。</AdminNotice>
      ) : null}

      {posts.length === 0 ? (
        <AdminEmptyState
          title="还没有文章"
          description="从第一篇文章开始搭建你的 Inkwell 内容库。"
        />
      ) : (
        <AdminTableContainer>
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr className="text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                <th className="px-4 py-3">标题</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">分类</th>
                <th className="px-4 py-3">作者</th>
                <th className="px-4 py-3 text-right">浏览</th>
                <th className="px-4 py-3 text-right">点赞</th>
                <th className="px-4 py-3">更新时间</th>
                <th className="px-4 py-3">发布时间</th>
                <th className="px-4 py-3 text-right">操作</th>
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
                  <td className="px-4 py-3 text-right tabular-nums">{post.viewCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{post.likeCount}</td>
                  <td className="px-4 py-3">{post.updatedAt.toLocaleString()}</td>
                  <td className="px-4 py-3">{post.publishedAt ? post.publishedAt.toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {post.status === "trash" ? (
                      <form action={restorePostAction} className="inline-flex">
                        <input type="hidden" name="adminPath" value={adminPath} />
                        <input type="hidden" name="postId" value={post.id} />
                        <button
                          className="inline-flex items-center justify-center rounded-lg border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                          type="submit"
                        >
                          恢复为草稿
                        </button>
                      </form>
                    ) : (
                      <form action={movePostToTrashAction} className="inline-flex">
                        <input type="hidden" name="adminPath" value={adminPath} />
                        <input type="hidden" name="postId" value={post.id} />
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

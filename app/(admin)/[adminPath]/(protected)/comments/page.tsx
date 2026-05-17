import Link from "next/link";

import {
  approveCommentAction,
  markCommentAsSpamAction,
  moveCommentToTrashAction,
  restoreCommentAction,
} from "./actions";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminEmptyState, AdminTableContainer } from "@/components/admin/admin-table";
import { listAdminComments } from "@/lib/admin/comments";

type AdminCommentsPageProps = {
  params: Promise<{
    adminPath: string;
  }>;
  searchParams: Promise<{
    approved?: string;
    spam?: string;
    trashed?: string;
    restored?: string;
    error?: string;
  }>;
};

function getStatusLabel(status: "pending" | "approved" | "spam" | "trash") {
  switch (status) {
    case "pending":
      return "待审核";
    case "approved":
      return "已通过";
    case "spam":
      return "垃圾评论";
    case "trash":
      return "回收站";
  }
}

export default async function AdminCommentsPage({
  params,
  searchParams,
}: AdminCommentsPageProps) {
  const [{ adminPath }, { approved, spam, trashed, restored, error }] = await Promise.all([
    params,
    searchParams,
  ]);
  const comments = await listAdminComments();

  return (
    <AdminPage width="wide">
      <AdminPageHeader
        eyebrow="Comments"
        title="评论管理"
        description="在这里查看评论审核队列，并完成批准、标记垃圾或回收站恢复等基础操作。"
      />

      {approved === "1" ? <AdminNotice tone="success">评论已批准并公开展示。</AdminNotice> : null}
      {spam === "1" ? <AdminNotice tone="warning">评论已标记为垃圾。</AdminNotice> : null}
      {trashed === "1" ? <AdminNotice tone="warning">评论已移入回收站。</AdminNotice> : null}
      {restored === "1" ? <AdminNotice tone="success">评论已恢复为待审核状态。</AdminNotice> : null}
      {error === "approve_failed" ? (
        <AdminNotice tone="error">批准评论失败，请刷新后重试。</AdminNotice>
      ) : null}
      {error === "spam_failed" ? (
        <AdminNotice tone="error">标记垃圾失败，请刷新后重试。</AdminNotice>
      ) : null}
      {error === "trash_failed" ? (
        <AdminNotice tone="error">移入回收站失败，请刷新后重试。</AdminNotice>
      ) : null}
      {error === "restore_failed" ? (
        <AdminNotice tone="error">恢复评论失败，请刷新后重试。</AdminNotice>
      ) : null}

      {comments.length === 0 ? (
        <AdminEmptyState title="还没有评论" description="前台提交评论后，会在这里进入审核流程。" />
      ) : (
        <AdminTableContainer>
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr className="text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                <th scope="col" className="px-4 py-3">作者</th>
                <th scope="col" className="px-4 py-3">文章</th>
                <th scope="col" className="px-4 py-3">层级</th>
                <th scope="col" className="px-4 py-3">状态</th>
                <th scope="col" className="px-4 py-3">内容</th>
                <th scope="col" className="px-4 py-3">创建时间</th>
                <th scope="col" className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
              {comments.map((comment) => (
                <tr key={comment.id} className="align-top text-sm text-slate-700 dark:text-slate-200">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{comment.authorName}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {comment.authorEmail}
                      </span>
                      {comment.authorUrl ? (
                        <a
                          className="text-xs text-slate-500 underline underline-offset-4 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                          href={comment.authorUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          查看主页
                          <span className="sr-only">（在新窗口打开）</span>
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="font-medium hover:underline" href={`/post/${comment.postSlug}`}>
                      {comment.postTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {comment.level === 1 ? "顶层评论" : `二级回复 · 回复 #${comment.parentId}`}
                  </td>
                  <td className="px-4 py-3">{getStatusLabel(comment.status)}</td>
                  <td className="max-w-md px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm leading-6">{comment.content}</p>
                  </td>
                  <td className="px-4 py-3">{comment.createdAt.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {comment.status === "pending" ? (
                        <>
                          <form action={approveCommentAction} className="inline-flex">
                            <input type="hidden" name="adminPath" value={adminPath} />
                            <input type="hidden" name="commentId" value={comment.id} />
                            <button
                              className="inline-flex items-center justify-center rounded-lg border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                              type="submit"
                            >
                              批准
                            </button>
                          </form>
                          <form action={markCommentAsSpamAction} className="inline-flex">
                            <input type="hidden" name="adminPath" value={adminPath} />
                            <input type="hidden" name="commentId" value={comment.id} />
                            <button
                              className="inline-flex items-center justify-center rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                              type="submit"
                            >
                              垃圾
                            </button>
                          </form>
                          <form action={moveCommentToTrashAction} className="inline-flex">
                            <input type="hidden" name="adminPath" value={adminPath} />
                            <input type="hidden" name="commentId" value={comment.id} />
                            <button
                              className="inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                              type="submit"
                            >
                              回收站
                            </button>
                          </form>
                        </>
                      ) : null}

                      {comment.status === "approved" ? (
                        <>
                          <form action={markCommentAsSpamAction} className="inline-flex">
                            <input type="hidden" name="adminPath" value={adminPath} />
                            <input type="hidden" name="commentId" value={comment.id} />
                            <button
                              className="inline-flex items-center justify-center rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                              type="submit"
                            >
                              垃圾
                            </button>
                          </form>
                          <form action={moveCommentToTrashAction} className="inline-flex">
                            <input type="hidden" name="adminPath" value={adminPath} />
                            <input type="hidden" name="commentId" value={comment.id} />
                            <button
                              className="inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                              type="submit"
                            >
                              回收站
                            </button>
                          </form>
                        </>
                      ) : null}

                      {comment.status === "spam" ? (
                        <>
                          <form action={approveCommentAction} className="inline-flex">
                            <input type="hidden" name="adminPath" value={adminPath} />
                            <input type="hidden" name="commentId" value={comment.id} />
                            <button
                              className="inline-flex items-center justify-center rounded-lg border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                              type="submit"
                            >
                              批准
                            </button>
                          </form>
                          <form action={moveCommentToTrashAction} className="inline-flex">
                            <input type="hidden" name="adminPath" value={adminPath} />
                            <input type="hidden" name="commentId" value={comment.id} />
                            <button
                              className="inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                              type="submit"
                            >
                              回收站
                            </button>
                          </form>
                        </>
                      ) : null}

                      {comment.status === "trash" ? (
                        <form action={restoreCommentAction} className="inline-flex">
                          <input type="hidden" name="adminPath" value={adminPath} />
                          <input type="hidden" name="commentId" value={comment.id} />
                          <button
                            className="inline-flex items-center justify-center rounded-lg border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                            type="submit"
                          >
                            恢复为待审核
                          </button>
                        </form>
                      ) : null}
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

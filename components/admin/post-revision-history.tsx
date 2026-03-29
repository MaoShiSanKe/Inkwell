"use client";

import { restorePostRevisionAction } from "@/app/(admin)/[adminPath]/(protected)/posts/actions";
import type { AdminPostRevisionItem } from "@/lib/admin/posts";

type PostRevisionHistoryProps = {
  adminPath: string;
  postId: number;
  revisions: AdminPostRevisionItem[];
};

export function PostRevisionHistory({
  adminPath,
  postId,
  revisions,
}: PostRevisionHistoryProps) {
  return (
    <section className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">修订历史</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          查看最近保存的文章快照，必要时可将某条修订恢复为当前草稿。
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {revisions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">当前还没有可用的修订记录。</p>
        ) : (
          revisions.map((revision) => (
            <details
              key={revision.id}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {revision.status}
                      </span>
                      {revision.reason ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {revision.reason}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {revision.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(revision.createdAt).toLocaleString()} · {revision.editorDisplayName ?? revision.editorUsername ?? "未知编辑者"}
                    </p>
                  </div>

                  <form action={restorePostRevisionAction}>
                    <input type="hidden" name="adminPath" value={adminPath} />
                    <input type="hidden" name="postId" value={postId} />
                    <input type="hidden" name="revisionId" value={revision.id} />
                    <button
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                      type="submit"
                    >
                      恢复为当前草稿
                    </button>
                  </form>
                </div>
              </summary>

              <div className="mt-4 flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    摘要
                  </p>
                  <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {revision.excerpt?.trim() || "（空）"}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    正文快照
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-xs leading-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    {revision.content}
                  </pre>
                </div>
              </div>
            </details>
          ))
        )}
      </div>
    </section>
  );
}

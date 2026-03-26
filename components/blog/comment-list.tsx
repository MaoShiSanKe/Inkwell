import Link from "next/link";

import type { ApprovedComment } from "@/lib/blog/comments";

type CommentListProps = {
  comments: ApprovedComment[];
  postSlug: string;
};

function AuthorLink({ authorName, authorUrl }: { authorName: string; authorUrl: string | null }) {
  if (!authorUrl) {
    return <span>{authorName}</span>;
  }

  return (
    <a
      className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-700 dark:hover:decoration-slate-400"
      href={authorUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      {authorName}
      <span className="sr-only">（在新窗口打开）</span>
    </a>
  );
}

export function CommentList({ comments, postSlug }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <p className="text-lg font-medium">还没有评论</p>
        <p className="mt-2 text-sm">欢迎留下第一条评论，和作者开始交流。</p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {comments.map((comment) => (
        <li key={comment.id} className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 text-sm text-slate-500 dark:text-slate-400">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                <AuthorLink authorName={comment.authorName} authorUrl={comment.authorUrl} />
              </p>
              <p>
                <time dateTime={comment.createdAt.toISOString()}>
                  {comment.createdAt.toLocaleString()}
                </time>
              </p>
            </div>
            <p className="text-sm leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
              {comment.content}
            </p>
            <div>
              <Link
                className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                href={`/post/${postSlug}?replyTo=${comment.id}#comment-form`}
              >
                回复
              </Link>
            </div>
          </div>

          {comment.replies.length > 0 ? (
            <ol className="mt-4 flex flex-col gap-3 border-l border-slate-200 pl-4 dark:border-slate-800 sm:ml-6 sm:pl-6">
              {comment.replies.map((reply) => (
                <li
                  key={reply.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1 text-sm text-slate-500 dark:text-slate-400">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        <AuthorLink authorName={reply.authorName} authorUrl={reply.authorUrl} />
                      </p>
                      <p>
                        <time dateTime={reply.createdAt.toISOString()}>
                          {reply.createdAt.toLocaleString()}
                        </time>
                      </p>
                    </div>
                    <p className="text-sm leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                      {reply.content}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

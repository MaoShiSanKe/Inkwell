import Link from "next/link";

import type { ApprovedComment } from "@/lib/blog/comments";
import type { PublicAccentTheme, PublicSurfaceVariant } from "@/lib/settings-config";
import { resolveAccentClass, resolveSurfaceClass } from "@/lib/theme";

type CommentListProps = {
  comments: ApprovedComment[];
  postSlug: string;
  accentTheme?: PublicAccentTheme;
  surfaceVariant?: PublicSurfaceVariant;
};

function AuthorLink({
  authorName,
  authorUrl,
  accentClass,
}: {
  authorName: string;
  authorUrl: string | null;
  accentClass: string;
}) {
  if (!authorUrl) {
    return <span>{authorName}</span>;
  }

  return (
    <a
      className={`underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-700 dark:hover:decoration-slate-400 ${accentClass}`}
      href={authorUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      {authorName}
      <span className="sr-only">（在新窗口打开）</span>
    </a>
  );
}

export function CommentList({
  comments,
  postSlug,
  accentTheme = "slate",
  surfaceVariant = "soft",
}: CommentListProps) {
  const accentClass = resolveAccentClass(accentTheme);
  const surfaceClass = resolveSurfaceClass(surfaceVariant);
  const emptyStateClass =
    surfaceVariant === "solid"
      ? "rounded-2xl border border-dashed border-slate-300 bg-slate-100/70 px-6 py-10 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
      : "rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300";
  const replyLinkClass = `text-sm font-medium underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-700 dark:hover:decoration-slate-400 ${accentClass}`;
  const replySurfaceClass =
    surfaceVariant === "solid"
      ? "rounded-2xl border border-slate-300 bg-slate-100/70 p-4 dark:border-slate-700 dark:bg-slate-900/70"
      : "rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/70";

  if (comments.length === 0) {
    return (
      <div className={emptyStateClass}>
        <p className={`text-lg font-medium ${accentClass}`}>还没有评论</p>
        <p className="mt-2 text-sm">欢迎留下第一条评论，和作者开始交流。</p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {comments.map((comment) => (
        <li key={comment.id} className={`rounded-2xl border p-5 ${surfaceClass}`}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 text-sm text-slate-500 dark:text-slate-400">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                <AuthorLink
                  authorName={comment.authorName}
                  authorUrl={comment.authorUrl}
                  accentClass={accentClass}
                />
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
              <Link className={replyLinkClass} href={`/post/${postSlug}?replyTo=${comment.id}#comment-form`}>
                回复
              </Link>
            </div>
          </div>

          {comment.replies.length > 0 ? (
            <ol className="mt-4 flex flex-col gap-3 border-l border-slate-200 pl-4 dark:border-slate-800 sm:ml-6 sm:pl-6">
              {comment.replies.map((reply) => (
                <li key={reply.id} className={replySurfaceClass}>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1 text-sm text-slate-500 dark:text-slate-400">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        <AuthorLink
                          authorName={reply.authorName}
                          authorUrl={reply.authorUrl}
                          accentClass={accentClass}
                        />
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

"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { submitCommentAction } from "@/app/(blog)/post/[slug]/actions";
import { createCommentFormState } from "@/lib/blog/comment-form";
import type { PublicAccentTheme, PublicSurfaceVariant } from "@/lib/settings-config";
import { resolveAccentClass, resolveSurfaceClass } from "@/lib/theme";

type CommentFormProps = {
  postId: number;
  postSlug: string;
  accentTheme?: PublicAccentTheme;
  surfaceVariant?: PublicSurfaceVariant;
  replyTarget?: {
    id: number;
    authorName: string;
  } | null;
};

export function CommentForm({
  postId,
  postSlug,
  accentTheme = "slate",
  surfaceVariant = "soft",
  replyTarget = null,
}: CommentFormProps) {
  const router = useRouter();
  const initialState = createCommentFormState({
    postId: String(postId),
    parentId: replyTarget ? String(replyTarget.id) : "",
  });
  const [state = initialState, formAction, isPending] = useActionState(
    submitCommentAction,
    initialState,
  );
  const formKey = `${state.submissionStatus}:${replyTarget?.id ?? "top-level"}:${state.message ?? "idle"}`;
  const surfaceClass = resolveSurfaceClass(surfaceVariant);
  const accentClass = resolveAccentClass(accentTheme);
  const fieldSurfaceClass =
    surfaceVariant === "solid"
      ? "border-slate-300 bg-slate-100/90 dark:border-slate-700 dark:bg-slate-900/90"
      : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950";
  const buttonSurfaceClass =
    "bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300";
  const inputAccentBorderClass =
    accentTheme === "blue"
      ? "focus:border-blue-500"
      : accentTheme === "emerald"
        ? "focus:border-emerald-500"
        : accentTheme === "amber"
          ? "focus:border-amber-500"
          : "focus:border-slate-500";
  const buttonAccentRingClass =
    accentTheme === "blue"
      ? "focus-visible:ring-blue-500/40"
      : accentTheme === "emerald"
        ? "focus-visible:ring-emerald-500/40"
        : accentTheme === "amber"
          ? "focus-visible:ring-amber-500/40"
          : "focus-visible:ring-slate-500/40";
  const inputClass = `rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-slate-400 dark:text-slate-100 ${fieldSurfaceClass} ${inputAccentBorderClass}`;
  const textAreaClass = `min-h-36 rounded-lg border px-3 py-2 text-sm leading-7 outline-none placeholder:text-slate-400 dark:text-slate-100 ${fieldSurfaceClass} ${inputAccentBorderClass}`;
  const buttonClass = `inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${buttonSurfaceClass} ${buttonAccentRingClass}`;
  const replyLinkClass = `text-sm font-medium underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-700 dark:hover:decoration-slate-400 ${accentClass}`;

  useEffect(() => {
    if (state.submissionStatus === "approved") {
      router.refresh();
    }
  }, [router, state.submissionStatus]);

  return (
    <form
      key={formKey}
      id="comment-form"
      action={formAction}
      className={`flex flex-col gap-6 rounded-2xl border p-6 ${surfaceClass}`}
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="parentId" value={replyTarget ? replyTarget.id : ""} />

      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {replyTarget ? "回复评论" : "发表评论"}
        </h3>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {replyTarget
            ? `当前正在回复 ${replyTarget.authorName}。系统仅支持两层评论嵌套。`
            : "填写昵称、邮箱和评论内容后即可提交。"}
        </p>
        {replyTarget ? (
          <div>
            <Link className={replyLinkClass} href={`/post/${postSlug}#comment-form`}>
              取消回复
            </Link>
          </div>
        ) : null}
      </div>

      {state.message ? (
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={
            state.submissionStatus === "approved"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          }
        >
          {state.message}
        </p>
      ) : null}

      {state.errors.form ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {state.errors.form}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          昵称
          <input
            className={inputClass}
            type="text"
            name="authorName"
            defaultValue={state.values.authorName}
            required
          />
          {state.errors.authorName ? (
            <span className="text-sm text-red-600 dark:text-red-300">{state.errors.authorName}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          邮箱
          <input
            className={inputClass}
            type="email"
            name="authorEmail"
            defaultValue={state.values.authorEmail}
            required
          />
          {state.errors.authorEmail ? (
            <span className="text-sm text-red-600 dark:text-red-300">{state.errors.authorEmail}</span>
          ) : null}
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        个人主页
        <input
          className={inputClass}
          type="url"
          name="authorUrl"
          defaultValue={state.values.authorUrl}
          placeholder="https://example.com"
        />
        {state.errors.authorUrl ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.authorUrl}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        评论内容
        <textarea
          className={textAreaClass}
          name="content"
          defaultValue={state.values.content}
          placeholder={replyTarget ? "写下你的回复内容..." : "写下你的评论内容..."}
          required
        />
        {state.errors.content ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.content}</span>
        ) : null}
      </label>

      <div className="flex items-center gap-3">
        <button className={buttonClass} type="submit" disabled={isPending}>
          {isPending ? "提交中..." : replyTarget ? "提交回复" : "提交评论"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";

import { likePostAction } from "@/app/(blog)/post/[slug]/actions";

type PostLikeButtonProps = {
  postId: number;
  postSlug: string;
  initialLikeCount: number;
};

export function PostLikeButton({ postId, postSlug, initialLikeCount }: PostLikeButtonProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight">点赞</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            当前共有 {likeCount} 次点赞。
          </p>
        </div>
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const formData = new FormData();
              formData.set("postId", String(postId));
              formData.set("postSlug", postSlug);

              const result = await likePostAction(formData);

              if (!result.success) {
                setMessage(result.error);
                return;
              }

              setLikeCount(result.likeCount);
              setMessage(result.alreadyLiked ? "你已经点过赞了。" : "点赞成功。");
            });
          }}
          type="button"
        >
          {isPending ? "提交中..." : "点赞"}
        </button>
      </div>
      {message ? <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p> : null}
    </div>
  );
}

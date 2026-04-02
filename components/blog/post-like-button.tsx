"use client";

import { useState, useTransition } from "react";

import { likePostAction } from "@/app/(blog)/post/[slug]/actions";
import type { PublicAccentTheme, PublicSurfaceVariant } from "@/lib/settings-config";
import { resolveAccentClass, resolveSurfaceClass } from "@/lib/theme";

type PostLikeButtonProps = {
  postId: number;
  postSlug: string;
  initialLikeCount: number;
  accentTheme?: PublicAccentTheme;
  surfaceVariant?: PublicSurfaceVariant;
};

export function PostLikeButton({
  postId,
  postSlug,
  initialLikeCount,
  accentTheme = "slate",
  surfaceVariant = "soft",
}: PostLikeButtonProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const surfaceClass = resolveSurfaceClass(surfaceVariant);
  const accentClass = resolveAccentClass(accentTheme);
  const buttonSurfaceClass =
    "bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300";
  const buttonAccentRingClass =
    accentTheme === "blue"
      ? "focus-visible:ring-blue-500/40"
      : accentTheme === "emerald"
        ? "focus-visible:ring-emerald-500/40"
        : accentTheme === "amber"
          ? "focus-visible:ring-amber-500/40"
          : "focus-visible:ring-slate-500/40";
  const buttonClass = `rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${buttonSurfaceClass} ${buttonAccentRingClass}`;
  const messageClass = `text-sm ${accentClass}`;

  return (
    <div className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 ${surfaceClass}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight">点赞</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            当前共有 {likeCount} 次点赞。
          </p>
        </div>
        <button
          className={buttonClass}
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
      {message ? <p className={messageClass}>{message}</p> : null}
    </div>
  );
}

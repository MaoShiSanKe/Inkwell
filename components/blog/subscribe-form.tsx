"use client";

import { useActionState } from "react";

import { subscribeAction } from "@/app/(blog)/subscribe/actions";
import { initialSubscriptionFormState } from "@/lib/blog/subscription-form";

type SubscribeFormProps = {
  initialEmail?: string;
};

export function SubscribeForm({ initialEmail = "" }: SubscribeFormProps) {
  const [state = initialSubscriptionFormState, formAction, isPending] = useActionState(
    subscribeAction,
    {
      ...initialSubscriptionFormState,
      values: {
        ...initialSubscriptionFormState.values,
        email: initialEmail,
      },
    },
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          订阅新文章通知
        </h2>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          填写邮箱后，当站点发布新文章时会通过邮件通知你。你可以稍后随时退订。
        </p>
      </div>

      {state.message ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
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

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        昵称
        <input
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          type="text"
          name="displayName"
          defaultValue={state.values.displayName}
          placeholder="可选，不填则自动生成显示名"
        />
        {state.errors.displayName ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.displayName}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        邮箱
        <input
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          type="email"
          name="email"
          defaultValue={state.values.email}
          placeholder="reader@example.com"
          required
        />
        {state.errors.email ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.email}</span>
        ) : null}
      </label>

      <button
        className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "提交中..." : "订阅邮件通知"}
      </button>
    </form>
  );
}

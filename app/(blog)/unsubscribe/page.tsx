import type { Metadata } from "next";
import Link from "next/link";

import { DEFAULT_DESCRIPTION, buildSiteUrl } from "@/lib/blog/post-seo";
import { getSubscriberUnsubscribePreview } from "@/lib/blog/subscribers";
import { getSiteBrandName, getSiteOrigin } from "@/lib/settings";

type UnsubscribePageProps = {
  searchParams: Promise<{
    token?: string;
    status?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const siteOrigin = getSiteOrigin();
  const canonicalUrl = buildSiteUrl("/unsubscribe", siteOrigin);
  const siteName = await getSiteBrandName();

  return {
    title: "退订",
    description: DEFAULT_DESCRIPTION,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      type: "website",
      title: `${siteName} 退订`,
      description: DEFAULT_DESCRIPTION,
      url: canonicalUrl,
      siteName,
    },
    twitter: {
      card: "summary",
      title: `${siteName} 退订`,
      description: DEFAULT_DESCRIPTION,
    },
  };
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token = "", status } = await searchParams;
  const preview = token ? await getSubscriberUnsubscribePreview(token) : { isValid: false as const };
  const successMessage =
    status === "removed"
      ? "你已成功退订后续新文章邮件。"
      : status === "missing"
        ? "该邮箱当前已经不在订阅列表中。"
        : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Unsubscribe
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">退订邮件通知</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          确认后，你将不再收到站点新文章发布邮件。
        </p>
      </div>

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5 text-sm leading-6 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          {successMessage}
        </div>
      ) : preview.isValid ? (
        <form
          action="/unsubscribe/confirm"
          method="get"
          className="flex flex-col gap-6 rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
        >
          <input type="hidden" name="token" value={preview.token} />

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              确认退订
            </h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              当前邮箱：<span className="font-medium text-slate-700 dark:text-slate-200">{preview.email}</span>
            </p>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              当前昵称：<span className="font-medium text-slate-700 dark:text-slate-200">{preview.displayName}</span>
            </p>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
            type="submit"
          >
            确认退订
          </button>
        </form>
      ) : (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm leading-6 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          退订链接无效或已失效。你也可以返回
          <Link className="ml-1 underline underline-offset-4" href="/subscribe">
            订阅页
          </Link>
          重新确认邮箱状态。
        </div>
      )}
    </main>
  );
}

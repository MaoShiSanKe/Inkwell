import type { Metadata } from "next";
import Link from "next/link";

import { SubscribeForm } from "@/components/blog/subscribe-form";
import { DEFAULT_DESCRIPTION, buildSiteUrl } from "@/lib/blog/post-seo";
import { getSiteBrandName, getSiteOrigin } from "@/lib/settings";

type SubscribePageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const siteOrigin = getSiteOrigin();
  const canonicalUrl = buildSiteUrl("/subscribe", siteOrigin);
  const siteName = await getSiteBrandName();

  return {
    title: "订阅",
    description: DEFAULT_DESCRIPTION,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      title: `${siteName} 订阅`,
      description: DEFAULT_DESCRIPTION,
      url: canonicalUrl,
      siteName,
    },
    twitter: {
      card: "summary",
      title: `${siteName} 订阅`,
      description: DEFAULT_DESCRIPTION,
    },
  };
}

export default async function SubscribePage({ searchParams }: SubscribePageProps) {
  const { email = "" } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Subscribe
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">订阅新文章通知</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          订阅后，当站点有新文章发布时，你会收到邮件提醒。无需账号，后续也可以随时退订。
        </p>
      </div>

      <SubscribeForm initialEmail={email} />

      <div className="rounded-2xl border border-slate-200 px-6 py-5 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300">
        <p>
          只通知新文章发布，不会发送广告邮件。如需返回首页，可前往
          <Link className="ml-1 underline underline-offset-4" href="/">
            最新文章
          </Link>
          。
        </p>
      </div>
    </main>
  );
}

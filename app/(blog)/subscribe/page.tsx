import type { Metadata } from "next";
import Link from "next/link";

import { SubscribeForm } from "@/components/blog/subscribe-form";
import { DEFAULT_DESCRIPTION, buildSiteUrl } from "@/lib/blog/post-seo";
import { getSiteBrandName, getSiteOrigin, getThemeFrameworkSettings } from "@/lib/settings";
import {
  resolveAccentClass,
  resolveAccentLinkClass,
  resolveContentWidthClass,
  resolveSurfaceClass,
} from "@/lib/theme";

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
  const themeFrameworkSettings = await getThemeFrameworkSettings();
  const widthClass = resolveContentWidthClass(themeFrameworkSettings.public_layout_width);
  const surfaceClass = resolveSurfaceClass(themeFrameworkSettings.public_surface_variant);
  const accentClass = resolveAccentClass(themeFrameworkSettings.public_accent_theme);
  const accentLinkClass = resolveAccentLinkClass(themeFrameworkSettings.public_accent_theme);

  return (
    <main className={`mx-auto flex w-full ${widthClass} flex-1 flex-col gap-8 px-6 py-16`}>
      <div className="flex flex-col gap-3">
        <p className={`text-sm uppercase tracking-[0.2em] ${accentClass}`}>
          Subscribe
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">订阅新文章通知</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          订阅后，当站点有新文章发布时，你会收到邮件提醒。无需账号，后续也可以随时退订。
        </p>
      </div>

      <SubscribeForm
        initialEmail={email}
        accentTheme={themeFrameworkSettings.public_accent_theme}
        surfaceVariant={themeFrameworkSettings.public_surface_variant}
      />

      <div className={`rounded-2xl border px-6 py-5 text-sm leading-6 text-slate-600 dark:text-slate-300 ${surfaceClass}`}>
        <p>
          只通知新文章发布，不会发送广告邮件。如需返回首页，可前往
          <Link className={`ml-1 ${accentLinkClass}`} href="/">
            最新文章
          </Link>
          。
        </p>
      </div>
    </main>
  );
}

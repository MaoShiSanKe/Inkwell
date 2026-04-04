import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DEFAULT_DESCRIPTION, buildSiteUrl } from "@/lib/blog/post-seo";
import { resolvePublishedSeriesArchiveBySlug } from "@/lib/blog/posts";
import {
  getSiteBrandName,
  getSiteOrigin,
  getThemeFrameworkSettings,
} from "@/lib/settings";
import {
  resolveAccentClass,
  resolveAccentLinkClass,
  resolveContentWidthClass,
  resolveEmptyStateSurfaceClass,
  resolvePostsDensityTokens,
  resolveSurfaceClass,
} from "@/lib/theme";

type SeriesPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: SeriesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await resolvePublishedSeriesArchiveBySlug(slug);

  if (result.kind !== "archive") {
    return {};
  }

  const siteOrigin = getSiteOrigin();
  const canonicalUrl = buildSiteUrl(`/series/${result.series.slug}`, siteOrigin);
  const description =
    result.series.description?.trim() || `查看系列“${result.series.name}”下已经发布的文章。`;
  const title = `${result.series.name} 系列`;
  const siteName = await getSiteBrandName();

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalUrl,
      siteName,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { slug } = await params;
  const result = await resolvePublishedSeriesArchiveBySlug(slug);

  if (result.kind === "not-found") {
    notFound();
  }

  const { series, posts } = result;
  const description = series.description?.trim() || DEFAULT_DESCRIPTION;
  const themeFrameworkSettings = await getThemeFrameworkSettings();
  const widthClass = resolveContentWidthClass(themeFrameworkSettings.public_layout_width);
  const surfaceClass = resolveSurfaceClass(themeFrameworkSettings.public_surface_variant);
  const accentClass = resolveAccentClass(themeFrameworkSettings.public_accent_theme);
  const accentLinkClass = resolveAccentLinkClass(themeFrameworkSettings.public_accent_theme);
  const { articlePaddingClass, listGapClass, metaTextClass, titleClass, excerptClass } =
    resolvePostsDensityTokens(themeFrameworkSettings.public_archive_posts_variant);
  const metadataLinkClass = `${metaTextClass} ${accentLinkClass}`;
  const emptyStateSurfaceClass = resolveEmptyStateSurfaceClass(
    themeFrameworkSettings.public_surface_variant,
  );
  const emptyStateClass = `rounded-2xl border border-dashed px-6 py-12 text-center ${emptyStateSurfaceClass}`;

  return (
    <main className={`mx-auto flex w-full ${widthClass} flex-1 flex-col gap-8 px-6 py-16`}>
      <div className="flex flex-col gap-3">
        <p className={`text-sm uppercase tracking-[0.2em] ${accentClass}`}>
          Series
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">{series.name}</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>

      {posts.length === 0 ? (
        <div className={emptyStateClass}>
          <p className={`text-lg font-medium ${accentClass}`}>这个系列下还没有已发布文章</p>
          <p className="mt-2 text-sm">文章发布并加入这个系列后，会自动出现在这里。</p>
        </div>
      ) : (
        <div className={`flex flex-col ${listGapClass}`}>
          {posts.map((post) => (
            <article
              key={post.id}
              className={`rounded-2xl border ${articlePaddingClass} ${surfaceClass}`}
            >
              <div className="flex flex-col gap-3">
                <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${metaTextClass} text-slate-500 dark:text-slate-400`}>
                  <Link className={metadataLinkClass} href={`/author/${post.author.slug}`}>
                    作者：{post.author.displayName}
                  </Link>
                  {post.publishedAt ? (
                    <time dateTime={post.publishedAt.toISOString()}>
                      {post.publishedAt.toLocaleDateString("zh-CN")}
                    </time>
                  ) : null}
                  {post.category ? (
                    <Link className={metadataLinkClass} href={`/category/${post.category.slug}`}>
                      分类：{post.category.name}
                    </Link>
                  ) : null}
                </div>
                <h2 className={`${titleClass} font-semibold tracking-tight`}>
                  <Link className={accentLinkClass} href={`/post/${post.slug}`}>
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt ? (
                  <p className={`${excerptClass} text-slate-600 dark:text-slate-300`}>
                    {post.excerpt}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { DEFAULT_DESCRIPTION, SITE_NAME, buildSiteUrl } from "@/lib/blog/post-seo";
import { listPublishedPosts } from "@/lib/blog/posts";
import { listRecommendedStandalonePages } from "@/lib/blog/pages";
import { getSiteOrigin, getThemeFrameworkSettings } from "@/lib/settings";
import {
  resolveAccentBorderHoverClass,
  resolveAccentClass,
  resolveAccentFocusRingClass,
  resolveAccentLinkClass,
  resolveContentWidthClass,
  resolveEmptyStateSurfaceClass,
  resolveFeaturedLinksDensityTokens,
  resolveSurfaceClass,
} from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const siteOrigin = getSiteOrigin();
  const themeFrameworkSettings = await getThemeFrameworkSettings();
  const canonicalUrl = buildSiteUrl("/", siteOrigin);
  const rssUrl = buildSiteUrl("/rss.xml", siteOrigin);
  const siteName = themeFrameworkSettings.site_brand_name || SITE_NAME;
  const description =
    themeFrameworkSettings.home_hero_description ||
    themeFrameworkSettings.site_tagline ||
    DEFAULT_DESCRIPTION;

  return {
    title: "首页",
    description,
    alternates: {
      canonical: canonicalUrl,
      types: {
        "application/rss+xml": rssUrl,
      },
    },
    openGraph: {
      type: "website",
      title: siteName,
      description,
      url: canonicalUrl,
      siteName,
    },
    twitter: {
      card: "summary",
      title: siteName,
      description,
    },
  };
}

export default async function BlogHomePage() {
  const [posts, themeFrameworkSettings] = await Promise.all([
    listPublishedPosts(),
    getThemeFrameworkSettings(),
  ]);
  const recommendedPages = await listRecommendedStandalonePages([
    themeFrameworkSettings.home_recommended_page_1_id,
    themeFrameworkSettings.home_recommended_page_2_id,
    themeFrameworkSettings.home_recommended_page_3_id,
  ]);
  const widthClass = resolveContentWidthClass(themeFrameworkSettings.public_layout_width);
  const surfaceClass = resolveSurfaceClass(themeFrameworkSettings.public_surface_variant);
  const accentClass = resolveAccentClass(themeFrameworkSettings.public_accent_theme);
  const accentBorderHoverClass = resolveAccentBorderHoverClass(
    themeFrameworkSettings.public_accent_theme,
  );
  const accentFocusRingClass = resolveAccentFocusRingClass(
    themeFrameworkSettings.public_accent_theme,
  );
  const compact = themeFrameworkSettings.home_posts_variant === "compact";
  const articlePaddingClass = compact ? "px-5 py-4" : "px-6 py-5";
  const listGapClass = compact ? "gap-3" : "gap-4";
  const metaTextClass = compact ? "text-xs" : "text-sm";
  const titleClass = compact ? "text-xl" : "text-2xl";
  const excerptClass = compact ? "text-sm leading-6" : "text-base leading-7";
  const emptyStateSurfaceClass = resolveEmptyStateSurfaceClass(
    themeFrameworkSettings.public_surface_variant,
  );
  const emptyStateClass = `rounded-2xl border border-dashed px-6 py-12 text-center ${emptyStateSurfaceClass}`;
  const emptyStateHeadingClass = `text-lg font-medium ${accentClass}`;
  const {
    cardPaddingClass: featuredLinkCardPaddingClass,
    gridGapClass: featuredLinksGridGapClass,
    titleClass: featuredLinkTitleClass,
    descriptionClass: featuredLinkDescriptionClass,
  } = resolveFeaturedLinksDensityTokens(themeFrameworkSettings.home_featured_links_variant);
  const featuredLinkCardClass = `rounded-2xl border ${featuredLinkCardPaddingClass} transition hover:-translate-y-0.5 hover:shadow-sm ${surfaceClass} ${accentBorderHoverClass}`;
  const accentLinkClass = resolveAccentLinkClass(themeFrameworkSettings.public_accent_theme);
  const metadataLinkClass = `text-sm ${accentLinkClass}`;
  const ctaClass = `inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 dark:border-slate-700 ${accentClass} ${accentBorderHoverClass} ${accentFocusRingClass}`;
  const featuredLinks = [
    {
      label: themeFrameworkSettings.home_featured_link_1_label,
      url: themeFrameworkSettings.home_featured_link_1_url,
      description: themeFrameworkSettings.home_featured_link_1_description,
    },
    {
      label: themeFrameworkSettings.home_featured_link_2_label,
      url: themeFrameworkSettings.home_featured_link_2_url,
      description: themeFrameworkSettings.home_featured_link_2_description,
    },
    {
      label: themeFrameworkSettings.home_featured_link_3_label,
      url: themeFrameworkSettings.home_featured_link_3_url,
      description: themeFrameworkSettings.home_featured_link_3_description,
    },
  ].filter((item) => item.label && item.url);

  return (
    <main className={`mx-auto flex w-full ${widthClass} flex-1 flex-col gap-8 px-6 py-16`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className={`text-sm uppercase tracking-[0.2em] ${accentClass}`}>
            {themeFrameworkSettings.site_brand_name}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            {themeFrameworkSettings.home_hero_title}
          </h1>
          {themeFrameworkSettings.home_hero_description ? (
            <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              {themeFrameworkSettings.home_hero_description}
            </p>
          ) : null}
        </div>
        <Link className={ctaClass} href={themeFrameworkSettings.home_primary_cta_url}>
          {themeFrameworkSettings.home_primary_cta_label}
        </Link>
      </div>

      {featuredLinks.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {themeFrameworkSettings.home_featured_links_title}
            </h2>
            {themeFrameworkSettings.home_featured_links_description ? (
              <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
                {themeFrameworkSettings.home_featured_links_description}
              </p>
            ) : null}
          </div>
          <div className={`grid ${featuredLinksGridGapClass} md:grid-cols-3`}>
            {featuredLinks.map((item) => (
              <Link
                key={item.url}
                href={item.url}
                className={featuredLinkCardClass}
              >
                <div className="flex flex-col gap-2">
                  <span className={`${featuredLinkTitleClass} uppercase tracking-[0.2em] ${accentClass}`}>
                    {item.label}
                  </span>
                  {item.description ? (
                    <p className={`${featuredLinkDescriptionClass} text-slate-600 dark:text-slate-300`}>
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {recommendedPages.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {themeFrameworkSettings.home_recommended_pages_title}
            </h2>
            {themeFrameworkSettings.home_recommended_pages_description ? (
              <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
                {themeFrameworkSettings.home_recommended_pages_description}
              </p>
            ) : null}
          </div>
          <div className={`grid ${featuredLinksGridGapClass} md:grid-cols-3`}>
            {recommendedPages.map((item) => (
              <Link key={item.id} href={`/${item.slug}`} className={featuredLinkCardClass}>
                <div className="flex flex-col gap-2">
                  <span className={`${featuredLinkTitleClass} uppercase tracking-[0.2em] ${accentClass}`}>
                    {item.title}
                  </span>
                  {item.description ? (
                    <p className={`${featuredLinkDescriptionClass} text-slate-600 dark:text-slate-300`}>
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {posts.length === 0 ? (
        <div className={emptyStateClass}>
          <p className={emptyStateHeadingClass}>还没有已发布文章</p>
          <p className="mt-2 text-sm">第一篇公开文章发布后，会显示在这里。</p>
        </div>
      ) : (
        <div className={`flex flex-col ${listGapClass}`}>
          {posts.map((post) => {
            const showAuthor = themeFrameworkSettings.home_show_post_author;
            const showDate = themeFrameworkSettings.home_show_post_date && Boolean(post.publishedAt);
            const showCategory = themeFrameworkSettings.home_show_post_category && Boolean(post.category);
            const showMeta = showAuthor || showDate || showCategory;

            return (
              <article
                key={post.id}
                className={`rounded-2xl border ${articlePaddingClass} ${surfaceClass}`}
              >
                <div className="flex flex-col gap-3">
                  {showMeta ? (
                    <div
                      className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${metaTextClass} text-slate-500 dark:text-slate-400`}
                    >
                      {showAuthor ? (
                        <Link className={metadataLinkClass} href={`/author/${post.author.slug}`}>
                          作者：{post.author.displayName}
                        </Link>
                      ) : null}
                      {showDate && post.publishedAt ? (
                        <time dateTime={post.publishedAt.toISOString()}>
                          {post.publishedAt.toLocaleDateString("zh-CN")}
                        </time>
                      ) : null}
                      {showCategory && post.category ? (
                        <Link className={metadataLinkClass} href={`/category/${post.category.slug}`}>
                          分类：{post.category.name}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                  <h2 className={`${titleClass} font-semibold tracking-tight`}>
                    <Link className={accentLinkClass} href={`/post/${post.slug}`}>
                      {post.title}
                    </Link>
                  </h2>
                  {themeFrameworkSettings.home_show_post_excerpt && post.excerpt ? (
                    <p className={`${excerptClass} text-slate-600 dark:text-slate-300`}>
                      {post.excerpt}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

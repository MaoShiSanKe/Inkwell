import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DEFAULT_DESCRIPTION, buildSiteUrl } from "@/lib/blog/post-seo";
import { resolvePublishedCategoryArchiveBySlug } from "@/lib/blog/posts";
import {
  getSiteBrandName,
  getSiteOrigin,
  getThemeFrameworkSettings,
} from "@/lib/settings";
import {
  resolveAccentClass,
  resolveContentWidthClass,
  resolveSurfaceClass,
} from "@/lib/theme";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await resolvePublishedCategoryArchiveBySlug(slug);

  if (result.kind !== "archive") {
    return {};
  }

  const siteOrigin = getSiteOrigin();
  const canonicalUrl = buildSiteUrl(`/category/${result.category.slug}`, siteOrigin);
  const rssUrl = buildSiteUrl(`/category/${result.category.slug}/rss.xml`, siteOrigin);
  const description =
    result.category.description?.trim() ||
    `查看分类“${result.category.name}”下已经发布的文章。`;
  const title = `${result.category.name} 分类`;
  const siteName = await getSiteBrandName();

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      types: {
        "application/rss+xml": rssUrl,
      },
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


export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const result = await resolvePublishedCategoryArchiveBySlug(slug);

  if (result.kind === "not-found") {
    notFound();
  }

  const { category, posts } = result;
  const description =
    category.description?.trim() || DEFAULT_DESCRIPTION;
  const themeFrameworkSettings = await getThemeFrameworkSettings();
  const widthClass = resolveContentWidthClass(themeFrameworkSettings.public_layout_width);
  const surfaceClass = resolveSurfaceClass(themeFrameworkSettings.public_surface_variant);
  const accentClass = resolveAccentClass(themeFrameworkSettings.public_accent_theme);

  return (
    <main className={`mx-auto flex w-full ${widthClass} flex-1 flex-col gap-8 px-6 py-16`}>
      <div className="flex flex-col gap-3">
        <p className={`text-sm uppercase tracking-[0.2em] ${accentClass}`}>
          Category
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">{category.name}</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <p className="text-lg font-medium">这个分类下还没有已发布文章</p>
          <p className="mt-2 text-sm">文章发布后，会自动出现在这个分类归档页。</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className={`rounded-2xl border px-6 py-5 ${surfaceClass}`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <Link className={`hover:underline ${accentClass}`} href={`/author/${post.author.slug}`}>
                    作者：{post.author.displayName}
                  </Link>
                  {post.publishedAt ? (
                    <time dateTime={post.publishedAt.toISOString()}>
                      {post.publishedAt.toLocaleDateString("zh-CN")}
                    </time>
                  ) : null}
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  <Link className="hover:underline" href={`/post/${post.slug}`}>
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt ? (
                  <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DEFAULT_DESCRIPTION, buildSiteUrl } from "@/lib/blog/post-seo";
import { resolvePublishedAuthorArchiveBySlug } from "@/lib/blog/posts";
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

type AuthorPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await resolvePublishedAuthorArchiveBySlug(slug);

  if (result.kind !== "archive") {
    return {};
  }

  const siteOrigin = getSiteOrigin();
  const canonicalUrl = buildSiteUrl(`/author/${result.author.slug}`, siteOrigin);
  const description = `查看作者“${result.author.displayName}”下已经发布的文章。`;
  const title = `${result.author.displayName} 的文章`;
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

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { slug } = await params;
  const result = await resolvePublishedAuthorArchiveBySlug(slug);

  if (result.kind === "not-found") {
    notFound();
  }

  const { author, posts } = result;
  const description = DEFAULT_DESCRIPTION;
  const themeFrameworkSettings = await getThemeFrameworkSettings();
  const widthClass = resolveContentWidthClass(themeFrameworkSettings.public_layout_width);
  const surfaceClass = resolveSurfaceClass(themeFrameworkSettings.public_surface_variant);
  const accentClass = resolveAccentClass(themeFrameworkSettings.public_accent_theme);
  const emptyStateClass =
    themeFrameworkSettings.public_surface_variant === "solid"
      ? "rounded-2xl border border-dashed border-slate-300 bg-slate-100/70 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
      : "rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300";

  return (
    <main className={`mx-auto flex w-full ${widthClass} flex-1 flex-col gap-8 px-6 py-16`}>
      <div className="flex flex-col gap-3">
        <p className={`text-sm uppercase tracking-[0.2em] ${accentClass}`}>
          Author
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">{author.displayName}</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>

      {posts.length === 0 ? (
        <div className={emptyStateClass}>
          <p className={`text-lg font-medium ${accentClass}`}>这个作者下还没有已发布文章</p>
          <p className="mt-2 text-sm">该作者发布文章后，会自动出现在这个作者归档页。</p>
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
                  {post.publishedAt ? (
                    <time dateTime={post.publishedAt.toISOString()}>
                      {post.publishedAt.toLocaleDateString("zh-CN")}
                    </time>
                  ) : null}
                  {post.category ? (
                    <Link className={`hover:underline ${accentClass}`} href={`/category/${post.category.slug}`}>
                      分类：{post.category.name}
                    </Link>
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

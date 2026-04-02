import type { Metadata } from "next";
import Link from "next/link";

import { DEFAULT_DESCRIPTION, buildSiteUrl } from "@/lib/blog/post-seo";
import { searchPublishedPosts } from "@/lib/blog/posts";
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

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const siteOrigin = getSiteOrigin();
  const canonicalUrl = buildSiteUrl("/search", siteOrigin);
  const siteName = await getSiteBrandName();

  return {
    title: "搜索",
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
      title: `${siteName} 搜索`,
      description: DEFAULT_DESCRIPTION,
      url: canonicalUrl,
      siteName,
    },
    twitter: {
      card: "summary",
      title: `${siteName} 搜索`,
      description: DEFAULT_DESCRIPTION,
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const [{ q = "" }, themeFrameworkSettings] = await Promise.all([
    searchParams,
    getThemeFrameworkSettings(),
  ]);
  const query = q.trim();
  const posts = query ? await searchPublishedPosts(query) : [];
  const widthClass = resolveContentWidthClass(themeFrameworkSettings.public_layout_width);
  const surfaceClass = resolveSurfaceClass(themeFrameworkSettings.public_surface_variant);
  const accentClass = resolveAccentClass(themeFrameworkSettings.public_accent_theme);

  return (
    <main className={`mx-auto flex w-full ${widthClass} flex-1 flex-col gap-8 px-6 py-16`}>
      <div className="flex flex-col gap-3">
        <p className={`text-sm uppercase tracking-[0.2em] ${accentClass}`}>
          Search
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">搜索已发布文章</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          输入关键词搜索站内已经公开发布的文章。
        </p>
      </div>

      <form action="/search" className="flex flex-col gap-3 sm:flex-row">
        <input
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          defaultValue={query}
          name="q"
          placeholder="输入关键词，例如：Next.js、SEO、评论"
          type="search"
        />
        <button
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          type="submit"
        >
          搜索
        </button>
      </form>

      {!query ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <p className="text-lg font-medium">输入关键词开始搜索</p>
          <p className="mt-2 text-sm">搜索结果只包含当前已发布的文章，不包含草稿、定时发布和回收站内容。</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <p className="text-lg font-medium">没有找到相关文章</p>
          <p className="mt-2 text-sm">请尝试更换关键词，或缩短查询词后重新搜索。</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            共找到 {posts.length} 篇与 “{query}” 相关的已发布文章。
          </p>
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

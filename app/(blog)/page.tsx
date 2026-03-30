import type { Metadata } from "next";
import Link from "next/link";

import { DEFAULT_DESCRIPTION, SITE_NAME, buildSiteUrl } from "@/lib/blog/post-seo";
import { listPublishedPosts } from "@/lib/blog/posts";
import { getSiteOrigin } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const siteOrigin = getSiteOrigin();
  const canonicalUrl = buildSiteUrl("/", siteOrigin);
  const rssUrl = buildSiteUrl("/rss.xml", siteOrigin);

  return {
    title: "首页",
    description: DEFAULT_DESCRIPTION,
    alternates: {
      canonical: canonicalUrl,
      types: {
        "application/rss+xml": rssUrl,
      },
    },
    openGraph: {
      type: "website",
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      url: canonicalUrl,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary",
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
    },
  };
}


export default async function BlogHomePage() {
  const posts = await listPublishedPosts();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Inkwell
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">最新文章</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            浏览站点中已经发布的文章与公开归档。
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          href="/subscribe"
        >
          订阅新文章
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <p className="text-lg font-medium">还没有已发布文章</p>
          <p className="mt-2 text-sm">第一篇公开文章发布后，会显示在这里。</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-slate-200 px-6 py-5 dark:border-slate-800"
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <Link
                    className="hover:text-slate-900 hover:underline dark:hover:text-slate-100"
                    href={`/author/${post.author.slug}`}
                  >
                    作者：{post.author.displayName}
                  </Link>
                  {post.publishedAt ? (
                    <time dateTime={post.publishedAt.toISOString()}>
                      {post.publishedAt.toLocaleDateString("zh-CN")}
                    </time>
                  ) : null}
                  {post.category ? (
                    <Link
                      className="hover:text-slate-900 hover:underline dark:hover:text-slate-100"
                      href={`/category/${post.category.slug}`}
                    >
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

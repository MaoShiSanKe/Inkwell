import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DEFAULT_DESCRIPTION, SITE_NAME, buildSiteUrl } from "@/lib/blog/post-seo";
import { resolvePublishedTagArchiveBySlug } from "@/lib/blog/posts";
import { getSiteOrigin } from "@/lib/settings";

type TagPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await resolvePublishedTagArchiveBySlug(slug);

  if (result.kind !== "archive") {
    return {};
  }

  const siteOrigin = getSiteOrigin();
  const canonicalUrl = buildSiteUrl(`/tag/${result.tag.slug}`, siteOrigin);
  const description =
    result.tag.description?.trim() || `查看标签“${result.tag.name}”下已经发布的文章。`;
  const title = `${result.tag.name} 标签`;

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
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;
  const result = await resolvePublishedTagArchiveBySlug(slug);

  if (result.kind === "not-found") {
    notFound();
  }

  const { tag, posts } = result;
  const description = tag.description?.trim() || DEFAULT_DESCRIPTION;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Tag
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">{tag.name}</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <p className="text-lg font-medium">这个标签下还没有已发布文章</p>
          <p className="mt-2 text-sm">文章发布并关联这个标签后，会自动出现在这里。</p>
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
                  <span>作者：{post.author.displayName}</span>
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

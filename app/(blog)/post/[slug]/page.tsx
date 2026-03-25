import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { resolvePublishedPostBySlug } from "@/lib/blog/posts";
import {
  SITE_NAME,
  buildArticleJsonLd,
  resolveCanonicalUrl,
  resolveImageUrl,
  resolvePostDescription,
} from "@/lib/blog/post-seo";
import { getSiteOrigin } from "@/lib/settings";

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await resolvePublishedPostBySlug(slug);

  if (result.kind !== "post") {
    return {};
  }

  const post = result.post;
  const siteOrigin = getSiteOrigin();
  const title = post.seo.metaTitle?.trim() || post.title;
  const description = resolvePostDescription(post);
  const canonicalUrl = resolveCanonicalUrl(post, siteOrigin);
  const ogTitle = post.seo.ogTitle?.trim() || title;
  const ogDescription = post.seo.ogDescription?.trim() || description;
  const imageUrl = resolveImageUrl(post.ogImage, siteOrigin);
  const robots = {
    index: !post.seo.noindex,
    follow: !post.seo.nofollow,
  };

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    authors: [{ name: post.author.displayName }],
    robots,
    openGraph: {
      type: "article",
      title: ogTitle,
      description: ogDescription,
      url: canonicalUrl,
      siteName: SITE_NAME,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author.displayName],
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: post.ogImage?.altText || ogTitle,
              width: post.ogImage?.width ?? undefined,
              height: post.ogImage?.height ?? undefined,
            },
          ]
        : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: ogTitle,
      description: ogDescription,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const result = await resolvePublishedPostBySlug(slug);

  if (result.kind === "redirect") {
    permanentRedirect(`/post/${result.currentSlug}`);
  }

  if (result.kind === "not-found") {
    notFound();
  }

  const { post } = result;

  if (slug !== post.slug) {
    permanentRedirect(`/post/${post.slug}`);
  }

  const siteOrigin = getSiteOrigin();
  const canonicalUrl = resolveCanonicalUrl(post, siteOrigin);
  const description = resolvePostDescription(post);
  const imageUrl = resolveImageUrl(post.ogImage, siteOrigin);
  const articleJsonLd = buildArticleJsonLd(
    post,
    canonicalUrl,
    description,
    imageUrl,
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd),
        }}
      />
      <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Post
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
      {post.excerpt ? (
        <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
          {post.excerpt}
        </p>
      ) : null}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        作者：{post.author.displayName}
      </p>
      {post.publishedAt ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          发布时间：
          <time dateTime={post.publishedAt.toISOString()}>
            {post.publishedAt.toLocaleString()}
          </time>
        </p>
      ) : null}
      <article className="rounded-2xl border border-slate-200 px-6 py-5 text-base leading-7 whitespace-pre-wrap dark:border-slate-800">
        {post.content}
      </article>
    </main>
  );
}

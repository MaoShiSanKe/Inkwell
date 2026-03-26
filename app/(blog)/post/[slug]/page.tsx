import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { CommentForm } from "@/components/blog/comment-form";
import { CommentList } from "@/components/blog/comment-list";
import { PostLikeButton } from "@/components/blog/post-like-button";
import { listApprovedCommentsForPost } from "@/lib/blog/comments";
import { getPublishedPostLikeCount } from "@/lib/blog/likes";
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
  searchParams?: Promise<{
    replyTo?: string;
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

function countApprovedComments(comments: Awaited<ReturnType<typeof listApprovedCommentsForPost>>) {
  return comments.reduce((total, comment) => total + 1 + comment.replies.length, 0);
}

export default async function PostPage({ params, searchParams }: PostPageProps) {
  const [{ slug }, { replyTo }] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ replyTo?: string }>({}),
  ]);
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

  const approvedComments = await listApprovedCommentsForPost(post.id);
  const likeCount = await getPublishedPostLikeCount(post.id);
  const replyToId = Number.parseInt(replyTo ?? "", 10);
  const replyTarget = Number.isInteger(replyToId)
    ? approvedComments.find((comment) => comment.id === replyToId) ?? null
    : null;
  const publicCommentCount = countApprovedComments(approvedComments);
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

      <PostLikeButton postId={post.id} postSlug={post.slug} initialLikeCount={likeCount} />

      <section className="mt-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">评论</h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {publicCommentCount > 0
              ? `当前共有 ${publicCommentCount} 条已公开评论。`
              : "当前还没有公开评论。"}
          </p>
        </div>

        <CommentList comments={approvedComments} postSlug={post.slug} />
        <CommentForm
          postId={post.id}
          postSlug={post.slug}
          replyTarget={replyTarget
            ? {
                id: replyTarget.id,
                authorName: replyTarget.authorName,
              }
            : null}
        />
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { CommentForm } from "@/components/blog/comment-form";
import { CommentList } from "@/components/blog/comment-list";
import { PostLikeButton } from "@/components/blog/post-like-button";
import { PostTableOfContents } from "@/components/blog/post-table-of-contents";
import { listApprovedCommentsForPost } from "@/lib/blog/comments";
import { getPublishedPostLikeCount } from "@/lib/blog/likes";
import {
  listRelatedPublishedPosts,
  resolvePublishedPostBySlug,
  type BlogPostPageData,
} from "@/lib/blog/posts";
import {
  buildArticleJsonLd,
  buildBreadcrumbListJsonLd,
  buildCategoryUrl,
  buildPostUrl,
  estimateReadingTimeMinutes,
  resolveCanonicalUrl,
  resolveImageUrl,
  resolvePostDescription,
  type PostSeoBreadcrumbItemInput,
} from "@/lib/blog/post-seo";
import { parsePostContentForToc } from "@/lib/blog/post-toc";
import { getPublishedPostViewCount, recordPublishedPostView } from "@/lib/blog/views";
import { getSiteBrandName, getSiteOrigin, getThemeFrameworkSettings } from "@/lib/settings";
import {
  resolveAccentClass,
  resolveContentWidthClass,
  resolveSurfaceClass,
} from "@/lib/theme";

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
  const siteName = await getSiteBrandName();
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
      siteName,
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

function buildBreadcrumbItems(post: BlogPostPageData): PostSeoBreadcrumbItemInput[] {
  const categoryItems =
    post.seo.breadcrumbEnabled && post.categoryPath.length > 0
      ? post.categoryPath.map((category) => ({
          name: category.name,
          path: buildCategoryUrl(category.slug, null),
        }))
      : [];

  return [
    {
      name: "首页",
      path: "/",
    },
    ...categoryItems,
    {
      name: post.title,
      path: buildPostUrl(post.slug, null),
    },
  ];
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

  await recordPublishedPostView({ postId: post.id });

  const approvedComments = await listApprovedCommentsForPost(post.id);
  const likeCount = await getPublishedPostLikeCount(post.id);
  const viewCount = await getPublishedPostViewCount(post.id);
  const readingTimeMinutes = estimateReadingTimeMinutes(post.content);
  const relatedPosts = await listRelatedPublishedPosts({
    postId: post.id,
    categoryId: post.category?.id ?? null,
    tagIds: post.tags.map((tag) => tag.id),
  });
  const parsedContent = parsePostContentForToc(post.content);
  const hasTableOfContents = parsedContent.tocItems.length > 0;
  const hasParsedImages = parsedContent.blocks.some((block) => block.type === "image");
  const shouldRenderParsedContent = hasTableOfContents || hasParsedImages;
  const replyToId = Number.parseInt(replyTo ?? "", 10);
  const replyTarget = Number.isInteger(replyToId)
    ? approvedComments.find((comment) => comment.id === replyToId) ?? null
    : null;
  const publicCommentCount = countApprovedComments(approvedComments);
  const siteOrigin = getSiteOrigin();
  const siteName = await getSiteBrandName();
  const canonicalUrl = resolveCanonicalUrl(post, siteOrigin);
  const description = resolvePostDescription(post);
  const imageUrl = resolveImageUrl(post.ogImage, siteOrigin);
  const themeFrameworkSettings = await getThemeFrameworkSettings();
  const widthClass = resolveContentWidthClass(themeFrameworkSettings.public_layout_width);
  const surfaceClass = resolveSurfaceClass(themeFrameworkSettings.public_surface_variant);
  const accentClass = resolveAccentClass(themeFrameworkSettings.public_accent_theme);
  const relatedCardHoverClass =
    themeFrameworkSettings.public_accent_theme === "blue"
      ? "hover:border-blue-300 dark:hover:border-blue-700"
      : themeFrameworkSettings.public_accent_theme === "emerald"
        ? "hover:border-emerald-300 dark:hover:border-emerald-700"
        : themeFrameworkSettings.public_accent_theme === "amber"
          ? "hover:border-amber-300 dark:hover:border-amber-700"
          : "hover:border-slate-400 dark:hover:border-slate-600";
  const relatedCardClass = `flex flex-col gap-2 rounded-2xl border px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-sm ${surfaceClass} ${relatedCardHoverClass}`;
  const breadcrumbItems = buildBreadcrumbItems(post);
  const articleJsonLd = buildArticleJsonLd(
    post,
    canonicalUrl,
    description,
    imageUrl,
    siteName,
  );
  const breadcrumbJsonLd = buildBreadcrumbListJsonLd(breadcrumbItems, siteOrigin);

  return (
    <main className={`mx-auto flex w-full ${widthClass} flex-1 flex-col gap-4 px-6 py-16`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <nav
        aria-label="面包屑"
        className={`rounded-2xl border px-6 py-4 ${surfaceClass}`}
      >
        <ol className="flex flex-wrap items-center gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {breadcrumbItems.map((item, index) => {
            const isCurrentPage = index === breadcrumbItems.length - 1;

            return (
              <li key={`${item.path}-${item.name}`} className="flex items-center gap-2">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
                    /
                  </span>
                ) : null}
                {isCurrentPage ? (
                  <span aria-current="page" className="font-medium text-slate-900 dark:text-slate-100">
                    {item.name}
                  </span>
                ) : (
                  <Link className={`underline underline-offset-4 ${accentClass}`} href={item.path}>
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <p className={`text-sm uppercase tracking-[0.2em] ${accentClass}`}>
        Post
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
      {post.excerpt ? (
        <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
          {post.excerpt}
        </p>
      ) : null}
      <Link className={`text-sm hover:underline ${accentClass}`} href={`/author/${post.author.slug}`}>
        作者：{post.author.displayName}
      </Link>
      {post.category ? (
        <Link className={`text-sm hover:underline ${accentClass}`} href={`/category/${post.category.slug}`}>
          分类：{post.category.name}
        </Link>
      ) : null}
      {post.series ? (
        <Link className={`text-sm hover:underline ${accentClass}`} href={`/series/${post.series.slug}`}>
          系列：{post.series.name}
        </Link>
      ) : null}
      {post.publishedAt ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          发布时间：
          <time dateTime={post.publishedAt.toISOString()}>
            {post.publishedAt.toLocaleString()}
          </time>
        </p>
      ) : null}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        最后更新：
        <time dateTime={post.updatedAt.toISOString()}>{post.updatedAt.toLocaleString()}</time>
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">预计阅读 {readingTimeMinutes} 分钟。</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">当前累计 {viewCount} 次浏览。</p>
      {post.tags.length > 0 ? (
        <section aria-label="文章标签" className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">标签：</span>
          {post.tags.map((tag) => (
            <Link
              key={tag.id}
              className={`inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-sm transition hover:border-slate-400 ${accentClass}`}
              href={`/tag/${tag.slug}`}
            >
              {tag.name}
            </Link>
          ))}
        </section>
      ) : null}
      {hasTableOfContents ? (
        <PostTableOfContents
          items={parsedContent.tocItems}
          accentTheme={themeFrameworkSettings.public_accent_theme}
          surfaceVariant={themeFrameworkSettings.public_surface_variant}
        />
      ) : null}
      <article className={`flex flex-col gap-4 rounded-2xl border px-6 py-5 text-base leading-7 ${surfaceClass}`}>
        {shouldRenderParsedContent ? (
          parsedContent.blocks.map((block, index) => {
            if (block.type === "heading") {
              if (block.level === 2) {
                return (
                  <h2 id={block.id} key={block.id} className="text-2xl font-semibold tracking-tight">
                    {block.title}
                  </h2>
                );
              }

              return (
                <h3 id={block.id} key={block.id} className="text-xl font-semibold tracking-tight">
                  {block.title}
                </h3>
              );
            }

            if (block.type === "image") {
              return (
                <figure key={`${index}-${block.url}`} className={`overflow-hidden rounded-2xl border ${surfaceClass}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="h-auto w-full" src={block.url} alt={block.altText} />
                </figure>
              );
            }

            return (
              <p key={`${index}-${block.content}`} className="whitespace-pre-wrap">
                {block.content}
              </p>
            );
          })
        ) : (
          <p className="whitespace-pre-wrap">{post.content}</p>
        )}
      </article>

      <PostLikeButton
        postId={post.id}
        postSlug={post.slug}
        initialLikeCount={likeCount}
        accentTheme={themeFrameworkSettings.public_accent_theme}
        surfaceVariant={themeFrameworkSettings.public_surface_variant}
      />

      <section className={`mt-6 flex flex-col gap-4 rounded-2xl border px-6 py-5 ${surfaceClass}`}>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">相关文章</h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {relatedPosts.length > 0
              ? "基于当前文章的分类与标签，为你推荐以下已发布内容。"
              : "当前还没有可推荐的相关文章。"}
          </p>
        </div>

        {relatedPosts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {relatedPosts.map((relatedPost) => (
              <article key={relatedPost.id} className={relatedCardClass}>
                <h3 className="text-lg font-semibold tracking-tight">
                  <Link className={`hover:underline ${accentClass}`} href={`/post/${relatedPost.slug}`}>
                    {relatedPost.title}
                  </Link>
                </h3>
                {relatedPost.excerpt ? (
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {relatedPost.excerpt}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">评论</h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {publicCommentCount > 0
              ? `当前共有 ${publicCommentCount} 条已公开评论。`
              : "当前还没有公开评论。"}
          </p>
        </div>

        <CommentList
          comments={approvedComments}
          postSlug={post.slug}
          accentTheme={themeFrameworkSettings.public_accent_theme}
          surfaceVariant={themeFrameworkSettings.public_surface_variant}
        />
        <CommentForm
          postId={post.id}
          postSlug={post.slug}
          accentTheme={themeFrameworkSettings.public_accent_theme}
          surfaceVariant={themeFrameworkSettings.public_surface_variant}
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

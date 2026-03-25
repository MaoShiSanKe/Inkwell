import { notFound, permanentRedirect } from "next/navigation";

import { resolvePublishedPostBySlug } from "@/lib/blog/posts";

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Post
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
      {post.excerpt ? (
        <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
          {post.excerpt}
        </p>
      ) : null}
      {post.publishedAt ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          发布时间：
          <time dateTime={post.publishedAt.toISOString()}>
            {post.publishedAt.toLocaleString()}
          </time>
        </p>
      ) : null}
      <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
        当前 slug：
        <code className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
          {post.slug}
        </code>
      </p>
      <article className="rounded-2xl border border-slate-200 px-6 py-5 text-base leading-7 whitespace-pre-wrap dark:border-slate-800">
        {post.content}
      </article>
    </main>
  );
}

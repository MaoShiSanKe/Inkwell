import Link from "next/link";
import { notFound } from "next/navigation";

import { PostEditForm } from "@/components/admin/post-edit-form";
import {
  getAdminPostEditorData,
  listPostCategoryOptions,
  listPostSeriesOptions,
  listPostTagOptions,
} from "@/lib/admin/posts";

import { movePostToTrashAction } from "../actions";

type AdminPostEditPageProps = {
  params: Promise<{
    adminPath: string;
    postId: string;
  }>;
};

export default async function AdminPostEditPage({ params }: AdminPostEditPageProps) {
  const { adminPath, postId } = await params;
  const numericPostId = Number.parseInt(postId, 10);

  if (!Number.isInteger(numericPostId) || numericPostId <= 0) {
    notFound();
  }

  const [post, categories, tags, series] = await Promise.all([
    getAdminPostEditorData(numericPostId),
    listPostCategoryOptions(),
    listPostTagOptions(),
    listPostSeriesOptions(),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Posts
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">编辑文章</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            修改文章内容、标签与系列，并保存新的修订记录。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          href={`/${adminPath}/posts`}
        >
          返回列表
        </Link>
      </div>

      <PostEditForm
        adminPath={adminPath}
        postId={post.id}
        categories={categories}
        tags={tags}
        series={series}
        initialValues={post.values}
      />

      {post.currentStatus !== "trash" ? (
        <form action={movePostToTrashAction} className="flex justify-end">
          <input type="hidden" name="adminPath" value={adminPath} />
          <input type="hidden" name="postId" value={post.id} />
          <button
            className="inline-flex items-center justify-center rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
            type="submit"
          >
            移入回收站
          </button>
        </form>
      ) : null}
    </main>
  );
}

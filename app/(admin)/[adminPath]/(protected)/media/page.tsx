import Link from "next/link";

import { AdminMediaForm } from "@/components/admin/media-form";
import { listAdminMedia } from "@/lib/admin/media";

type AdminMediaPageProps = {
  params: Promise<{
    adminPath: string;
  }>;
  searchParams: Promise<{
    uploaded?: string;
    created?: string;
    deleted?: string;
    error?: string;
  }>;
};

export default async function AdminMediaPage({
  params,
  searchParams,
}: AdminMediaPageProps) {
  const [{ adminPath }, { uploaded, created, deleted, error }] = await Promise.all([
    params,
    searchParams,
  ]);
  const mediaItems = await listAdminMedia();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Media
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">媒体库</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            管理本地图片与外链图片，供后台 SEO 分享图统一复用。本地上传会自动保存到
            <code className="mx-1 rounded bg-slate-100 px-2 py-1 text-sm dark:bg-slate-800">
              public/uploads/images/YYYY/MM/
            </code>
            并生成 WebP 缩略图。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          href={`/${adminPath}`}
        >
          返回后台
        </Link>
      </div>

      {uploaded === "1" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          图片已上传，并写入媒体库。
        </p>
      ) : null}

      {created === "1" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          外链图片已添加到媒体库。
        </p>
      ) : null}

      {deleted === "1" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          媒体已删除。
        </p>
      ) : null}

      {error === "delete_failed" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          删除媒体失败，请稍后重试。
        </p>
      ) : null}

      <AdminMediaForm
        adminPath={adminPath}
        mediaItems={mediaItems.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}

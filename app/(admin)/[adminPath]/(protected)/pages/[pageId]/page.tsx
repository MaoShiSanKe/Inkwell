import Link from "next/link";
import { notFound } from "next/navigation";

import { PageEditForm } from "@/components/admin/page-edit-form";
import { listAdminMediaOptions } from "@/lib/admin/media";
import { getAdminPageEditorData } from "@/lib/admin/pages";

import { movePageToTrashAction, restorePageAction } from "../actions";

type AdminPageEditPageProps = {
  params: Promise<{
    adminPath: string;
    pageId: string;
  }>;
};

export default async function AdminPageEditPage({ params }: AdminPageEditPageProps) {
  const { adminPath, pageId } = await params;
  const numericPageId = Number.parseInt(pageId, 10);

  if (!Number.isInteger(numericPageId) || numericPageId <= 0) {
    notFound();
  }

  const [page, mediaOptions] = await Promise.all([
    getAdminPageEditorData(numericPageId),
    listAdminMediaOptions(),
  ]);

  if (!page) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Pages</p>
          <h1 className="text-3xl font-semibold tracking-tight">编辑页面</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">修改独立页面内容与 SEO 信息。</p>
        </div>
        <Link className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" href={`/${adminPath}/pages`}>返回列表</Link>
      </div>

      <PageEditForm adminPath={adminPath} pageId={page.id} mediaOptions={mediaOptions} initialValues={page.values} />

      {page.currentStatus === "trash" ? (
        <form action={restorePageAction} className="inline-flex">
          <input type="hidden" name="adminPath" value={adminPath} />
          <input type="hidden" name="pageId" value={page.id} />
          <button className="inline-flex items-center justify-center rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40" type="submit">恢复为草稿</button>
        </form>
      ) : (
        <form action={movePageToTrashAction} className="inline-flex">
          <input type="hidden" name="adminPath" value={adminPath} />
          <input type="hidden" name="pageId" value={page.id} />
          <button className="inline-flex items-center justify-center rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40" type="submit">移入回收站</button>
        </form>
      )}
    </main>
  );
}

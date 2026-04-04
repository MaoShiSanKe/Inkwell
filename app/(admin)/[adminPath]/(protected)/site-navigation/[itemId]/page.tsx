import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteNavigationEditForm } from "@/components/admin/site-navigation-edit-form";
import { getAdminSiteNavigationEditorData } from "@/lib/admin/site-navigation";

import { deleteSiteNavigationAction } from "../actions";

type AdminSiteNavigationEditPageProps = {
  params: Promise<{
    adminPath: string;
    itemId: string;
  }>;
};

export default async function AdminSiteNavigationEditPage({
  params,
}: AdminSiteNavigationEditPageProps) {
  const { adminPath, itemId } = await params;
  const numericItemId = Number.parseInt(itemId, 10);

  if (!Number.isInteger(numericItemId) || numericItemId <= 0) {
    notFound();
  }

  const item = await getAdminSiteNavigationEditorData(numericItemId);

  if (!item) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Site Navigation</p>
          <h1 className="text-3xl font-semibold tracking-tight">编辑导航项</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">修改文案、链接、排序与显示行为。</p>
        </div>
        <Link className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" href={`/${adminPath}/site-navigation`}>返回列表</Link>
      </div>

      <SiteNavigationEditForm adminPath={adminPath} itemId={item.id} initialValues={item.values} />

      <form action={deleteSiteNavigationAction} className="inline-flex">
        <input type="hidden" name="adminPath" value={adminPath} />
        <input type="hidden" name="itemId" value={item.id} />
        <button className="inline-flex items-center justify-center rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40" type="submit">删除导航项</button>
      </form>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { TaxonomyForm } from "@/components/admin/taxonomy-form";
import { getAdminTaxonomyEditorData } from "@/lib/admin/taxonomies";

import { updateSeriesAction } from "../actions";

type AdminSeriesEditPageProps = {
  params: Promise<{
    adminPath: string;
    seriesId: string;
  }>;
};

export default async function AdminSeriesEditPage({ params }: AdminSeriesEditPageProps) {
  const { adminPath, seriesId } = await params;
  const numericSeriesId = Number.parseInt(seriesId, 10);

  if (!Number.isInteger(numericSeriesId) || numericSeriesId <= 0) {
    notFound();
  }

  const seriesItem = await getAdminTaxonomyEditorData("series", numericSeriesId);

  if (!seriesItem) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Series
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">编辑系列</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            当前系列已关联 {seriesItem.usageCount} 篇文章。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          href={`/${adminPath}/series`}
        >
          返回列表
        </Link>
      </div>

      <TaxonomyForm
        adminPath={adminPath}
        kind="series"
        mode="edit"
        action={updateSeriesAction}
        taxonomyId={seriesItem.id}
        initialValues={seriesItem.values}
      />
    </main>
  );
}

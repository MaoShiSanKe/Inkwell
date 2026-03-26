import Link from "next/link";
import { notFound } from "next/navigation";

import { TaxonomyForm } from "@/components/admin/taxonomy-form";
import {
  getAdminTaxonomyEditorData,
  listCategoryParentOptions,
} from "@/lib/admin/taxonomies";

import { updateCategoryAction } from "../actions";

type AdminCategoryEditPageProps = {
  params: Promise<{
    adminPath: string;
    categoryId: string;
  }>;
};

export default async function AdminCategoryEditPage({ params }: AdminCategoryEditPageProps) {
  const { adminPath, categoryId } = await params;
  const numericCategoryId = Number.parseInt(categoryId, 10);

  if (!Number.isInteger(numericCategoryId) || numericCategoryId <= 0) {
    notFound();
  }

  const [category, parentOptions] = await Promise.all([
    getAdminTaxonomyEditorData("category", numericCategoryId),
    listCategoryParentOptions(numericCategoryId),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Categories
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">编辑分类</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            当前分类已关联 {category.usageCount} 篇文章，含 {category.childCount} 个子分类。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          href={`/${adminPath}/categories`}
        >
          返回列表
        </Link>
      </div>

      <TaxonomyForm
        adminPath={adminPath}
        kind="category"
        mode="edit"
        action={updateCategoryAction}
        taxonomyId={category.id}
        initialValues={category.values}
        parentOptions={parentOptions}
      />
    </main>
  );
}

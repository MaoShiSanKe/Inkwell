import Link from "next/link";

import { TaxonomyForm } from "@/components/admin/taxonomy-form";

import { createTagAction } from "../actions";

type AdminTagNewPageProps = {
  params: Promise<{
    adminPath: string;
  }>;
};

export default async function AdminTagNewPage({ params }: AdminTagNewPageProps) {
  const { adminPath } = await params;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Tags
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">新建标签</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            填写标签名称、slug 与描述，创建文章可复用的标签项。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          href={`/${adminPath}/tags`}
        >
          返回列表
        </Link>
      </div>

      <TaxonomyForm adminPath={adminPath} kind="tag" mode="create" action={createTagAction} />
    </main>
  );
}

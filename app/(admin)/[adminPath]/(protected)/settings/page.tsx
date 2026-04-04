import Link from "next/link";

import { SettingsForm } from "@/components/admin/settings-form";
import { listAdminPages } from "@/lib/admin/pages";
import {
  getAdminEmailNotifications,
  getAdminSettingsFormValues,
} from "@/lib/admin/settings";

type AdminSettingsPageProps = {
  params: Promise<{
    adminPath: string;
  }>;
  searchParams: Promise<{
    saved?: string;
    adminPathChanged?: string;
  }>;
};

export default async function AdminSettingsPage({
  params,
  searchParams,
}: AdminSettingsPageProps) {
  const [{ adminPath }, { saved, adminPathChanged }] = await Promise.all([
    params,
    searchParams,
  ]);
  const [initialValues, emailNotifications, pageOptions] = await Promise.all([
    getAdminSettingsFormValues(),
    getAdminEmailNotifications(),
    listAdminPages(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Settings
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">后台设置</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            管理后台路径、修订保留策略、自动摘要长度、评论默认审核模式以及邮件通知场景。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          href={`/${adminPath}`}
        >
          返回后台
        </Link>
      </div>

      {saved === "1" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          设置已保存成功。
        </p>
      ) : null}

      {adminPathChanged === "1" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          后台路径已更新，请优先使用当前新路径访问后台；如果环境未立即生效，请重启服务。
        </p>
      ) : null}

      <SettingsForm
        adminPath={adminPath}
        initialValues={initialValues}
        emailNotifications={emailNotifications}
        pageOptions={pageOptions}
      />
    </main>
  );
}

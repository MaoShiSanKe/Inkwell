import type { Metadata } from "next";
import Link from "next/link";

import { dashboardNavigationItems } from "@/components/admin/admin-navigation";
import { getAdminSession } from "@/lib/auth";

import { logoutAction } from "../actions";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

type AdminPageProps = {
  params: Promise<{
    adminPath: string;
  }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  const [{ adminPath }, session] = await Promise.all([params, getAdminSession()]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">后台首页</h1>
        <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
          选择一个模块开始管理站点内容。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardNavigationItems.map((item) => (
          <Link
            key={item.key}
            className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-6 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
            href={item.href(adminPath)}
          >
            <span className="text-lg font-semibold">{item.label}</span>
            <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {item.description}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          用户 #{session.userId ?? "—"}
        </p>
        <form action={logoutAction}>
          <input type="hidden" name="adminPath" value={adminPath} />
          <button
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            type="submit"
          >
            退出登录
          </button>
        </form>
      </div>
    </main>
  );
}

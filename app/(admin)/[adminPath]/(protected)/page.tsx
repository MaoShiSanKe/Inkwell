import type { Metadata } from "next";

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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Admin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">后台首页占位</h1>
        <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
          当前后台路径参数：<code className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{adminPath}</code>
        </p>
        <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
          当前登录用户 ID：<code className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{session.userId ?? "unknown"}</code>
        </p>
      </div>

      <form action={logoutAction}>
        <input type="hidden" name="adminPath" value={adminPath} />
        <button
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          type="submit"
        >
          退出登录
        </button>
      </form>
    </main>
  );
}

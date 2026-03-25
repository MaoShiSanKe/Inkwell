import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/auth";

import { loginAction } from "../actions";

export const metadata: Metadata = {
  title: "Admin Login",
};

type AdminLoginPageProps = {
  params: Promise<{
    adminPath: string;
  }>;
  searchParams: Promise<{
    redirect?: string;
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "missing_credentials":
      return "请输入邮箱和密码。";
    case "invalid_credentials":
      return "邮箱或密码错误。";
    case "auth_config":
      return "NEXTAUTH_SECRET 未配置，暂时无法登录。";
    default:
      return null;
  }
}

function sanitizeRedirect(adminPath: string, redirectTo?: string) {
  if (redirectTo && redirectTo.startsWith(`/${adminPath}`) && !redirectTo.startsWith("//")) {
    return redirectTo;
  }

  return `/${adminPath}`;
}

export default async function AdminLoginPage({
  params,
  searchParams,
}: AdminLoginPageProps) {
  const [{ adminPath }, { redirect: redirectTo, error }, session] = await Promise.all([
    params,
    searchParams,
    getAdminSession(),
  ]);
  const safeRedirect = sanitizeRedirect(adminPath, redirectTo);

  if (session.isAuthenticated) {
    redirect(safeRedirect);
  }

  const errorMessage = getErrorMessage(error);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Admin Login
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">后台登录</h1>
        <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
          当前后台路径参数：<code className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{adminPath}</code>
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage}
        </p>
      ) : null}

      <form action={loginAction} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
        <input type="hidden" name="adminPath" value={adminPath} />
        <input type="hidden" name="redirectTo" value={safeRedirect} />

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          邮箱
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            type="email"
            name="email"
            placeholder="admin@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          密码
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>

        <button
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          type="submit"
        >
          登录后台
        </button>
      </form>

      <div className="flex flex-col gap-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
        <p>
          登录保护已接入。当前使用签名的 <code>inkwell_admin_session</code> cookie 作为最小会话。
        </p>
        <p>
          如需创建首个管理员，请运行：<code>npm run admin:create -- &lt;email&gt; &lt;username&gt; &lt;displayName&gt; &lt;password&gt;</code>
        </p>
        <p>
          登录后将返回：<code className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{safeRedirect}</code>
        </p>
      </div>
    </main>
  );
}

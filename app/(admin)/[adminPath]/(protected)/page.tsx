import Link from "next/link";
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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Admin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">后台首页</h1>
        <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
          当前后台路径参数：<code className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{adminPath}</code>
        </p>
        <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
          当前登录用户 ID：<code className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{session.userId ?? "unknown"}</code>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-6 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
          href={`/${adminPath}/posts`}
        >
          <span className="text-lg font-semibold">文章管理</span>
          <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            查看当前文章列表，并继续进入创建、编辑等内容管理流程。
          </span>
        </Link>

        <Link
          className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-6 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
          href={`/${adminPath}/posts/new`}
        >
          <span className="text-lg font-semibold">新建文章</span>
          <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            创建新的草稿或直接发布文章，并自动写入初始修订记录。
          </span>
        </Link>

        <Link
          className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-6 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
          href={`/${adminPath}/media`}
        >
          <span className="text-lg font-semibold">媒体库</span>
          <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            上传本地图片或登记外链图片，并为文章 SEO 分享图提供统一选择入口。
          </span>
        </Link>

        <Link
          className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-6 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
          href={`/${adminPath}/comments`}
        >
          <span className="text-lg font-semibold">评论管理</span>
          <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            查看前台评论审核队列，完成批准、垃圾标记与回收站恢复操作。
          </span>
        </Link>

        <Link
          className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-6 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
          href={`/${adminPath}/categories`}
        >
          <span className="text-lg font-semibold">分类管理</span>
          <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            管理文章分类与两级层级结构，支撑前台分类归档和文章归类。
          </span>
        </Link>

        <Link
          className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-6 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
          href={`/${adminPath}/tags`}
        >
          <span className="text-lg font-semibold">标签管理</span>
          <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            管理文章标签，供标签归档页和文章编辑表单统一复用。
          </span>
        </Link>

        <Link
          className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-6 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
          href={`/${adminPath}/series`}
        >
          <span className="text-lg font-semibold">系列管理</span>
          <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            管理系列信息，先补齐后台内容组织能力与文章关联入口。
          </span>
        </Link>
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

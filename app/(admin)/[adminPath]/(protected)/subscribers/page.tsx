import Link from "next/link";

import { SubscriberManager } from "@/components/admin/subscriber-manager";
import { listAdminSubscribers } from "@/lib/admin/subscribers";

type AdminSubscribersPageProps = {
  params: Promise<{
    adminPath: string;
  }>;
  searchParams: Promise<{
    deleted?: string;
  }>;
};

export default async function AdminSubscribersPage({
  params,
  searchParams,
}: AdminSubscribersPageProps) {
  const [{ adminPath }, { deleted }] = await Promise.all([params, searchParams]);
  const subscribers = await listAdminSubscribers();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Audience
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">订阅者管理</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            管理公开邮件订阅列表。新文章发布时，系统会向这里的订阅者发送通知邮件。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          href={`/${adminPath}`}
        >
          返回后台
        </Link>
      </div>

      {deleted === "1" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          订阅者已删除。
        </p>
      ) : null}

      <SubscriberManager
        adminPath={adminPath}
        subscribers={subscribers.map((subscriber) => ({
          id: subscriber.id,
          email: subscriber.email,
          displayName: subscriber.displayName,
          createdAt: subscriber.createdAt.toLocaleString(),
        }))}
      />
    </main>
  );
}

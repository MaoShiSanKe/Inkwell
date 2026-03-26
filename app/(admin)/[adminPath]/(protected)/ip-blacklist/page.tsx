import Link from "next/link";

import { IpBlacklistManager } from "@/components/admin/ip-blacklist-form";
import { listAdminIpBlacklist } from "@/lib/admin/ip-blacklist";

type AdminIpBlacklistPageProps = {
  params: Promise<{
    adminPath: string;
  }>;
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    error?: string;
  }>;
};

export default async function AdminIpBlacklistPage({
  params,
  searchParams,
}: AdminIpBlacklistPageProps) {
  const [{ adminPath }, { created, deleted, error }] = await Promise.all([
    params,
    searchParams,
  ]);
  const entries = await listAdminIpBlacklist();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Security
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">IP 黑名单</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            管理被禁止访问站点的 IP 或 CIDR 网段。命中黑名单的请求会在应用层直接返回 403。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          href={`/${adminPath}`}
        >
          返回后台
        </Link>
      </div>

      {created === "1" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          黑名单已添加成功。
        </p>
      ) : null}

      {deleted === "1" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          黑名单记录已删除。
        </p>
      ) : null}

      {error === "delete_failed" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          删除黑名单记录失败，请稍后重试。
        </p>
      ) : null}

      <IpBlacklistManager
        adminPath={adminPath}
        entries={entries.map((entry) => ({
          id: entry.id,
          network: entry.network,
          reason: entry.reason,
          createdByDisplayName: entry.createdByDisplayName,
          expiresAt: entry.expiresAt ? entry.expiresAt.toLocaleString() : null,
          createdAt: entry.createdAt.toLocaleString(),
        }))}
      />
    </main>
  );
}

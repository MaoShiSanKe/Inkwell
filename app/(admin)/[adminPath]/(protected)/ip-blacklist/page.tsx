import { IpBlacklistManager } from "@/components/admin/ip-blacklist-form";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminPage, AdminPageHeader, AdminActionLink } from "@/components/admin/admin-page";
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
    <AdminPage width="wide">
      <AdminPageHeader
        eyebrow="Security"
        title="IP 黑名单"
        description="管理被禁止访问站点的 IP 或 CIDR 网段。命中黑名单的请求会在应用层直接返回 403。"
        actions={<AdminActionLink href={`/${adminPath}`} variant="secondary">返回后台</AdminActionLink>}
      />

      {created === "1" ? <AdminNotice tone="success">黑名单已添加成功。</AdminNotice> : null}
      {deleted === "1" ? <AdminNotice tone="warning">黑名单记录已删除。</AdminNotice> : null}
      {error === "delete_failed" ? (
        <AdminNotice tone="error">删除黑名单记录失败，请稍后重试。</AdminNotice>
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
    </AdminPage>
  );
}

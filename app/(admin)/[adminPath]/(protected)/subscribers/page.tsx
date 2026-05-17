import { SubscriberManager } from "@/components/admin/subscriber-manager";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminPage, AdminPageHeader, AdminActionLink } from "@/components/admin/admin-page";
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
    <AdminPage width="wide">
      <AdminPageHeader
        eyebrow="Audience"
        title="订阅者管理"
        description="管理公开邮件订阅列表。新文章发布时，系统会向这里的订阅者发送通知邮件。"
        actions={<AdminActionLink href={`/${adminPath}`} variant="secondary">返回后台</AdminActionLink>}
      />

      {deleted === "1" ? <AdminNotice tone="warning">订阅者已删除。</AdminNotice> : null}

      <SubscriberManager
        adminPath={adminPath}
        subscribers={subscribers.map((subscriber) => ({
          id: subscriber.id,
          email: subscriber.email,
          displayName: subscriber.displayName,
          createdAt: subscriber.createdAt.toLocaleString(),
        }))}
      />
    </AdminPage>
  );
}

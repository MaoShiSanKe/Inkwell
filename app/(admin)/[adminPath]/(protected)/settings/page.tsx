import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
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
    <AdminPage>
      <AdminPageHeader
        actions={<AdminBackLink adminPath={adminPath} />}
        description="管理后台路径、修订保留策略、自动摘要长度、评论默认审核模式以及邮件通知场景。"
        eyebrow="Settings"
        title="后台设置"
      />

      {saved === "1" ? <AdminNotice tone="success">设置已保存成功。</AdminNotice> : null}

      {adminPathChanged === "1" ? (
        <AdminNotice tone="warning">
          后台路径已更新，请优先使用当前新路径访问后台；如果环境未立即生效，请重启服务。
        </AdminNotice>
      ) : null}

      <SettingsForm
        adminPath={adminPath}
        initialValues={initialValues}
        emailNotifications={emailNotifications}
        pageOptions={pageOptions}
      />
    </AdminPage>
  );
}

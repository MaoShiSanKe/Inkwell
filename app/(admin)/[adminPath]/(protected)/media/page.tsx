import { AdminMediaForm } from "@/components/admin/media-form";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminPage, AdminPageHeader, AdminActionLink } from "@/components/admin/admin-page";
import { listAdminMedia } from "@/lib/admin/media";

type AdminMediaPageProps = {
  params: Promise<{
    adminPath: string;
  }>;
  searchParams: Promise<{
    uploaded?: string;
    created?: string;
    deleted?: string;
    error?: string;
  }>;
};

export default async function AdminMediaPage({
  params,
  searchParams,
}: AdminMediaPageProps) {
  const [{ adminPath }, { uploaded, created, deleted, error }] = await Promise.all([
    params,
    searchParams,
  ]);
  const mediaItems = await listAdminMedia();

  return (
    <AdminPage width="wide">
      <AdminPageHeader
        eyebrow="Media"
        title="媒体库"
        description={(
          <>
            管理本地图片与外链图片，供后台 SEO 分享图统一复用。本地上传会自动保存到
            <code className="mx-1 rounded bg-slate-100 px-2 py-1 text-sm dark:bg-slate-800">
              public/uploads/images/YYYY/MM/
            </code>
            并生成 WebP 缩略图。
          </>
        )}
        actions={<AdminActionLink href={`/${adminPath}`} variant="secondary">返回后台</AdminActionLink>}
      />

      {uploaded === "1" ? <AdminNotice tone="success">图片已上传，并写入媒体库。</AdminNotice> : null}
      {created === "1" ? <AdminNotice tone="success">外链图片已添加到媒体库。</AdminNotice> : null}
      {deleted === "1" ? <AdminNotice tone="warning">媒体已删除。</AdminNotice> : null}
      {error === "delete_failed" ? (
        <AdminNotice tone="error">删除媒体失败，请稍后重试。</AdminNotice>
      ) : null}

      <AdminMediaForm
        adminPath={adminPath}
        mediaItems={mediaItems.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        }))}
      />
    </AdminPage>
  );
}

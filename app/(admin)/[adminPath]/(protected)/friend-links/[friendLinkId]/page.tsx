import Link from "next/link";
import { notFound } from "next/navigation";

import { FriendLinkEditForm } from "@/components/admin/friend-link-edit-form";
import { getAdminFriendLinkEditorData } from "@/lib/admin/friend-links";
import { listAdminMediaOptions } from "@/lib/admin/media";

import { moveFriendLinkToTrashAction, restoreFriendLinkAction } from "../actions";

type AdminFriendLinkEditPageProps = {
  params: Promise<{
    adminPath: string;
    friendLinkId: string;
  }>;
};

export default async function AdminFriendLinkEditPage({ params }: AdminFriendLinkEditPageProps) {
  const { adminPath, friendLinkId } = await params;
  const numericFriendLinkId = Number.parseInt(friendLinkId, 10);

  if (!Number.isInteger(numericFriendLinkId) || numericFriendLinkId <= 0) {
    notFound();
  }

  const [friendLink, mediaOptions] = await Promise.all([
    getAdminFriendLinkEditorData(numericFriendLinkId),
    listAdminMediaOptions(),
  ]);

  if (!friendLink) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Friend Links</p>
          <h1 className="text-3xl font-semibold tracking-tight">编辑友链</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">修改站点名称、链接、展示顺序与 Logo。</p>
        </div>
        <Link className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" href={`/${adminPath}/friend-links`}>返回列表</Link>
      </div>

      <FriendLinkEditForm
        adminPath={adminPath}
        friendLinkId={friendLink.id}
        mediaOptions={mediaOptions}
        initialValues={friendLink.values}
      />

      {friendLink.currentStatus === "trash" ? (
        <form action={restoreFriendLinkAction} className="inline-flex">
          <input type="hidden" name="adminPath" value={adminPath} />
          <input type="hidden" name="friendLinkId" value={friendLink.id} />
          <button className="inline-flex items-center justify-center rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40" type="submit">恢复为草稿</button>
        </form>
      ) : (
        <form action={moveFriendLinkToTrashAction} className="inline-flex">
          <input type="hidden" name="adminPath" value={adminPath} />
          <input type="hidden" name="friendLinkId" value={friendLink.id} />
          <button className="inline-flex items-center justify-center rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40" type="submit">移入回收站</button>
        </form>
      )}
    </main>
  );
}

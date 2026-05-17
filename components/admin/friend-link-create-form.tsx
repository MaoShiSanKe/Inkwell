"use client";

import { useActionState } from "react";

import { createFriendLinkAction } from "@/app/(admin)/[adminPath]/(protected)/friend-links/actions";
import { initialCreateFriendLinkState } from "@/app/(admin)/[adminPath]/(protected)/friend-links/form-state";
import { AdminNotice } from "@/components/admin/admin-feedback";
import {
  AdminField,
  AdminFormShell,
  AdminSelect,
  AdminTextArea,
  AdminTextInput,
  adminSubmitButtonClassName,
} from "@/components/admin/admin-form";
import { MediaPicker, type MediaPickerOption } from "@/components/admin/media-picker";

type FriendLinkCreateFormProps = {
  adminPath: string;
  mediaOptions: MediaPickerOption[];
};

export function FriendLinkCreateForm({ adminPath, mediaOptions }: FriendLinkCreateFormProps) {
  const [state = initialCreateFriendLinkState, formAction, isPending] = useActionState(
    createFriendLinkAction,
    initialCreateFriendLinkState,
  );

  return (
    <AdminFormShell action={formAction}>
      <input type="hidden" name="adminPath" value={adminPath} />

      {state.errors.form ? <AdminNotice tone="error">{state.errors.form}</AdminNotice> : null}

      <AdminField label="站点名" error={state.errors.siteName}>
        <AdminTextInput type="text" name="siteName" defaultValue={state.values.siteName} required />
      </AdminField>

      <AdminField label="链接地址" error={state.errors.url}>
        <AdminTextInput
          type="url"
          name="url"
          defaultValue={state.values.url}
          required
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="https://example.com"
        />
      </AdminField>

      <AdminField label="描述" error={state.errors.description}>
        <AdminTextArea
          name="description"
          defaultValue={state.values.description}
          placeholder="简要说明这个站点的内容与推荐理由。"
        />
      </AdminField>

      <MediaPicker
        adminPath={adminPath}
        mediaOptions={mediaOptions}
        value={state.values.logoMediaId}
        error={state.errors.logoMediaId}
        fieldName="logoMediaId"
        label="Logo"
        emptyLabel="不设置 Logo"
        helperText="可从媒体库选择一张 Logo，用于前台友链卡片展示。"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="排序" error={state.errors.sortOrder}>
          <AdminTextInput type="number" name="sortOrder" defaultValue={state.values.sortOrder} required />
        </AdminField>

        <AdminField label="状态">
          <AdminSelect name="status" defaultValue={state.values.status}>
            <option value="draft">草稿</option>
            <option value="published">发布</option>
          </AdminSelect>
        </AdminField>
      </div>

      <button className={adminSubmitButtonClassName} type="submit" disabled={isPending}>
        {isPending ? "保存中..." : "保存友链"}
      </button>
    </AdminFormShell>
  );
}

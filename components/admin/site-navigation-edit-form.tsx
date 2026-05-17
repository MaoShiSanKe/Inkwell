"use client";

import { useActionState } from "react";

import { updateSiteNavigationAction } from "@/app/(admin)/[adminPath]/(protected)/site-navigation/actions";
import { AdminNotice } from "@/components/admin/admin-feedback";
import {
  AdminField,
  AdminFormShell,
  AdminSelect,
  AdminTextInput,
  adminSubmitButtonClassName,
} from "@/components/admin/admin-form";
import {
  createSiteNavigationFormState,
  type SiteNavigationFormValues,
} from "@/lib/admin/site-navigation-form";

export function SiteNavigationEditForm({
  adminPath,
  itemId,
  initialValues,
}: {
  adminPath: string;
  itemId: number;
  initialValues: SiteNavigationFormValues;
}) {
  const initialState = createSiteNavigationFormState(initialValues);
  const [state = initialState, formAction, isPending] = useActionState(
    updateSiteNavigationAction,
    initialState,
  );

  return (
    <AdminFormShell action={formAction}>
      <input type="hidden" name="adminPath" value={adminPath} />
      <input type="hidden" name="itemId" value={itemId} />

      {state.errors.form ? <AdminNotice tone="error">{state.errors.form}</AdminNotice> : null}

      <AdminField label="导航文案" error={state.errors.label}>
        <AdminTextInput type="text" name="label" defaultValue={state.values.label} required />
      </AdminField>

      <AdminField label="链接地址" error={state.errors.url}>
        <AdminTextInput
          type="text"
          name="url"
          defaultValue={state.values.url}
          required
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </AdminField>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="排序" error={state.errors.sortOrder}>
          <AdminTextInput type="number" name="sortOrder" defaultValue={state.values.sortOrder} required />
        </AdminField>

        <AdminField label="新标签页打开">
          <AdminSelect name="openInNewTab" defaultValue={state.values.openInNewTab}>
            <option value="false">否</option>
            <option value="true">是</option>
          </AdminSelect>
        </AdminField>

        <AdminField label="是否显示">
          <AdminSelect name="visible" defaultValue={state.values.visible}>
            <option value="true">显示</option>
            <option value="false">隐藏</option>
          </AdminSelect>
        </AdminField>
      </div>

      <button className={adminSubmitButtonClassName} type="submit" disabled={isPending}>
        {isPending ? "保存中..." : "更新导航项"}
      </button>
    </AdminFormShell>
  );
}

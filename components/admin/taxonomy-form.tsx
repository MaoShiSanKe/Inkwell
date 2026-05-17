"use client";

import { useActionState } from "react";

import { AdminNotice } from "@/components/admin/admin-feedback";
import {
  AdminField,
  AdminFormShell,
  AdminSelect,
  AdminTextArea,
  AdminTextInput,
  adminSubmitButtonClassName,
} from "@/components/admin/admin-form";
import {
  createTaxonomyFormState,
  initialTaxonomyFormState,
  type TaxonomyFormState,
  type TaxonomyFormValues,
} from "@/lib/admin/taxonomy-form";
import type {
  AdminTaxonomyKind,
  AdminTaxonomyOption,
} from "@/lib/admin/taxonomies";

type TaxonomyFormAction = (
  state: TaxonomyFormState,
  formData: FormData,
) => Promise<TaxonomyFormState>;

type TaxonomyFormProps = {
  adminPath: string;
  kind: AdminTaxonomyKind;
  mode: "create" | "edit";
  action: TaxonomyFormAction;
  taxonomyId?: number;
  initialValues?: TaxonomyFormValues;
  parentOptions?: AdminTaxonomyOption[];
};

const taxonomyLabels: Record<AdminTaxonomyKind, string> = {
  category: "分类",
  tag: "标签",
  series: "系列",
};

export function TaxonomyForm({
  adminPath,
  kind,
  mode,
  action,
  taxonomyId,
  initialValues,
  parentOptions = [],
}: TaxonomyFormProps) {
  const initialState = initialValues
    ? createTaxonomyFormState(initialValues)
    : initialTaxonomyFormState;
  const [state = initialState, formAction, isPending] = useActionState(
    action,
    initialState,
  );
  const label = taxonomyLabels[kind];
  const isEditing = mode === "edit";

  return (
    <AdminFormShell action={formAction}>
      <input type="hidden" name="adminPath" value={adminPath} />
      {taxonomyId ? <input type="hidden" name="taxonomyId" value={taxonomyId} /> : null}

      {state.errors.form ? <AdminNotice tone="error">{state.errors.form}</AdminNotice> : null}

      <AdminField label="名称" error={state.errors.name}>
        <AdminTextInput type="text" name="name" defaultValue={state.values.name} required />
      </AdminField>

      <AdminField
        label="Slug"
        helperText={isEditing ? `为避免影响当前公开链接，编辑时不允许修改 ${label} slug。` : null}
        error={state.errors.slug}
      >
        <AdminTextInput
          className="read-only:bg-slate-50 read-only:text-slate-500 dark:read-only:bg-slate-900 dark:read-only:text-slate-400"
          type="text"
          name="slug"
          defaultValue={state.values.slug}
          required
          readOnly={isEditing}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </AdminField>

      {kind === "category" ? (
        <AdminField
          label="父分类"
          helperText="仅允许选择顶级分类作为父级，系统会限制最多两层分类结构。"
          error={state.errors.parentId}
        >
          <AdminSelect name="parentId" defaultValue={state.values.parentId}>
            <option value="">设为顶级分类</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
      ) : null}

      <AdminField label="描述">
        <AdminTextArea
          name="description"
          defaultValue={state.values.description}
          placeholder={`用于补充说明这个${label}的用途，可留空。`}
        />
      </AdminField>

      <div className="flex items-center gap-3">
        <button className={adminSubmitButtonClassName} type="submit" disabled={isPending}>
          {isPending ? "保存中..." : isEditing ? `保存${label}` : `创建${label}`}
        </button>
      </div>
    </AdminFormShell>
  );
}

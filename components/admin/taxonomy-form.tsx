"use client";

import { useActionState } from "react";

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
    <form
      action={formAction}
      className="flex flex-col gap-6 rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
    >
      <input type="hidden" name="adminPath" value={adminPath} />
      {taxonomyId ? <input type="hidden" name="taxonomyId" value={taxonomyId} /> : null}

      {state.errors.form ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {state.errors.form}
        </p>
      ) : null}

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        名称
        <input
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          type="text"
          name="name"
          defaultValue={state.values.name}
          required
        />
        {state.errors.name ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.name}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        Slug
        <input
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 read-only:bg-slate-50 read-only:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:read-only:bg-slate-900 dark:read-only:text-slate-400"
          type="text"
          name="slug"
          defaultValue={state.values.slug}
          required
          readOnly={isEditing}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />
        {isEditing ? (
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            为避免影响当前公开链接，编辑时不允许修改 {label} slug。
          </span>
        ) : null}
        {state.errors.slug ? (
          <span className="text-sm text-red-600 dark:text-red-300">{state.errors.slug}</span>
        ) : null}
      </label>

      {kind === "category" ? (
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          父分类
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            name="parentId"
            defaultValue={state.values.parentId}
          >
            <option value="">设为顶级分类</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            仅允许选择顶级分类作为父级，系统会限制最多两层分类结构。
          </span>
          {state.errors.parentId ? (
            <span className="text-sm text-red-600 dark:text-red-300">
              {state.errors.parentId}
            </span>
          ) : null}
        </label>
      ) : null}

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        描述
        <textarea
          className="min-h-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          name="description"
          defaultValue={state.values.description}
          placeholder={`用于补充说明这个${label}的用途，可留空。`}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "保存中..." : isEditing ? `保存${label}` : `创建${label}`}
        </button>
      </div>
    </form>
  );
}

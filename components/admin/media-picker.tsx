"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type MediaPickerOption = {
  id: number;
  label: string;
  source: "local" | "external";
  previewUrl: string | null;
  assetUrl: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
};

type MediaPickerProps = {
  adminPath: string;
  mediaOptions: MediaPickerOption[];
  value: string;
  error?: string;
  fieldName?: string;
  label?: string;
  emptyLabel?: string;
  manageLabel?: string;
  helperText?: string;
};

function formatSourceLabel(source: "local" | "external") {
  return source === "local" ? "本地图片" : "外链图片";
}

function formatDimensions(width: number | null, height: number | null) {
  if (width === null && height === null) {
    return "未记录尺寸";
  }

  return `${width ?? "—"} × ${height ?? "—"}`;
}

export function MediaPicker({
  adminPath,
  mediaOptions,
  value,
  error,
  fieldName = "ogImageMediaId",
  label = "OG 图",
  emptyLabel = "不设置 OG 图",
  manageLabel = "前往媒体库",
  helperText = "从媒体库选择一张图片，作为文章的社交分享图。",
}: MediaPickerProps) {
  const [selectedId, setSelectedId] = useState(value);

  useEffect(() => {
    setSelectedId(value);
  }, [value]);

  const selectedMedia = useMemo(
    () => mediaOptions.find((option) => String(option.id) === selectedId) ?? null,
    [mediaOptions, selectedId],
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            name={fieldName}
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">{emptyLabel}</option>
            {mediaOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Link
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          href={`/${adminPath}/media`}
        >
          {manageLabel}
        </Link>
      </div>

      {error ? <span className="text-sm text-red-600 dark:text-red-300">{error}</span> : null}

      {selectedMedia ? (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row">
          <div
            className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 sm:w-40"
            style={
              selectedMedia.previewUrl
                ? {
                    backgroundImage: `url(${selectedMedia.previewUrl})`,
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover",
                  }
                : undefined
            }
          >
            {selectedMedia.previewUrl ? null : formatSourceLabel(selectedMedia.source)}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {selectedMedia.label}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatSourceLabel(selectedMedia.source)} · {formatDimensions(selectedMedia.width, selectedMedia.height)}
            </p>
            <p className="break-all text-xs text-slate-500 dark:text-slate-400">
              {selectedMedia.assetUrl ?? "未配置资源地址"}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          {mediaOptions.length === 0
            ? "媒体库还没有可用图片，请先上传本地图片或添加外链图片。"
            : helperText}
        </p>
      )}
    </div>
  );
}

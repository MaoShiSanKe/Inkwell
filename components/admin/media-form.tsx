"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createExternalImageAction,
  deleteMediaAction,
  uploadLocalImageAction,
} from "@/app/(admin)/[adminPath]/(protected)/media/actions";
import {
  initialExternalImageFormState,
  initialLocalImageUploadState,
} from "@/lib/admin/media-form";

export type AdminMediaListItemView = {
  id: number;
  source: "local" | "external";
  previewUrl: string | null;
  assetUrl: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  uploaderDisplayName: string | null;
  createdAt: string;
};

type AdminMediaFormProps = {
  adminPath: string;
  mediaItems: AdminMediaListItemView[];
};

function formatSourceLabel(source: "local" | "external") {
  return source === "local" ? "本地" : "外链";
}

function formatDimensions(width: number | null, height: number | null) {
  if (width === null && height === null) {
    return "未记录尺寸";
  }

  return `${width ?? "—"} × ${height ?? "—"}`;
}

function formatBytes(value: number | null) {
  if (value === null) {
    return "—";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMediaTitle(item: AdminMediaListItemView) {
  return item.altText?.trim() || item.originalFilename?.trim() || item.assetUrl?.trim() || `媒体 #${item.id}`;
}

export function AdminMediaForm({ adminPath, mediaItems }: AdminMediaFormProps) {
  const [localState = initialLocalImageUploadState, localFormAction, isUploading] = useActionState(
    uploadLocalImageAction,
    initialLocalImageUploadState,
  );
  const [externalState = initialExternalImageFormState, externalFormAction, isCreatingExternal] =
    useActionState(createExternalImageAction, initialExternalImageFormState);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          action={localFormAction}
          encType="multipart/form-data"
          className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
        >
          <input type="hidden" name="adminPath" value={adminPath} />

          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">本地上传</h2>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              上传图片后，系统会自动写入
              <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
                public/uploads/images/YYYY/MM/
              </code>
              ，并生成 WebP 原图与 <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">-thumb</code>
              缩略图。
            </p>
          </div>

          {localState.errors.form ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {localState.errors.form}
            </p>
          ) : null}

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            图片文件
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="file"
              name="image"
              accept="image/*"
            />
            {localState.errors.image ? (
              <span className="text-sm text-red-600 dark:text-red-300">{localState.errors.image}</span>
            ) : null}
            {localState.values.fileName ? (
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                上次选择：{localState.values.fileName}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Alt 文本
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="text"
              name="altText"
              defaultValue={localState.values.altText}
              placeholder="用于 OG 与无障碍描述"
            />
            {localState.errors.altText ? (
              <span className="text-sm text-red-600 dark:text-red-300">{localState.errors.altText}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            说明
            <textarea
              className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              name="caption"
              defaultValue={localState.values.caption}
              placeholder="可选的后台说明文字"
            />
          </label>

          <button
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            type="submit"
            disabled={isUploading}
          >
            {isUploading ? "上传中..." : "上传图片"}
          </button>
        </form>

        <form
          action={externalFormAction}
          className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
        >
          <input type="hidden" name="adminPath" value={adminPath} />

          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">外链图片</h2>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              为第三方 CDN、图床或品牌资源登记稳定 URL，供文章 SEO 与社交分享图复用。
            </p>
          </div>

          {externalState.errors.form ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {externalState.errors.form}
            </p>
          ) : null}

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            图片地址
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="url"
              name="externalUrl"
              defaultValue={externalState.values.externalUrl}
              placeholder="https://cdn.example.com/og-image.jpg"
            />
            {externalState.errors.externalUrl ? (
              <span className="text-sm text-red-600 dark:text-red-300">{externalState.errors.externalUrl}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Alt 文本
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="text"
              name="altText"
              defaultValue={externalState.values.altText}
              placeholder="用于 OG 与无障碍描述"
            />
            {externalState.errors.altText ? (
              <span className="text-sm text-red-600 dark:text-red-300">{externalState.errors.altText}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            说明
            <textarea
              className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              name="caption"
              defaultValue={externalState.values.caption}
              placeholder="可选的后台说明文字"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              宽度
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="number"
                min="1"
                step="1"
                name="width"
                defaultValue={externalState.values.width}
              />
              {externalState.errors.width ? (
                <span className="text-sm text-red-600 dark:text-red-300">{externalState.errors.width}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              高度
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="number"
                min="1"
                step="1"
                name="height"
                defaultValue={externalState.values.height}
              />
              {externalState.errors.height ? (
                <span className="text-sm text-red-600 dark:text-red-300">{externalState.errors.height}</span>
              ) : null}
            </label>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            type="submit"
            disabled={isCreatingExternal}
          >
            {isCreatingExternal ? "添加中..." : "添加外链"}
          </button>
        </form>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            媒体列表
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">共 {mediaItems.length} 个资源</p>
        </div>

        {mediaItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <p className="text-lg font-medium">媒体库还是空的</p>
            <p className="mt-2 text-sm">上传一张图片或添加一个外链后，就能在文章 SEO 区域直接复用。</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900/60">
                  <tr className="text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                    <th className="px-4 py-3">预览</th>
                    <th className="px-4 py-3">资源</th>
                    <th className="px-4 py-3">来源</th>
                    <th className="px-4 py-3">尺寸 / 大小</th>
                    <th className="px-4 py-3">上传者</th>
                    <th className="px-4 py-3">创建时间</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                  {mediaItems.map((item) => (
                    <tr key={item.id} className="align-top text-sm text-slate-700 dark:text-slate-200">
                      <td className="px-4 py-3">
                        <div
                          className="flex h-20 w-28 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                          style={
                            item.previewUrl
                              ? {
                                  backgroundImage: `url(${item.previewUrl})`,
                                  backgroundPosition: "center",
                                  backgroundRepeat: "no-repeat",
                                  backgroundSize: "cover",
                                }
                              : undefined
                          }
                        >
                          {item.previewUrl ? null : formatSourceLabel(item.source)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-sm flex-col gap-1">
                          <span className="font-medium">{formatMediaTitle(item)}</span>
                          {item.caption ? (
                            <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                              {item.caption}
                            </span>
                          ) : null}
                          <span className="break-all font-mono text-xs text-slate-500 dark:text-slate-400">
                            {item.assetUrl ?? "未配置资源地址"}
                          </span>
                          {item.assetUrl ? (
                            <Link
                              href={item.assetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-slate-600 underline underline-offset-4 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                            >
                              打开资源
                            </Link>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span>{formatSourceLabel(item.source)}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {item.mimeType ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span>{formatDimensions(item.width, item.height)}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatBytes(item.sizeBytes)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{item.uploaderDisplayName ?? "系统"}</td>
                      <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <form action={deleteMediaAction} className="inline-flex">
                          <input type="hidden" name="adminPath" value={adminPath} />
                          <input type="hidden" name="mediaId" value={item.id} />
                          <button
                            className="inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                            type="submit"
                          >
                            删除
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

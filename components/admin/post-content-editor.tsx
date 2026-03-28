"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { type MediaPickerOption } from "@/components/admin/media-picker";
import {
  buildPostContentImageMarkdown,
  insertPostContentBlock,
} from "@/lib/admin/post-content-media";

type PostContentEditorProps = {
  adminPath: string;
  mediaOptions: MediaPickerOption[];
  value: string;
  error?: string;
};

export function PostContentEditor({
  adminPath,
  mediaOptions,
  value,
  error,
}: PostContentEditorProps) {
  const [contentValue, setContentValue] = useState(value);
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [insertMessage, setInsertMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setContentValue(value);
  }, [value]);

  const selectedMedia = useMemo(
    () => mediaOptions.find((option) => String(option.id) === selectedMediaId) ?? null,
    [mediaOptions, selectedMediaId],
  );

  const imageMarkdown = selectedMedia
    ? buildPostContentImageMarkdown({
        altText: selectedMedia.altText,
        assetUrl: selectedMedia.assetUrl,
      })
    : null;

  function handleInsertMedia() {
    if (!imageMarkdown) {
      return;
    }

    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? contentValue.length;
    const selectionEnd = textarea?.selectionEnd ?? contentValue.length;
    const result = insertPostContentBlock(contentValue, imageMarkdown, selectionStart, selectionEnd);

    setContentValue(result.value);
    setInsertMessage("已将所选图片插入正文。公开文章页会按图片块渲染。");

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            插入媒体
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={selectedMediaId}
              onChange={(event) => {
                setSelectedMediaId(event.target.value);
                setInsertMessage(null);
              }}
            >
              <option value="">选择媒体库图片</option>
              {mediaOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              type="button"
              onClick={handleInsertMedia}
              disabled={!imageMarkdown}
            >
              插入到正文
            </button>
            <Link
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              href={`/${adminPath}/media`}
            >
              前往媒体库
            </Link>
          </div>
        </div>

        {selectedMedia ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            <p>{selectedMedia.label}</p>
            <p className="break-all">{selectedMedia.assetUrl ?? "未配置资源地址，暂时无法插入。"}</p>
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            {mediaOptions.length === 0
              ? "媒体库还没有可用图片，请先上传本地图片或添加外链图片。"
              : "选择一张媒体库图片，系统会在当前光标位置插入 Markdown 图片语法。"}
          </p>
        )}

        {insertMessage ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">{insertMessage}</p>
        ) : null}
      </div>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        正文
        <textarea
          ref={textareaRef}
          className="min-h-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          name="content"
          value={contentValue}
          onChange={(event) => {
            setContentValue(event.target.value);
            setInsertMessage(null);
          }}
          required
        />
        <span className="text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
          支持现有纯文本标题语法，也支持通过“插入到正文”写入 Markdown 图片块。
        </span>
        {error ? <span className="text-sm text-red-600 dark:text-red-300">{error}</span> : null}
      </label>
    </div>
  );
}

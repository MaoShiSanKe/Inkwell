"use client";

import { useActionState, useMemo, useState } from "react";

import {
  saveEmailNotificationsAction,
  saveSettingsAction,
} from "@/app/(admin)/[adminPath]/(protected)/settings/actions";
import { toScheduledAtIso } from "@/lib/admin/post-form";
import {
  createEmailNotificationsFormState,
  createSettingsFormState,
  type SettingsFormValues,
} from "@/lib/admin/settings-form";
import type { AdminPageListItem } from "@/lib/admin/pages";
import type { EmailNotificationScenario } from "@/lib/settings-config";

type SettingsFormProps = {
  adminPath: string;
  initialValues: SettingsFormValues;
  emailNotifications: EmailNotificationScenario[];
  pageOptions: AdminPageListItem[];
};

export function SettingsForm({ adminPath, initialValues, emailNotifications, pageOptions }: SettingsFormProps) {
  const initialState = createSettingsFormState(initialValues);
  const [state = initialState, formAction, isPending] = useActionState(
    saveSettingsAction,
    initialState,
  );
  const initialEmailState = createEmailNotificationsFormState(emailNotifications);
  const [emailState = initialEmailState, emailFormAction, isSavingEmailNotifications] = useActionState(
    saveEmailNotificationsAction,
    initialEmailState,
  );
  const [publicNoticeStartAtDraft, setPublicNoticeStartAtDraft] = useState<string | null>(null);
  const [publicNoticeEndAtDraft, setPublicNoticeEndAtDraft] = useState<string | null>(null);
  const publicNoticeStartAtValue = publicNoticeStartAtDraft ?? state.values.public_notice_start_at;
  const publicNoticeEndAtValue = publicNoticeEndAtDraft ?? state.values.public_notice_end_at;
  const publicNoticeStartAtIso = useMemo(
    () => toScheduledAtIso(publicNoticeStartAtValue),
    [publicNoticeStartAtValue],
  );
  const publicNoticeEndAtIso = useMemo(
    () => toScheduledAtIso(publicNoticeEndAtValue),
    [publicNoticeEndAtValue],
  );
  const recommendedPageOptions = useMemo(
    () =>
      pageOptions.map((page) => ({
        value: String(page.id),
        label: `${page.title} (/${page.slug}) · ${
          page.status === "published" ? "已发布" : page.status === "draft" ? "草稿" : "回收站"
        }`,
      })),
    [pageOptions],
  );

  return (
    <div className="flex flex-col gap-6">
      <form
        action={formAction}
        className="flex flex-col gap-6 rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
      >
        <input type="hidden" name="adminPath" value={adminPath} />
        <input type="hidden" name="public_notice_start_at_iso" value={publicNoticeStartAtIso} />
        <input type="hidden" name="public_notice_end_at_iso" value={publicNoticeEndAtIso} />

        {state.errors.form ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {state.errors.form}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            后台路径
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="text"
              name="admin_path"
              defaultValue={state.values.admin_path}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              仅允许小写字母、数字和短横线。修改后如路由未立即生效，请重启服务。
            </span>
            {state.errors.admin_path ? (
              <span className="text-sm text-red-600 dark:text-red-300">
                {state.errors.admin_path}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            评论审核模式
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              name="comment_moderation"
              defaultValue={state.values.comment_moderation}
            >
              <option value="pending">待审核</option>
              <option value="approved">直接通过</option>
            </select>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              控制新评论默认进入待审核还是直接公开，白名单用户仍会跳过审核。
            </span>
            {state.errors.comment_moderation ? (
              <span className="text-sm text-red-600 dark:text-red-300">
                {state.errors.comment_moderation}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            修订保留数量
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="number"
              min="1"
              step="1"
              name="revision_limit"
              defaultValue={state.values.revision_limit}
            />
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              每篇文章最多保留多少条修订记录，超过后自动清理最旧项。
            </span>
            {state.errors.revision_limit ? (
              <span className="text-sm text-red-600 dark:text-red-300">
                {state.errors.revision_limit}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            修订保留天数
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="number"
              min="0"
              step="1"
              name="revision_ttl_days"
              defaultValue={state.values.revision_ttl_days}
            />
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              已发布文章的草稿修订超过该天数后会被后台清理；填 0 表示仅按数量上限控制。
            </span>
            {state.errors.revision_ttl_days ? (
              <span className="text-sm text-red-600 dark:text-red-300">
                {state.errors.revision_ttl_days}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
            自动摘要长度
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="number"
              min="1"
              step="1"
              name="excerpt_length"
              defaultValue={state.values.excerpt_length}
            />
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              当文章摘要留空时，系统会从正文纯文本截取前 N 个字符作为摘要。
            </span>
            {state.errors.excerpt_length ? (
              <span className="text-sm text-red-600 dark:text-red-300">
                {state.errors.excerpt_length}
              </span>
            ) : null}
          </label>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          修改后台路径后，建议立即使用新路径重新访问后台，并确认部署环境中的进程或缓存策略不会延迟生效。
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              SMTP 配置
            </h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              配置真实邮件发送所需的 SMTP 连接与发件人信息。未完整配置时，通知场景会自动跳过发送。
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              SMTP Host
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="smtp_host"
                defaultValue={state.values.smtp_host}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {state.errors.smtp_host ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.smtp_host}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              SMTP 端口
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="number"
                min="1"
                step="1"
                name="smtp_port"
                defaultValue={state.values.smtp_port}
              />
              {state.errors.smtp_port ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.smtp_port}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              SMTP 加密
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="smtp_secure"
                defaultValue={state.values.smtp_secure}
              >
                <option value="false">STARTTLS / 普通端口（如 587）</option>
                <option value="true">SSL/TLS（如 465）</option>
              </select>
              {state.errors.smtp_secure ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.smtp_secure}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              SMTP 用户名
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="smtp_username"
                defaultValue={state.values.smtp_username}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {state.errors.smtp_username ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.smtp_username}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              SMTP 密码
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="password"
                name="smtp_password"
                defaultValue={state.values.smtp_password}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {state.errors.smtp_password ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.smtp_password}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              发件邮箱
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="email"
                name="smtp_from_email"
                defaultValue={state.values.smtp_from_email}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {state.errors.smtp_from_email ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.smtp_from_email}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
              发件人名称
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="smtp_from_name"
                defaultValue={state.values.smtp_from_name}
              />
              {state.errors.smtp_from_name ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.smtp_from_name}</span>
              ) : null}
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Umami 统计
            </h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              配置公开前台页面使用的 Umami 统计脚本。后台页面不会注入该脚本。
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Umami 开关
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="umami_enabled"
                defaultValue={state.values.umami_enabled}
              >
                <option value="false">关闭</option>
                <option value="true">启用</option>
              </select>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                仅对公开博客页面生效，后台登录页与管理页不会加载 Umami。
              </span>
              {state.errors.umami_enabled ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.umami_enabled}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Website ID
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="umami_website_id"
                defaultValue={state.values.umami_website_id}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {state.errors.umami_website_id ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.umami_website_id}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
              脚本地址
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="umami_script_url"
                defaultValue={state.values.umami_script_url}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="https://umami.example.com/script.js"
              />
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                支持完整 http(s) 地址，或站内反向代理后的根相对地址，例如 `/stats/script.js`。
              </span>
              {state.errors.umami_script_url ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.umami_script_url}</span>
              ) : null}
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              公开站点代码与样式
            </h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              仅对公开前台页面生效，可用于站点验证标签、统计脚本、客服组件与轻量样式覆盖。后台页面不会注入这些内容。
            </p>
          </div>

          <div className="grid gap-6">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              页头代码（Head）
              <textarea
                className="min-h-40 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_head_html"
                defaultValue={state.values.public_head_html}
                spellCheck={false}
                placeholder={'<meta name="example-verification" content="..." />'}
              />
              <span className="text-xs font-normal leading-6 text-slate-500 dark:text-slate-400">
                内容会插入公开站点页面的 head。适合验证标签、统计初始化片段或自定义 style / script 标签。不要粘贴密钥、私有令牌或不受信任的第三方脚本。
              </span>
              {state.errors.public_head_html ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_head_html}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              页尾代码（Body 结束前）
              <textarea
                className="min-h-40 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_footer_html"
                defaultValue={state.values.public_footer_html}
                spellCheck={false}
                placeholder={'<div data-widget="example">widget</div>'}
              />
              <span className="text-xs font-normal leading-6 text-slate-500 dark:text-slate-400">
                内容会插入公开站点页面底部，适合客服组件、埋点容器或需要在 body 尾部加载的脚本。后台页面与后台登录页不会注入这些代码。
              </span>
              {state.errors.public_footer_html ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_footer_html}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              自定义 CSS
              <textarea
                className="min-h-40 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_custom_css"
                defaultValue={state.values.public_custom_css}
                spellCheck={false}
                placeholder={'.site-title { letter-spacing: 0.08em; }'}
              />
              <span className="text-xs font-normal leading-6 text-slate-500 dark:text-slate-400">
                内容会以内联 style 注入公开站点 head，适合做小范围样式覆盖与主题微调。优先用于展示层调整，不要在这里堆积大量样式体系。
              </span>
              {state.errors.public_custom_css ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_custom_css}</span>
              ) : null}
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              主题框架 v1
            </h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              管理站点品牌、首页 hero、文章列表展示和公开布局基础风格。保持结构化配置，不把主题系统做成页面搭建器。
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              站点品牌名称
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="site_brand_name"
                defaultValue={state.values.site_brand_name}
                placeholder="例如：Inkwell"
              />
              {state.errors.site_brand_name ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.site_brand_name}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              站点副标题
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="site_tagline"
                defaultValue={state.values.site_tagline}
                placeholder="例如：静态前端，动态内容。"
              />
              {state.errors.site_tagline ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.site_tagline}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
              首页标题
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="home_hero_title"
                defaultValue={state.values.home_hero_title}
                placeholder="例如：最新文章"
              />
              {state.errors.home_hero_title ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_hero_title}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
              首页说明
              <textarea
                className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-7 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="home_hero_description"
                defaultValue={state.values.home_hero_description}
                spellCheck={false}
                placeholder="例如：浏览站点中已经发布的文章与公开归档。"
              />
              {state.errors.home_hero_description ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_hero_description}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              首页主按钮文案
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="home_primary_cta_label"
                defaultValue={state.values.home_primary_cta_label}
                placeholder="例如：订阅新文章"
              />
              {state.errors.home_primary_cta_label ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_primary_cta_label}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              首页主按钮链接
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="home_primary_cta_url"
                defaultValue={state.values.home_primary_cta_url}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="/subscribe 或 https://example.com"
              />
              {state.errors.home_primary_cta_url ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_primary_cta_url}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
              首页精选入口标题
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="home_featured_links_title"
                defaultValue={state.values.home_featured_links_title}
                placeholder="例如：精选入口"
              />
              {state.errors.home_featured_links_title ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_featured_links_title}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
              首页精选入口说明
              <textarea
                className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-7 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="home_featured_links_description"
                defaultValue={state.values.home_featured_links_description}
                spellCheck={false}
                placeholder="例如：把高频入口放在首页，减少访客寻找内容的成本。"
              />
              {state.errors.home_featured_links_description ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_featured_links_description}</span>
              ) : null}
            </label>

            <div className="lg:col-span-2 grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">首页精选入口卡片 1</p>
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  卡片 1 文案
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="text" name="home_featured_link_1_label" defaultValue={state.values.home_featured_link_1_label} />
                  {state.errors.home_featured_link_1_label ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_featured_link_1_label}</span> : null}
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  卡片 1 链接
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="text" name="home_featured_link_1_url" defaultValue={state.values.home_featured_link_1_url} />
                  {state.errors.home_featured_link_1_url ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_featured_link_1_url}</span> : null}
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
                  卡片 1 说明
                  <textarea className="min-h-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-7 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" name="home_featured_link_1_description" defaultValue={state.values.home_featured_link_1_description} spellCheck={false} />
                  {state.errors.home_featured_link_1_description ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_featured_link_1_description}</span> : null}
                </label>
              </div>
            </div>

            <div className="lg:col-span-2 grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">首页精选入口卡片 2</p>
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  卡片 2 文案
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="text" name="home_featured_link_2_label" defaultValue={state.values.home_featured_link_2_label} />
                  {state.errors.home_featured_link_2_label ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_featured_link_2_label}</span> : null}
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  卡片 2 链接
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="text" name="home_featured_link_2_url" defaultValue={state.values.home_featured_link_2_url} />
                  {state.errors.home_featured_link_2_url ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_featured_link_2_url}</span> : null}
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
                  卡片 2 说明
                  <textarea className="min-h-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-7 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" name="home_featured_link_2_description" defaultValue={state.values.home_featured_link_2_description} spellCheck={false} />
                  {state.errors.home_featured_link_2_description ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_featured_link_2_description}</span> : null}
                </label>
              </div>
            </div>

            <div className="lg:col-span-2 grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">首页精选入口卡片 3</p>
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  卡片 3 文案
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="text" name="home_featured_link_3_label" defaultValue={state.values.home_featured_link_3_label} />
                  {state.errors.home_featured_link_3_label ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_featured_link_3_label}</span> : null}
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  卡片 3 链接
                  <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" type="text" name="home_featured_link_3_url" defaultValue={state.values.home_featured_link_3_url} />
                  {state.errors.home_featured_link_3_url ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_featured_link_3_url}</span> : null}
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
                  卡片 3 说明
                  <textarea className="min-h-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-7 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" name="home_featured_link_3_description" defaultValue={state.values.home_featured_link_3_description} spellCheck={false} />
                  {state.errors.home_featured_link_3_description ? <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_featured_link_3_description}</span> : null}
                </label>
              </div>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
              首页推荐页面标题
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="home_recommended_pages_title"
                defaultValue={state.values.home_recommended_pages_title}
                placeholder="例如：推荐页面"
              />
              {state.errors.home_recommended_pages_title ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_recommended_pages_title}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
              首页推荐页面说明
              <textarea
                className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-7 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="home_recommended_pages_description"
                defaultValue={state.values.home_recommended_pages_description}
                spellCheck={false}
                placeholder="例如：把值得长期展示的独立页面放在首页，帮助访客更快进入核心内容。"
              />
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                使用固定槽位选择独立页面；仅已发布页面会在首页显示，全部留空时整个区块隐藏。
              </span>
              {state.errors.home_recommended_pages_description ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_recommended_pages_description}</span>
              ) : null}
            </label>

            <div className="lg:col-span-2 grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">首页推荐页面槽位</p>
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  推荐页面 1
                  <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" name="home_recommended_page_1_id" defaultValue={state.values.home_recommended_page_1_id}>
                    <option value="">不显示</option>
                    {recommendedPageOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  推荐页面 2
                  <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" name="home_recommended_page_2_id" defaultValue={state.values.home_recommended_page_2_id}>
                    <option value="">不显示</option>
                    {recommendedPageOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  推荐页面 3
                  <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" name="home_recommended_page_3_id" defaultValue={state.values.home_recommended_page_3_id}>
                    <option value="">不显示</option>
                    {recommendedPageOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              {state.errors.home_recommended_page_1_id || state.errors.home_recommended_page_2_id || state.errors.home_recommended_page_3_id ? (
                <span className="text-sm text-red-600 dark:text-red-300">
                  {state.errors.home_recommended_page_1_id ?? state.errors.home_recommended_page_2_id ?? state.errors.home_recommended_page_3_id}
                </span>
              ) : null}
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              首页文章展示模式
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="home_posts_variant"
                defaultValue={state.values.home_posts_variant}
              >
                <option value="comfortable">舒展</option>
                <option value="compact">紧凑</option>
              </select>
              {state.errors.home_posts_variant ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_posts_variant}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              首页精选入口展示模式
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="home_featured_links_variant"
                defaultValue={state.values.home_featured_links_variant}
              >
                <option value="comfortable">舒展</option>
                <option value="compact">紧凑</option>
              </select>
              {state.errors.home_featured_links_variant ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_featured_links_variant}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              归档列表展示模式
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_archive_posts_variant"
                defaultValue={state.values.public_archive_posts_variant}
              >
                <option value="comfortable">舒展</option>
                <option value="compact">紧凑</option>
              </select>
              {state.errors.public_archive_posts_variant ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_archive_posts_variant}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              长文页展示模式
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_longform_variant"
                defaultValue={state.values.public_longform_variant}
              >
                <option value="comfortable">舒展</option>
                <option value="compact">紧凑</option>
              </select>
              {state.errors.public_longform_variant ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_longform_variant}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              默认主题模式
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_theme_default_mode"
                defaultValue={state.values.public_theme_default_mode}
              >
                <option value="system">跟随系统</option>
                <option value="light">浅色</option>
                <option value="dark">深色</option>
              </select>
              {state.errors.public_theme_default_mode ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_theme_default_mode}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              公开布局宽度
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_layout_width"
                defaultValue={state.values.public_layout_width}
              >
                <option value="narrow">窄</option>
                <option value="default">默认</option>
                <option value="wide">宽</option>
              </select>
              {state.errors.public_layout_width ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_layout_width}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              布局表面样式
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_surface_variant"
                defaultValue={state.values.public_surface_variant}
              >
                <option value="soft">柔和</option>
                <option value="solid">实心</option>
              </select>
              {state.errors.public_surface_variant ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_surface_variant}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              强调色主题
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_accent_theme"
                defaultValue={state.values.public_accent_theme}
              >
                <option value="slate">Slate</option>
                <option value="blue">Blue</option>
                <option value="emerald">Emerald</option>
                <option value="amber">Amber</option>
              </select>
              {state.errors.public_accent_theme ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_accent_theme}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              页头显示副标题
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_header_show_tagline"
                defaultValue={state.values.public_header_show_tagline}
              >
                <option value="true">显示</option>
                <option value="false">隐藏</option>
              </select>
              {state.errors.public_header_show_tagline ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_header_show_tagline}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              首页显示摘要
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="home_show_post_excerpt"
                defaultValue={state.values.home_show_post_excerpt}
              >
                <option value="true">显示</option>
                <option value="false">隐藏</option>
              </select>
              {state.errors.home_show_post_excerpt ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_show_post_excerpt}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              首页显示作者
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="home_show_post_author"
                defaultValue={state.values.home_show_post_author}
              >
                <option value="true">显示</option>
                <option value="false">隐藏</option>
              </select>
              {state.errors.home_show_post_author ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_show_post_author}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              首页显示分类
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="home_show_post_category"
                defaultValue={state.values.home_show_post_category}
              >
                <option value="true">显示</option>
                <option value="false">隐藏</option>
              </select>
              {state.errors.home_show_post_category ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_show_post_category}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              首页显示发布时间
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="home_show_post_date"
                defaultValue={state.values.home_show_post_date}
              >
                <option value="true">显示</option>
                <option value="false">隐藏</option>
              </select>
              {state.errors.home_show_post_date ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.home_show_post_date}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
              页脚说明
              <textarea
                className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-7 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_footer_blurb"
                defaultValue={state.values.public_footer_blurb}
                spellCheck={false}
                placeholder="例如：面向长期维护的内容站点。"
              />
              {state.errors.public_footer_blurb ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_footer_blurb}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
              页脚版权文案
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="public_footer_copyright"
                defaultValue={state.values.public_footer_copyright}
                placeholder="例如：© Inkwell"
              />
              {state.errors.public_footer_copyright ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_footer_copyright}</span>
              ) : null}
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              全站公开公告
            </h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              仅在公开前台显示，适合发布维护通知、活动说明、迁移提醒或其他需要所有访客立即看到的站点级公告。
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              公告开关
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_notice_enabled"
                defaultValue={state.values.public_notice_enabled}
              >
                <option value="false">关闭</option>
                <option value="true">启用</option>
              </select>
              {state.errors.public_notice_enabled ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_notice_enabled}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              公告样式
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_notice_variant"
                defaultValue={state.values.public_notice_variant}
              >
                <option value="info">信息</option>
                <option value="warning">提醒</option>
                <option value="success">成功</option>
              </select>
              {state.errors.public_notice_variant ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_notice_variant}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              允许访客关闭
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_notice_dismissible"
                defaultValue={state.values.public_notice_dismissible}
              >
                <option value="false">不允许</option>
                <option value="true">允许</option>
              </select>
              {state.errors.public_notice_dismissible ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_notice_dismissible}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              公告版本
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="public_notice_version"
                defaultValue={state.values.public_notice_version}
                placeholder="例如：2026-04-maintenance"
              />
              <span className="text-xs font-normal leading-6 text-slate-500 dark:text-slate-400">
                仅在允许关闭时必填。修改版本后，之前关闭过旧版本公告的访客会重新看到新公告。
              </span>
              {state.errors.public_notice_version ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_notice_version}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              开始时间
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="datetime-local"
                name="public_notice_start_at"
                value={publicNoticeStartAtValue}
                onChange={(event) => setPublicNoticeStartAtDraft(event.target.value)}
              />
              <span className="text-xs font-normal leading-6 text-slate-500 dark:text-slate-400">
                留空表示不限制开始时间。按你当前浏览器时区输入。
              </span>
              {state.errors.public_notice_start_at ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_notice_start_at}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              结束时间
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="datetime-local"
                name="public_notice_end_at"
                value={publicNoticeEndAtValue}
                onChange={(event) => setPublicNoticeEndAtDraft(event.target.value)}
              />
              <span className="text-xs font-normal leading-6 text-slate-500 dark:text-slate-400">
                留空表示不限制结束时间。结束时间必须晚于开始时间。
              </span>
              {state.errors.public_notice_end_at ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_notice_end_at}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
              公告标题
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="public_notice_title"
                defaultValue={state.values.public_notice_title}
                placeholder="例如：系统维护通知"
              />
              {state.errors.public_notice_title ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_notice_title}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
              公告内容
              <textarea
                className="min-h-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-7 outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                name="public_notice_body"
                defaultValue={state.values.public_notice_body}
                spellCheck={false}
                placeholder="填写所有访客需要看到的公告内容。"
              />
              <span className="text-xs font-normal leading-6 text-slate-500 dark:text-slate-400">
                启用公告时必须填写内容。建议保持简短明确，适合横跨所有公开页面展示。
              </span>
              {state.errors.public_notice_body ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_notice_body}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              按钮文案
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="public_notice_link_label"
                defaultValue={state.values.public_notice_link_label}
                placeholder="例如：查看详情"
              />
              {state.errors.public_notice_link_label ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_notice_link_label}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              按钮链接
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="text"
                name="public_notice_link_url"
                defaultValue={state.values.public_notice_link_url}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="/docs/deployment 或 https://example.com"
              />
              <span className="text-xs font-normal leading-6 text-slate-500 dark:text-slate-400">
                按钮文案和链接必须同时填写。支持站内根相对路径和完整 http(s) 地址。
              </span>
              {state.errors.public_notice_link_url ? (
                <span className="text-sm text-red-600 dark:text-red-300">{state.errors.public_notice_link_url}</span>
              ) : null}
            </label>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "保存中..." : "保存设置"}
          </button>
        </div>
      </form>

      <form
        action={emailFormAction}
        className="flex flex-col gap-6 rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
      >
        <input type="hidden" name="adminPath" value={adminPath} />

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            邮件通知场景
          </h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            控制不同业务事件是否触发邮件通知。仅在 SMTP 配置完整时生效。
          </p>
        </div>

        {emailState.error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {emailState.error}
          </p>
        ) : null}

        <div className="grid gap-4">
          {emailState.scenarios.map((scenario) => (
            <label
              key={scenario.scenario}
              className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200"
            >
              <input
                type="checkbox"
                name={scenario.scenario}
                defaultChecked={scenario.enabled}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <span className="flex flex-col gap-1">
                <span className="font-medium">{scenario.scenario}</span>
                <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {scenario.description}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            type="submit"
            disabled={isSavingEmailNotifications}
          >
            {isSavingEmailNotifications ? "保存中..." : "保存邮件通知"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useActionState } from "react";

import {
  saveEmailNotificationsAction,
  saveSettingsAction,
} from "@/app/(admin)/[adminPath]/(protected)/settings/actions";
import {
  createEmailNotificationsFormState,
  createSettingsFormState,
  type SettingsFormValues,
} from "@/lib/admin/settings-form";
import type { EmailNotificationScenario } from "@/lib/settings-config";

type SettingsFormProps = {
  adminPath: string;
  initialValues: SettingsFormValues;
  emailNotifications: EmailNotificationScenario[];
};

export function SettingsForm({ adminPath, initialValues, emailNotifications }: SettingsFormProps) {
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

  return (
    <div className="flex flex-col gap-6">
      <form
        action={formAction}
        className="flex flex-col gap-6 rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
      >
        <input type="hidden" name="adminPath" value={adminPath} />

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
            配置各场景是否触发真实邮件通知；若 SMTP 未完整配置，启用的场景也会自动跳过发送。
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
              className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800"
            >
              <input
                aria-label={scenario.scenario}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-950"
                type="checkbox"
                name={scenario.scenario}
                defaultChecked={scenario.enabled}
              />
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {scenario.scenario}
                </span>
                <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
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

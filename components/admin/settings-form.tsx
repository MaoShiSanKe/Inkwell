"use client";

import { useActionState, useMemo, useState } from "react";

import {
  saveEmailNotificationsAction,
  saveSettingsAction,
} from "@/app/(admin)/[adminPath]/(protected)/settings/actions";
import {
  SettingsNotice,
  SettingsSection,
  SettingsSelectField,
  SettingsTextareaField,
  SettingsTextField,
} from "@/components/admin/settings-fields";
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

type SettingsFieldName = keyof SettingsFormValues;

type SelectOption = {
  value: string;
  label: string;
};

const booleanOptions: SelectOption[] = [
  { value: "true", label: "显示 / 启用" },
  { value: "false", label: "隐藏 / 关闭" },
];

const densityOptions: SelectOption[] = [
  { value: "comfortable", label: "舒展" },
  { value: "compact", label: "紧凑" },
];

const featuredLinkSlots = [1, 2, 3] as const;
const recommendedPageSlots = [1, 2, 3] as const;

function getError(errors: Partial<Record<SettingsFieldName | "form", string>>, name: SettingsFieldName) {
  return errors[name];
}

function fieldName(name: SettingsFieldName) {
  return name;
}

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
    () => [
      { value: "", label: "不显示" },
      ...pageOptions.map((page) => ({
        value: String(page.id),
        label: `${page.title} (/${page.slug}) · ${
          page.status === "published" ? "已发布" : page.status === "draft" ? "草稿" : "回收站"
        }`,
      })),
    ],
    [pageOptions],
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-6">
        <input type="hidden" name="adminPath" value={adminPath} />
        <input type="hidden" name="public_notice_start_at_iso" value={publicNoticeStartAtIso} />
        <input type="hidden" name="public_notice_end_at_iso" value={publicNoticeEndAtIso} />

        {state.errors.form ? <SettingsNotice tone="red">{state.errors.form}</SettingsNotice> : null}

        <SettingsSection
          eyebrow="Core"
          title="基础站点设置"
          description="控制后台入口、评论策略、摘要生成和修订保留。这里的配置会影响后台访问和内容维护流程。"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <SettingsTextField
              label="后台路径"
              type="text"
              name="admin_path"
              defaultValue={state.values.admin_path}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              help="仅允许小写字母、数字和短横线。修改后如路由未立即生效，请重启服务。"
              error={getError(state.errors, "admin_path")}
            />
            <SettingsSelectField
              label="评论审核模式"
              name="comment_moderation"
              defaultValue={state.values.comment_moderation}
              options={[
                { value: "pending", label: "待审核" },
                { value: "approved", label: "直接通过" },
              ]}
              help="控制新评论默认进入待审核还是直接公开，白名单用户仍会跳过审核。"
              error={getError(state.errors, "comment_moderation")}
            />
            <SettingsTextField
              label="修订保留数量"
              type="number"
              min="1"
              step="1"
              name="revision_limit"
              defaultValue={state.values.revision_limit}
              help="每篇文章最多保留多少条修订记录，超过后自动清理最旧项。"
              error={getError(state.errors, "revision_limit")}
            />
            <SettingsTextField
              label="修订保留天数"
              type="number"
              min="0"
              step="1"
              name="revision_ttl_days"
              defaultValue={state.values.revision_ttl_days}
              help="已发布文章的草稿修订超过该天数后会被后台清理；填 0 表示仅按数量上限控制。"
              error={getError(state.errors, "revision_ttl_days")}
            />
            <SettingsTextField
              label="自动摘要长度"
              type="number"
              min="1"
              step="1"
              name="excerpt_length"
              defaultValue={state.values.excerpt_length}
              fieldClassName="lg:col-span-2"
              help="当文章摘要留空时，系统会从正文纯文本截取前 N 个字符作为摘要。"
              error={getError(state.errors, "excerpt_length")}
            />
          </div>
          <div className="mt-5">
            <SettingsNotice>
              修改后台路径后，建议立即使用新路径重新访问后台，并确认部署环境中的进程或缓存策略不会延迟生效。
            </SettingsNotice>
          </div>
        </SettingsSection>

        <SettingsSection
          eyebrow="Mail"
          title="SMTP 配置"
          description="配置真实邮件发送所需的 SMTP 连接与发件人信息。未完整配置时，通知场景会自动跳过发送。"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <SettingsTextField label="SMTP Host" type="text" name="smtp_host" defaultValue={state.values.smtp_host} autoCapitalize="none" autoCorrect="off" spellCheck={false} error={getError(state.errors, "smtp_host")} />
            <SettingsTextField label="SMTP 端口" type="number" min="1" step="1" name="smtp_port" defaultValue={state.values.smtp_port} error={getError(state.errors, "smtp_port")} />
            <SettingsSelectField label="SMTP 加密" name="smtp_secure" defaultValue={state.values.smtp_secure} options={[{ value: "false", label: "STARTTLS / 普通端口（如 587）" }, { value: "true", label: "SSL/TLS（如 465）" }]} error={getError(state.errors, "smtp_secure")} />
            <SettingsTextField label="SMTP 用户名" type="text" name="smtp_username" defaultValue={state.values.smtp_username} autoCapitalize="none" autoCorrect="off" spellCheck={false} error={getError(state.errors, "smtp_username")} />
            <SettingsTextField label="SMTP 密码" type="password" name="smtp_password" defaultValue={state.values.smtp_password} autoCapitalize="none" autoCorrect="off" spellCheck={false} error={getError(state.errors, "smtp_password")} />
            <SettingsTextField label="发件邮箱" type="email" name="smtp_from_email" defaultValue={state.values.smtp_from_email} autoCapitalize="none" autoCorrect="off" spellCheck={false} error={getError(state.errors, "smtp_from_email")} />
            <SettingsTextField label="发件人名称" type="text" name="smtp_from_name" defaultValue={state.values.smtp_from_name} fieldClassName="lg:col-span-2" error={getError(state.errors, "smtp_from_name")} />
          </div>
        </SettingsSection>

        <SettingsSection
          eyebrow="Analytics"
          title="Umami 统计"
          description="配置公开前台页面使用的 Umami 统计脚本。后台页面不会注入该脚本。"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <SettingsSelectField label="Umami 开关" name="umami_enabled" defaultValue={state.values.umami_enabled} options={[{ value: "false", label: "关闭" }, { value: "true", label: "启用" }]} help="仅对公开博客页面生效，后台登录页与管理页不会加载 Umami。" error={getError(state.errors, "umami_enabled")} />
            <SettingsTextField label="Website ID" type="text" name="umami_website_id" defaultValue={state.values.umami_website_id} autoCapitalize="none" autoCorrect="off" spellCheck={false} error={getError(state.errors, "umami_website_id")} />
            <SettingsTextField label="脚本地址" type="text" name="umami_script_url" defaultValue={state.values.umami_script_url} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="https://umami.example.com/script.js" fieldClassName="lg:col-span-2" help="支持完整 http(s) 地址，或站内反向代理后的根相对地址，例如 `/stats/script.js`。" error={getError(state.errors, "umami_script_url")} />
          </div>
        </SettingsSection>

        <SettingsSection
          eyebrow="Injection"
          title="公开站点代码与样式"
          description="仅对公开前台页面生效，可用于站点验证标签、统计脚本、客服组件与轻量样式覆盖。后台页面不会注入这些内容。"
        >
          <div className="grid gap-5">
            <SettingsTextareaField label="页头代码（Head）" name="public_head_html" defaultValue={state.values.public_head_html} spellCheck={false} placeholder={'<meta name="example-verification" content="..." />'} className="min-h-40" code help="内容会插入公开站点页面的 head。适合验证标签、统计初始化片段或自定义 style / script 标签。不要粘贴密钥、私有令牌或不受信任的第三方脚本。" error={getError(state.errors, "public_head_html")} />
            <SettingsTextareaField label="页尾代码（Body 结束前）" name="public_footer_html" defaultValue={state.values.public_footer_html} spellCheck={false} placeholder={'<div data-widget="example">widget</div>'} className="min-h-40" code help="内容会插入公开站点页面底部，适合客服组件、埋点容器或需要在 body 尾部加载的脚本。后台页面与后台登录页不会注入这些代码。" error={getError(state.errors, "public_footer_html")} />
            <SettingsTextareaField label="自定义 CSS" name="public_custom_css" defaultValue={state.values.public_custom_css} spellCheck={false} placeholder={'.site-title { letter-spacing: 0.08em; }'} className="min-h-40" code help="内容会以内联 style 注入公开站点 head，适合做小范围样式覆盖与主题微调。优先用于展示层调整，不要在这里堆积大量样式体系。" error={getError(state.errors, "public_custom_css")} />
          </div>
        </SettingsSection>

        <SettingsSection
          eyebrow="Theme"
          title="主题框架 v1"
          description="管理站点品牌、首页 hero、文章列表展示和公开布局基础风格。保持结构化配置，不把主题系统做成页面搭建器。"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <SettingsTextField label="站点品牌名称" type="text" name="site_brand_name" defaultValue={state.values.site_brand_name} placeholder="例如：Inkwell" error={getError(state.errors, "site_brand_name")} />
            <SettingsTextField label="站点副标题" type="text" name="site_tagline" defaultValue={state.values.site_tagline} placeholder="例如：静态前端，动态内容。" error={getError(state.errors, "site_tagline")} />
            <SettingsTextField label="首页标题" type="text" name="home_hero_title" defaultValue={state.values.home_hero_title} placeholder="例如：最新文章" fieldClassName="lg:col-span-2" error={getError(state.errors, "home_hero_title")} />
            <SettingsTextareaField label="首页说明" name="home_hero_description" defaultValue={state.values.home_hero_description} spellCheck={false} placeholder="例如：浏览站点中已经发布的文章与公开归档。" className="min-h-24" fieldClassName="lg:col-span-2" error={getError(state.errors, "home_hero_description")} />
            <SettingsTextField label="首页主按钮文案" type="text" name="home_primary_cta_label" defaultValue={state.values.home_primary_cta_label} placeholder="例如：订阅新文章" error={getError(state.errors, "home_primary_cta_label")} />
            <SettingsTextField label="首页主按钮链接" type="text" name="home_primary_cta_url" defaultValue={state.values.home_primary_cta_url} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="/subscribe 或 https://example.com" error={getError(state.errors, "home_primary_cta_url")} />
            <SettingsTextField label="首页精选入口标题" type="text" name="home_featured_links_title" defaultValue={state.values.home_featured_links_title} placeholder="例如：精选入口" fieldClassName="lg:col-span-2" error={getError(state.errors, "home_featured_links_title")} />
            <SettingsTextareaField label="首页精选入口说明" name="home_featured_links_description" defaultValue={state.values.home_featured_links_description} spellCheck={false} placeholder="例如：把高频入口放在首页，减少访客寻找内容的成本。" className="min-h-24" fieldClassName="lg:col-span-2" error={getError(state.errors, "home_featured_links_description")} />

            <div className="grid gap-4 lg:col-span-2">
              {featuredLinkSlots.map((slot) => {
                const labelName = fieldName(`home_featured_link_${slot}_label` as SettingsFieldName);
                const urlName = fieldName(`home_featured_link_${slot}_url` as SettingsFieldName);
                const descriptionName = fieldName(`home_featured_link_${slot}_description` as SettingsFieldName);

                return (
                  <div key={slot} className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">首页精选入口卡片 {slot}</p>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <SettingsTextField label={`卡片 ${slot} 文案`} type="text" name={labelName} defaultValue={state.values[labelName]} error={getError(state.errors, labelName)} />
                      <SettingsTextField label={`卡片 ${slot} 链接`} type="text" name={urlName} defaultValue={state.values[urlName]} autoCapitalize="none" autoCorrect="off" spellCheck={false} error={getError(state.errors, urlName)} />
                      <SettingsTextareaField label={`卡片 ${slot} 说明`} name={descriptionName} defaultValue={state.values[descriptionName]} spellCheck={false} className="min-h-20" fieldClassName="lg:col-span-2" error={getError(state.errors, descriptionName)} />
                    </div>
                  </div>
                );
              })}
            </div>

            <SettingsTextField label="首页推荐页面标题" type="text" name="home_recommended_pages_title" defaultValue={state.values.home_recommended_pages_title} placeholder="例如：推荐页面" fieldClassName="lg:col-span-2" error={getError(state.errors, "home_recommended_pages_title")} />
            <SettingsTextareaField label="首页推荐页面说明" name="home_recommended_pages_description" defaultValue={state.values.home_recommended_pages_description} spellCheck={false} placeholder="例如：把值得长期展示的独立页面放在首页，帮助访客更快进入核心内容。" className="min-h-24" fieldClassName="lg:col-span-2" help="使用固定槽位选择独立页面；仅已发布页面会在首页显示，全部留空时整个区块隐藏。" error={getError(state.errors, "home_recommended_pages_description")} />

            <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40 lg:col-span-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">首页推荐页面槽位</p>
              <div className="grid gap-4 lg:grid-cols-3">
                {recommendedPageSlots.map((slot) => {
                  const name = fieldName(`home_recommended_page_${slot}_id` as SettingsFieldName);
                  return (
                    <SettingsSelectField key={slot} label={`推荐页面 ${slot}`} name={name} defaultValue={state.values[name]} options={recommendedPageOptions} error={getError(state.errors, name)} />
                  );
                })}
              </div>
            </div>

            <SettingsSelectField label="首页文章展示模式" name="home_posts_variant" defaultValue={state.values.home_posts_variant} options={densityOptions} error={getError(state.errors, "home_posts_variant")} />
            <SettingsSelectField label="首页精选入口展示模式" name="home_featured_links_variant" defaultValue={state.values.home_featured_links_variant} options={densityOptions} error={getError(state.errors, "home_featured_links_variant")} />
            <SettingsSelectField label="归档列表展示模式" name="public_archive_posts_variant" defaultValue={state.values.public_archive_posts_variant} options={densityOptions} error={getError(state.errors, "public_archive_posts_variant")} />
            <SettingsSelectField label="长文页展示模式" name="public_longform_variant" defaultValue={state.values.public_longform_variant} options={densityOptions} error={getError(state.errors, "public_longform_variant")} />
            <SettingsSelectField label="默认主题模式" name="public_theme_default_mode" defaultValue={state.values.public_theme_default_mode} options={[{ value: "system", label: "跟随系统" }, { value: "light", label: "浅色" }, { value: "dark", label: "深色" }]} error={getError(state.errors, "public_theme_default_mode")} />
            <SettingsSelectField label="公开布局宽度" name="public_layout_width" defaultValue={state.values.public_layout_width} options={[{ value: "narrow", label: "窄" }, { value: "default", label: "默认" }, { value: "wide", label: "宽" }]} error={getError(state.errors, "public_layout_width")} />
            <SettingsSelectField label="布局表面样式" name="public_surface_variant" defaultValue={state.values.public_surface_variant} options={[{ value: "soft", label: "柔和" }, { value: "solid", label: "实心" }]} error={getError(state.errors, "public_surface_variant")} />
            <SettingsSelectField label="强调色主题" name="public_accent_theme" defaultValue={state.values.public_accent_theme} options={[{ value: "slate", label: "Slate" }, { value: "blue", label: "Blue" }, { value: "emerald", label: "Emerald" }, { value: "amber", label: "Amber" }]} error={getError(state.errors, "public_accent_theme")} />
            <SettingsSelectField label="页头显示副标题" name="public_header_show_tagline" defaultValue={state.values.public_header_show_tagline} options={[{ value: "true", label: "显示" }, { value: "false", label: "隐藏" }]} error={getError(state.errors, "public_header_show_tagline")} />
            <SettingsSelectField label="首页显示摘要" name="home_show_post_excerpt" defaultValue={state.values.home_show_post_excerpt} options={booleanOptions} error={getError(state.errors, "home_show_post_excerpt")} />
            <SettingsSelectField label="首页显示作者" name="home_show_post_author" defaultValue={state.values.home_show_post_author} options={booleanOptions} error={getError(state.errors, "home_show_post_author")} />
            <SettingsSelectField label="首页显示分类" name="home_show_post_category" defaultValue={state.values.home_show_post_category} options={booleanOptions} error={getError(state.errors, "home_show_post_category")} />
            <SettingsSelectField label="首页显示发布时间" name="home_show_post_date" defaultValue={state.values.home_show_post_date} options={booleanOptions} error={getError(state.errors, "home_show_post_date")} />
            <SettingsTextareaField label="页脚说明" name="public_footer_blurb" defaultValue={state.values.public_footer_blurb} spellCheck={false} placeholder="例如：面向长期维护的内容站点。" className="min-h-24" fieldClassName="lg:col-span-2" error={getError(state.errors, "public_footer_blurb")} />
            <SettingsTextField label="页脚版权文案" type="text" name="public_footer_copyright" defaultValue={state.values.public_footer_copyright} placeholder="例如：© Inkwell" fieldClassName="lg:col-span-2" error={getError(state.errors, "public_footer_copyright")} />
          </div>
        </SettingsSection>

        <SettingsSection
          eyebrow="Notice"
          title="全站公开公告"
          description="仅在公开前台显示，适合发布维护通知、活动说明、迁移提醒或其他需要所有访客立即看到的站点级公告。"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <SettingsSelectField label="公告开关" name="public_notice_enabled" defaultValue={state.values.public_notice_enabled} options={[{ value: "false", label: "关闭" }, { value: "true", label: "启用" }]} error={getError(state.errors, "public_notice_enabled")} />
            <SettingsSelectField label="公告样式" name="public_notice_variant" defaultValue={state.values.public_notice_variant} options={[{ value: "info", label: "信息" }, { value: "warning", label: "提醒" }, { value: "success", label: "成功" }]} error={getError(state.errors, "public_notice_variant")} />
            <SettingsSelectField label="允许访客关闭" name="public_notice_dismissible" defaultValue={state.values.public_notice_dismissible} options={[{ value: "false", label: "不允许" }, { value: "true", label: "允许" }]} error={getError(state.errors, "public_notice_dismissible")} />
            <SettingsTextField label="公告版本" type="text" name="public_notice_version" defaultValue={state.values.public_notice_version} placeholder="例如：2026-04-maintenance" help="仅在允许关闭时必填。修改版本后，之前关闭过旧版本公告的访客会重新看到新公告。" error={getError(state.errors, "public_notice_version")} />
            <SettingsTextField label="开始时间" type="datetime-local" name="public_notice_start_at" value={publicNoticeStartAtValue} onChange={(event) => setPublicNoticeStartAtDraft(event.target.value)} help="留空表示不限制开始时间。按你当前浏览器时区输入。" error={getError(state.errors, "public_notice_start_at")} />
            <SettingsTextField label="结束时间" type="datetime-local" name="public_notice_end_at" value={publicNoticeEndAtValue} onChange={(event) => setPublicNoticeEndAtDraft(event.target.value)} help="留空表示不限制结束时间。结束时间必须晚于开始时间。" error={getError(state.errors, "public_notice_end_at")} />
            <SettingsTextField label="公告标题" type="text" name="public_notice_title" defaultValue={state.values.public_notice_title} placeholder="例如：系统维护通知" fieldClassName="lg:col-span-2" error={getError(state.errors, "public_notice_title")} />
            <SettingsTextareaField label="公告内容" name="public_notice_body" defaultValue={state.values.public_notice_body} spellCheck={false} placeholder="填写所有访客需要看到的公告内容。" className="min-h-32" fieldClassName="lg:col-span-2" help="启用公告时必须填写内容。建议保持简短明确，适合横跨所有公开页面展示。" error={getError(state.errors, "public_notice_body")} />
            <SettingsTextField label="按钮文案" type="text" name="public_notice_link_label" defaultValue={state.values.public_notice_link_label} placeholder="例如：查看详情" error={getError(state.errors, "public_notice_link_label")} />
            <SettingsTextField label="按钮链接" type="text" name="public_notice_link_url" defaultValue={state.values.public_notice_link_url} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="/docs/deployment 或 https://example.com" help="按钮文案和链接必须同时填写。支持站内根相对路径和完整 http(s) 地址。" error={getError(state.errors, "public_notice_link_url")} />
          </div>
        </SettingsSection>

        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-lg shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-none">
          <p className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">
            保存后会刷新受影响的后台与公开页面缓存。
          </p>
          <button
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-300"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "保存中..." : "保存设置"}
          </button>
        </div>
      </form>

      <form action={emailFormAction} className="flex flex-col gap-6">
        <input type="hidden" name="adminPath" value={adminPath} />
        <SettingsSection
          eyebrow="Notifications"
          title="邮件通知场景"
          description="控制不同业务事件是否触发邮件通知。仅在 SMTP 配置完整时生效。"
        >
          {emailState.error ? <SettingsNotice tone="red">{emailState.error}</SettingsNotice> : null}
          <div className="mt-5 grid gap-3">
            {emailState.scenarios.map((scenario) => (
              <label
                key={scenario.scenario}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-200 hover:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
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
          <div className="mt-5 flex items-center gap-3">
            <button
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-300"
              type="submit"
              disabled={isSavingEmailNotifications}
            >
              {isSavingEmailNotifications ? "保存中..." : "保存邮件通知"}
            </button>
          </div>
        </SettingsSection>
      </form>
    </div>
  );
}

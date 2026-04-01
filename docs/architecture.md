# Inkwell 架构总览

本文档面向未来维护者与贡献者，目标是帮助你在重新接手 Inkwell 时，快速恢复对系统结构、关键入口与核心约束的理解。

如果你接下来要真正修改功能，请把本文当作“总览页”，再跳到对应的详细手册：
- 后台扩展：`docs/admin-extension-workflow.md`
- 设置系统：`docs/settings-system.md`
- schema 与迁移：`docs/schema-and-migrations.md`
- 执行边界：`docs/execution-boundaries.md`
- 测试选择：`docs/testing-strategy.md`

## 1. 整体分层

Inkwell 当前是一个基于 Next.js App Router 的单体应用，主要由以下几层组成：

### 1.1 App Router 页面层
- 前台页面：`app/(blog)/**`
- 后台页面：`app/(admin)/**`
- API 路由：`app/api/**`

### 1.2 业务服务层
- 后台内容管理：`lib/admin/**`
- 前台聚合读取：`lib/blog/**`
- 鉴权：`lib/auth.ts`
- 设置读取：`lib/settings.ts`
- 搜索：`lib/search/**`、`lib/meilisearch.ts`
- 备份恢复：`lib/backup/**`
- 媒体处理：`lib/media.ts`

### 1.3 数据层
- Drizzle schema 入口：`lib/db/schema/index.ts`
- 迁移由 `drizzle-kit` 管理：`lib/db/migrations/**`

### 1.4 命令脚本层
`scripts/**` 提供独立于 Web UI 的 CLI 入口，例如：
- 定时发布：`scripts/publish-scheduled-posts.ts`
- 搜索重建：`scripts/reindex-search-posts.ts`
- 备份导出：`scripts/export-backup.ts`
- 备份导入：`scripts/import-backup.ts`
- 初始化管理员：`scripts/create-admin.ts`

## 2. 执行边界总览

这一点决定了逻辑应该放在哪里。

### 2.1 页面 / 组件层
职责：
- 读数据
- 渲染 UI
- 触发表单提交

不应该承载：
- 重业务规则
- 直接数据库 mutation 组合逻辑

### 2.2 server action
职责：
- 处理后台表单提交
- 校验会话与 `adminPath`
- 调用服务层
- 成功后 `redirect()` / `revalidatePath()`

典型位置：
- `app/(admin)/[adminPath]/(protected)/posts/actions.ts`
- `app/(admin)/[adminPath]/(protected)/categories/actions.ts`
- `app/(admin)/[adminPath]/(protected)/settings/actions.ts`

### 2.3 route handler
职责：
- 处理 HTTP 协议边界
- 校验 header / token / request body
- 返回稳定 JSON

典型位置：
- `app/api/internal/posts/publish-scheduled/route.ts`
- `app/api/health/route.ts`

### 2.4 CLI script
职责：
- 环境加载
- argv 解析
- 机器可读输出
- 宿主机 cron / 手动运维入口

典型位置：
- `scripts/publish-scheduled-posts.ts`
- `scripts/reindex-search-posts.ts`
- `scripts/import-backup.ts`

### 2.5 shared service
职责：
- 真实业务规则
- 数据库读写
- 多入口复用的能力实现

典型位置：
- `lib/admin/**`
- `lib/search/**`
- `lib/backup/**`

更细规则见：`docs/execution-boundaries.md`

## 3. 页面结构与职责

### 3.1 前台
前台页面主要位于 `app/(blog)/**`，包括：
- 首页：`app/(blog)/page.tsx`
- 文章页：`app/(blog)/post/[slug]/page.tsx`
- 分类/标签/系列/作者页：`app/(blog)/category/[slug]/page.tsx`、`app/(blog)/tag/[slug]/page.tsx`、`app/(blog)/series/[slug]/page.tsx`、`app/(blog)/author/[slug]/page.tsx`
- 搜索页：`app/(blog)/search/page.tsx`
- 独立页面：`app/(blog)/standalone/[slug]/page.tsx`
- 友链页：`app/(blog)/friend-links/page.tsx`

当前公开展示层已经进入 Theme Framework v1：
- `app/(blog)/layout.tsx` 负责公开壳层接线
- `components/blog/site-header.tsx` / `site-footer.tsx` 负责结构化页头页脚
- `app/(blog)/page.tsx` 负责首页 Hero 与列表展示变体
- `components/theme-script.tsx` / `components/theme-toggle.tsx` 负责默认主题模式与浏览器切换
- `lib/theme.ts` 负责宽度 / 表面 / 强调色 / 主题优先级辅助逻辑

这意味着首页与公开布局不再只是静态模板，而是由 DB-backed theme settings 驱动的单主题、多变体展示层。

更细边界见：`docs/theme-framework.md`

### 3.2 后台
后台页面位于 `app/(admin)/[adminPath]/**`。

关键点：
- 后台路径不是写死的，真实路径由 `lib/settings.ts:107` 的 `getAdminPath()` 从数据库 `settings` 表读取
- 外层布局 `app/(admin)/[adminPath]/layout.tsx` 会校验 URL 中的 `adminPath` 是否与数据库配置一致，不一致直接 `notFound()`
- 受保护后台布局 `app/(admin)/[adminPath]/(protected)/layout.tsx` 会通过 `isAdminAuthenticated()` 检查会话，无效时跳转到登录页

主要后台模块包括：
- 仪表盘：`app/(admin)/[adminPath]/(protected)/page.tsx`
- 文章：`.../posts/**`
- 页面：`.../pages/**`
- 分类/标签/系列：`.../categories/**`、`.../tags/**`、`.../series/**`
- 评论：`.../comments/**`
- 媒体库：`.../media/**`
- 设置：`.../settings/**`
- 订阅者：`.../subscribers/**`
- 友链：`.../friend-links/**`
- IP 黑名单：`.../ip-blacklist/**`

后台扩展的具体流程见：`docs/admin-extension-workflow.md`

## 4. 鉴权与后台路径

鉴权核心在：`lib/auth.ts`

关键事实：
- 后台 session cookie 名为 `inkwell_admin_session`：`lib/auth.ts:11`
- 允许进入后台的角色是 `super_admin` 与 `editor`：`lib/auth.ts:12`
- session 通过 `NEXTAUTH_SECRET` 进行 HMAC 签名：`lib/auth.ts:28-40`
- 生产环境下 cookie 使用 `secure: true`：`lib/auth.ts:114-120`

这意味着：
- 公网生产环境必须使用 HTTPS，否则后台登录会话不稳定
- 后台登录问题优先检查 `NEXTAUTH_SECRET`、HTTPS、cookie 与 `NEXTAUTH_URL`
- `admin_path` 不是普通文案设置，而是 route-affecting setting

设置系统细节见：
- `docs/environment.md`
- `docs/settings-system.md`

## 5. 数据库与 schema

数据库 schema 聚合入口：`lib/db/schema/index.ts`

当前关键实体包括：
- 用户：`users`
- 文章：`posts`
- 历史 slug：`post_slug_aliases`
- 修订：`post_revisions`
- 分类/标签/系列：`categories`、`tags`、`series`、`post_tags`、`post_series`
- 评论：`comments`
- 媒体：`media`
- 浏览/点赞：`post_views`、`post_likes`
- 站点设置：`settings`
- 邮件通知：`email_notifications`
- 站点地图缓存：`sitemap_entries`
- 友链：`friend_links`

开发约束：
- 修改 schema 后只能通过 `npm run db:generate` 生成迁移
- 不要手改 `lib/db/migrations/**`
- 不要绕过迁移直接改数据库结构

schema 影响面与验证建议继续看：`docs/schema-and-migrations.md`

## 6. revalidation 责任总览

在 Inkwell 中，mutation 完成后“刷新哪里”是一个跨层事实，不能只盯着当前页面。

### 6.1 一般规则
- service 层返回业务结果
- 入口层决定 `revalidatePath()` 范围
- server action 和 internal API 通常承担 revalidation 责任
- CLI 通常不做 Next.js revalidation，除非明确运行在同一应用上下文中

### 6.2 后台 mutation 只影响后台时
至少刷新：
- 列表页
- 新建页 / 详情页

### 6.3 后台 mutation 影响公开页面时
还要刷新：
- 对应公开路由
- 可能受影响的详情页
- 必要时 `sitemap.xml` / `rss.xml`

### 6.4 当前典型例子
- 文章：后台列表 + 公开文章页
- 分类：后台分类页 + 文章编辑页 + 公开分类页
- 设置：后台路径页 + 首页布局
- 定时发布 internal API：文章页 + sitemap + RSS

更细说明见：
- `docs/admin-extension-workflow.md`
- `docs/execution-boundaries.md`

## 7. 核心业务链路

### 7.1 定时发布
核心实现：`lib/admin/posts.ts:746`

入口有两个：
- CLI：`scripts/publish-scheduled-posts.ts`
- 内部 API：`app/api/internal/posts/publish-scheduled/route.ts`

行为：
1. 查询 `status = scheduled` 的文章
2. 找出 `publishedAt <= now` 的记录
3. 转为 `published`
4. 同步 `sitemap_entries`
5. 清理修订
6. 同步搜索索引
7. 发送发布通知

部署边界：
- 应用只提供能力
- 触发时机由宿主机 cron / 外部调度器负责

### 7.2 搜索重建
核心实现：`lib/search/reindex-posts.ts`
CLI 入口：`scripts/reindex-search-posts.ts`

关键点：
- `listPublishedSearchDocuments()` 会从 PostgreSQL 分批读取已发布文章：`lib/search/reindex-posts.ts:56`
- `reindexPublishedPosts()` 会整体替换 Meilisearch 中的已发布文章索引：`lib/search/reindex-posts.ts:124`
- 该实现故意使用 CLI-safe DB 上下文，不再依赖 `server-only` Web DB 入口

适用场景：
- 首次启用搜索
- Meilisearch 数据丢失
- 备份恢复后重建索引

### 7.3 备份导出与恢复
导出核心：`lib/backup/export.ts:480`
导入核心：`lib/backup/import.ts:382`
CLI 入口：
- `scripts/export-backup.ts`
- `scripts/import-backup.ts`

导出内容：
- 数据库业务表快照
- `public/uploads` 媒体文件
- manifest / checksum / restore order

恢复行为：
- 导入前校验 manifest 与校验和
- 默认拒绝导入到非空实例
- `--force` 时清空业务表并替换媒体目录
- 尽量保留目标实例当前已有 secret
- 可选联动搜索重建

### 7.4 媒体上传
后台入口：`lib/admin/media.ts:299`

关键点：
- 本地图片由 `uploadAdminLocalImage()` 处理
- 上传文件大小限制 10 MB：`lib/admin/media.ts:321-327`
- 仅支持图片 MIME：`lib/admin/media.ts:329-331`
- 上传后会走图片探测与处理流程，最终落盘到 `public/uploads/images/YYYY/MM/`
- 后台媒体库页面已明确说明本地文件实际保存位置：`app/(admin)/[adminPath]/(protected)/media/page.tsx:37-41`

## 8. 设置系统

设置读取在：`lib/settings.ts`
设置定义在：`lib/settings-config.ts`

重要结论：
- 并不是所有配置都来自 `.env`
- 环境变量主要负责部署级、敏感级、连接级配置
- 很多站点运行配置来自数据库 `settings` 表

例如：
- `admin_path`：`lib/settings-config.ts:138-144`
- revision 保留策略：`revision_limit`、`revision_ttl_days`
- SMTP、Umami 等也通过 settings 聚合读取

具体扩展方式见：`docs/settings-system.md`

## 9. cross-cutting source of truth 地图

重新接手时，优先按主题找事实来源，而不是只看目录名。

### 9.1 产品与部署事实
- `README.md`
- `docs/deployment.md`
- `docs/troubleshooting.md`
- `docs/faq.md`

### 9.2 架构与入口边界
- `app/(admin)/[adminPath]/layout.tsx`
- `app/(admin)/[adminPath]/(protected)/layout.tsx`
- `lib/auth.ts`
- `lib/settings.ts`
- `docs/execution-boundaries.md`

### 9.3 数据结构与迁移
- `lib/db/schema/index.ts`
- `lib/db/schema/**`
- `docs/schema-and-migrations.md`

### 9.4 运维关键链路
- `lib/admin/posts.ts`
- `app/api/internal/posts/publish-scheduled/route.ts`
- `scripts/publish-scheduled-posts.ts`
- `lib/search/reindex-posts.ts`
- `scripts/reindex-search-posts.ts`
- `lib/backup/export.ts`
- `lib/backup/import.ts`

### 9.5 测试与验证
- `tests/integration/setup.ts`
- `tests/integration/**`
- `tests/browser/**`
- `docs/testing-strategy.md`
- `docs/release-checklist.md`

## 10. 接手时的建议阅读顺序

1. `README.md`
2. `docs/deployment.md`
3. `docs/troubleshooting.md`
4. 本文档 `docs/architecture.md`
5. `docs/development.md`
6. `docs/environment.md`
7. `docs/release-checklist.md`
8. 再按改动类型进入专项手册

如果要改后台与鉴权，再重点读：
- `lib/auth.ts`
- `lib/settings.ts`
- `app/(admin)/[adminPath]/**`
- `docs/admin-extension-workflow.md`

如果要改运维链路，再重点读：
- `scripts/**`
- `lib/backup/**`
- `lib/search/**`
- `app/api/internal/**`
- `docs/execution-boundaries.md`

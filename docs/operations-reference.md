# Inkwell 运维参考索引

本文档面向未来维护者与部署者，集中整理 Inkwell 当前最常用的：
- CLI 命令
- internal API 入口
- 常见触发场景
- 恢复与验证命令
- 日常排查时最先该看什么

目标不是重复部署文档正文，而是提供一份 **高频可查的运维入口总览页**。

如果你需要完整部署步骤，优先看：
- `docs/deployment.md`
- `docs/upgrade-and-rollback.md`
- `docs/release-checklist.md`

## 1. 先看哪份文档

### 1.1 如果你是第一次接手线上实例
建议顺序：
1. `docs/deployment.md`
2. `docs/first-deployment-checklist.md`
3. 本文档
4. `docs/monitoring-and-logs.md`
5. `docs/troubleshooting.md`

### 1.2 如果你已经知道问题大概在哪
- 部署 / 反向代理 / HTTPS：`docs/deployment.md`
- 升级 / 回滚 / 恢复：`docs/upgrade-and-rollback.md`
- 登录 / 搜索 / 备份异常：`docs/troubleshooting.md`
- 日志 / 运行态检查：`docs/monitoring-and-logs.md`
- CLI / internal API / 入口分工：本文档 + `docs/execution-boundaries.md`

## 2. 能力矩阵：该用 CLI、internal API，还是直接看公开资源？

| 能力 | CLI 入口 | internal API | 公开资源 / 路由 | 什么时候优先用 |
| --- | --- | --- | --- | --- |
| 健康检查 | 无 | 无 | `GET /api/health` | 探活、反向代理联调、发布后 smoke |
| 定时发布 | `npm run posts:publish-scheduled` | `POST /api/internal/posts/publish-scheduled` | 无 | 宿主机 cron 用 CLI；外部调度器用 internal API |
| 搜索重建 | `npm run search:reindex-posts` | 无 | 搜索页结果本身可作为验证面 | 首次部署、恢复后、Meilisearch 丢数据 |
| 备份导出 | `npm run backup:export -- --output <dir>` | 无 | 无 | 升级前、迁移前、定期快照 |
| 备份导入 | `npm run backup:import -- --input <dir> --force --reindex-search` | 无 | 无 | 失败恢复、整站迁移、测试恢复演练 |
| 数据库迁移 | `npm run db:migrate` | 无 | 无 | 首次部署、新版本上线、schema 变更 |
| 初始化默认设置 | `npm run db:seed` | 无 | 无 | 新实例初始化、缺少默认设置时 |
| 创建管理员 | `npm run admin:create -- <email> <username> <displayName> <password>` | 无 | 后台登录页可作为结果验证面 | 首次部署、恢复后兜底 |
| 发布后公开资源验证 | 无 | 无 | `/sitemap.xml`、`/rss.xml`、`/robots.txt`、文章页 | 怀疑公开内容未更新时 |

## 3. 入口对照：每个能力背后到底对应什么

| 能力 | 入口层 | 共享实现 / 关键位置 | 行为要点 |
| --- | --- | --- | --- |
| 健康检查 | `app/api/health/route.ts` | 同文件 | 返回 `{ data: { status, timestamp }, error: null }` |
| 定时发布 | `scripts/publish-scheduled-posts.ts` / `app/api/internal/posts/publish-scheduled/route.ts` | `lib/admin/posts.ts` | 发布到期文章、更新 sitemap、联动搜索与后续公开可见内容 |
| 搜索重建 | `scripts/reindex-search-posts.ts` | `lib/search/reindex-posts.ts`、`lib/meilisearch.ts` | 从 PostgreSQL 重建 `published_posts` 索引 |
| 备份导出 | `scripts/export-backup.ts` | `lib/backup/export.ts` | 导出数据库快照与本地媒体，默认对 secret 脱敏 |
| 备份导入 | `scripts/import-backup.ts` | `lib/backup/import.ts` | 校验 manifest / checksum / schema tag，必要时重建搜索 |
| 创建管理员 | `scripts/create-admin.ts` | 同文件 + `lib/password-utils.ts` | 创建或按 email 更新管理员账号 |

说明：
- CLI 层负责加载 `.env.local`、解析参数、输出稳定结果、设置退出码
- internal API 负责 HTTP 协议边界、鉴权 header、JSON 响应
- 更细边界见：`docs/execution-boundaries.md`

## 4. 最常用的运维入口

### 4.1 健康检查
```http
GET /api/health
```

作用：
- 确认应用进程是否已正常响应
- 用于 smoke / 反向代理联调 / 发布后快速探活

返回结构：
- `data.status`
- `data.timestamp`
- `error = null`

实现位置：
- `app/api/health/route.ts`

说明：
- 这个接口适合做最小探活
- 它不能证明数据库、搜索、后台登录、上传链路都正常

### 4.2 定时发布 CLI
```bash
npm run posts:publish-scheduled
```

适用场景：
- Linux cron
- 面板定时任务
- 手动补跑 scheduled publish

前置依赖：
- `DATABASE_URL`
- `.env.local` 可被 CLI 读取
- 数据库中存在到期或待检查的 scheduled 文章

行为要点：
- 扫描到期 scheduled 文章
- 发布文章
- 更新 sitemap
- 清理 revision
- 联动后续公开可见内容变化

推荐优先用 CLI 的情况：
- 你能直接登录宿主机
- 你要配置 cron
- 你要手动排查调度链路

### 4.3 定时发布 internal API
```http
POST /api/internal/posts/publish-scheduled
Authorization: Bearer <INTERNAL_CRON_SECRET>
```

适用场景：
- 外部调度器
- 平台任务系统
- 不方便直接执行本地 CLI 的环境

前置依赖：
- `INTERNAL_CRON_SECRET`
- 应用已启动且可访问
- 请求方能安全保存 secret

返回与行为：
- secret 缺失：`503` + `INTERNAL_CRON_SECRET is not configured.`
- header 缺失或错误：`401` + `Unauthorized.`
- 成功：`200`，返回 `publishedCount`、`publishedPostIds`、`affectedSlugs`、`triggeredAt`
- 即使没有到期文章，也可能返回 `200` 且 `publishedCount = 0`

注意：
- 这是内部接口，不是公开 API
- 不要把 `INTERNAL_CRON_SECRET` 暴露给浏览器端
- 更适合机器对机器调用，不适合人工长期手动触发

### 4.4 搜索重建
```bash
npm run search:reindex-posts
```

可选：
```bash
npm run search:reindex-posts -- --batch-size 200
npm run search:reindex-posts -- --slug-prefix post-
```

适用场景：
- 首次为已有站点启用 Meilisearch
- Meilisearch 数据丢失
- backup restore 后恢复搜索
- 怀疑搜索索引与 PostgreSQL 已发布文章不一致

前置依赖：
- `DATABASE_URL`
- `MEILISEARCH_HOST`
- 如启用鉴权，还需要 `MEILISEARCH_API_KEY`

输出要点：
- CLI 会输出 JSON，包含：
  - `indexName`
  - `batchSize`
  - `batchCount`
  - `sourceCount`
  - `indexedCount`

重要说明：
- backup/export 不包含 Meilisearch 索引
- PostgreSQL 才是 canonical source of truth
- 单纯搜索异常，通常不需要整站数据回滚

### 4.5 备份导出
```bash
npm run backup:export -- --output ./backup
```

可选：
```bash
npm run backup:export -- --output ./backup --include-secrets
```

适用场景：
- 升级前备份
- 迁移站点前备份
- 定期快照留存

前置依赖：
- `DATABASE_URL`
- 输出目录可写

输出要点：
- CLI 会输出 JSON，包含：
  - `outputDir`
  - `manifestPath`
  - `secretPolicy`
  - `tableCount`
  - `mediaFileCount`
  - `warnings`

说明：
- 默认会对 `settings` 中的 secret 做脱敏
- 是否允许包含 secret，应按你的备份策略决定

### 4.6 备份导入
```bash
npm run backup:import -- --input ./backup --force --reindex-search
```

可选：
```bash
npm run backup:import -- --input ./backup --force
```

适用场景：
- 完整恢复站点
- 升级失败后回滚到旧快照
- 迁移到新实例

前置依赖：
- `DATABASE_URL`
- 输入目录存在且结构完整
- 当前代码版本与备份 schema 兼容

输出要点：
- CLI 会输出 JSON，包含：
  - `inputDir`
  - `importedTableCount`
  - `restoredMediaFileCount`
  - `preservedSecretKeys`
  - `skippedRedactedSecretKeys`
  - `reindexedSearch`

行为要点：
- 默认会拒绝覆盖非空目标实例
- `--force` 允许覆盖当前业务表与 `public/uploads`
- `--reindex-search` 会在恢复后联动搜索重建

### 4.7 数据库迁移
```bash
npm run db:migrate
```

适用场景：
- 新版本部署
- 首次初始化实例
- schema 变更后应用 migration

前置依赖：
- `DATABASE_URL`
- 当前代码与迁移文件匹配

### 4.8 初始化默认设置
```bash
npm run db:seed
```

适用场景：
- 首次初始化实例
- 缺少默认 settings 的新环境

前置依赖：
- `DATABASE_URL`

### 4.9 创建管理员
```bash
npm run admin:create -- <email> <username> <displayName> <password>
```

适用场景：
- 首次部署
- 恢复后重新确保管理员账号存在

前置依赖：
- `DATABASE_URL`
- 提供完整参数

输出要点：
- 成功时输出：`Admin user ready: <email>`
- 参数不足时会直接报 usage 错误

## 5. 按场景找入口

### 5.1 首次部署后最小验证
建议按顺序：

```bash
npm run db:migrate
npm run db:seed
npm run admin:create -- <email> <username> <displayName> <password>
npm run search:reindex-posts
```

然后检查：
- `GET /api/health`
- 首页是否返回 200
- 后台是否可登录

更完整顺序见：`docs/first-deployment-checklist.md`

### 5.2 升级前准备
建议至少执行：

```bash
npm run backup:export -- --output <backup-dir>
```

如有 schema 改动，再执行升级流程中的：

```bash
npm run db:migrate
```

更完整步骤见：`docs/upgrade-and-rollback.md`

### 5.3 升级后 smoke
至少检查：
- `GET /api/health`
- 首页
- 后台登录
- 一篇已发布文章页

如涉及搜索或恢复，再执行：

```bash
npm run search:reindex-posts
```

### 5.4 定时发布不生效
先确认：
- 是否真的有 `scheduled` 且到期的文章
- cron / 外部调度器是否正常触发
- `INTERNAL_CRON_SECRET` 是否正确

手动补跑：

```bash
npm run posts:publish-scheduled
```

或调内部 API：

```http
POST /api/internal/posts/publish-scheduled
Authorization: Bearer <INTERNAL_CRON_SECRET>
```

### 5.5 搜索丢失或不一致
优先执行：

```bash
npm run search:reindex-posts
```

说明：
- backup/export 不包含 Meilisearch 索引
- PostgreSQL 才是 canonical source of truth
- 单纯搜索异常，通常不需要整站数据回滚

### 5.6 完整恢复站点
优先执行：

```bash
npm run backup:import -- --input <backup-dir> --force --reindex-search
```

恢复后再检查：
- 首页
- 后台登录
- 文章页
- 搜索
- 媒体文件

### 5.7 后台登录异常
优先检查：
- HTTPS 是否开启
- `NEXTAUTH_URL` 是否为对外 HTTPS 地址
- `NEXTAUTH_SECRET` 是否存在
- `admin_path` 是否变化

相关文档：
- `docs/deployment.md`
- `docs/troubleshooting.md`
- `docs/settings-system.md`

## 6. CLI 与 internal API 对照表

| 能力 | CLI 更适合 | internal API 更适合 | 为什么 |
| --- | --- | --- | --- |
| 定时发布 | 宿主机 cron、手动补跑、SSH 进机器排障 | 外部调度器、平台任务系统 | 两者调用同一类业务能力，但边界不同 |
| 搜索重建 | 是 | 无 | 当前只提供 CLI 入口 |
| 备份导出 | 是 | 无 | 当前只提供 CLI 入口 |
| 备份导入 | 是 | 无 | 当前只提供 CLI 入口 |
| 健康探活 | 无 | 无，直接用公开 `GET /api/health` | 这是最小公开探活接口 |

## 7. 公开资源与恢复相关入口

这些入口不是“运维命令”，但在验证发布与恢复时经常要检查：
- `/sitemap.xml`
- `/rss.xml`
- `/robots.txt`
- 分类 / 标签 RSS 路由
- 一篇已发布文章页

当你怀疑发布后公开内容没有更新时，除了文章页本身，还要一起检查这些资源。

## 8. 常见恢复顺序

### 8.1 最小恢复顺序
1. 确认 `.env` / secret 仍可用
2. `npm run db:migrate`
3. `npm run build`
4. 启动服务
5. `GET /api/health`
6. 后台登录 smoke

### 8.2 完整站点恢复顺序
1. 切回兼容代码版本（如有需要）
2. 确认 secret 与部署配置
3. `npm run backup:import -- --input <backup-dir> --force --reindex-search`
4. 重启服务
5. 做首页 / 后台 / 文章页 / 搜索 smoke

更细说明见：`docs/upgrade-and-rollback.md`

## 9. 常见误区

- 把 internal API 当成公开接口
- 搜索异常就直接整站回滚
- 忘记 backup 不包含 Meilisearch 索引
- 忘记 standalone 构建后要补 `public` 与 `.next/static`
- 升级前不做备份
- 只回退代码，不处理已经变化的数据库状态
- 只看 `GET /api/health` 正常就认为整站可用

## 10. 推荐搭配阅读

如果你接下来要做：
- 部署：看 `docs/deployment.md`
- 首次上线验收：看 `docs/first-deployment-checklist.md`
- 升级 / 回滚：看 `docs/upgrade-and-rollback.md`
- 发布前检查：看 `docs/release-checklist.md`
- 运维问题排查：看 `docs/troubleshooting.md`
- 日志与监控：看 `docs/monitoring-and-logs.md`
- 执行边界判断：看 `docs/execution-boundaries.md`

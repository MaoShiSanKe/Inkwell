# Inkwell 运维参考索引

本文档面向未来维护者与部署者，集中整理 Inkwell 当前最常用的：
- CLI 命令
- internal API 入口
- 常见触发场景
- 恢复与验证命令
- 日常排查时最先该看什么

目标不是重复部署文档正文，而是提供一份 **高频可查的运维索引页**。

如果你需要完整部署步骤，优先看：
- `docs/deployment.md`
- `docs/upgrade-and-rollback.md`
- `docs/release-checklist.md`

## 1. 最常用的运维入口

### 1.1 健康检查
```http
GET /api/health
```

作用：
- 确认应用进程是否已正常响应
- 用于 smoke / 反向代理联调 / 发布后快速探活

返回结构：
- `data.status`
- `data.timestamp`

实现位置：
- `app/api/health/route.ts`

### 1.2 定时发布 CLI
```bash
npm run posts:publish-scheduled
```

适用场景：
- Linux cron
- 面板定时任务
- 手动补跑 scheduled publish

作用：
- 扫描到期 scheduled 文章
- 发布文章
- 更新 sitemap
- 清理 revision
- 联动后续公开可见内容变化

### 1.3 定时发布 internal API
```http
POST /api/internal/posts/publish-scheduled
Authorization: Bearer <INTERNAL_CRON_SECRET>
```

适用场景：
- 外部调度器
- 平台任务系统
- 不方便直接执行本地 CLI 的环境

实现位置：
- `app/api/internal/posts/publish-scheduled/route.ts`

注意：
- 这是内部接口，不是公开 API
- 不要把 `INTERNAL_CRON_SECRET` 暴露给浏览器端

### 1.4 搜索重建
```bash
npm run search:reindex-posts
```

可选：
```bash
npm run search:reindex-posts -- --batch-size 200
```

适用场景：
- 首次为已有站点启用 Meilisearch
- Meilisearch 数据丢失
- backup restore 后恢复搜索
- 怀疑搜索索引与 PostgreSQL 已发布文章不一致

### 1.5 备份导出
```bash
npm run backup:export -- --output ./backup
```

适用场景：
- 升级前备份
- 迁移站点前备份
- 定期快照留存

### 1.6 备份导入
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

### 1.7 数据库迁移
```bash
npm run db:migrate
```

适用场景：
- 新版本部署
- 首次初始化实例
- schema 变更后应用 migration

### 1.8 初始化默认设置
```bash
npm run db:seed
```

适用场景：
- 首次初始化实例
- 缺少默认 settings 的新环境

### 1.9 创建管理员
```bash
npm run admin:create -- <email> <username> <displayName> <password>
```

适用场景：
- 首次部署
- 恢复后重新确保管理员账号存在

## 2. 按场景找命令

### 2.1 首次部署后最小验证
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

### 2.2 升级前准备
建议至少执行：

```bash
npm run backup:export -- --output <backup-dir>
```

如有 schema 改动，再执行升级流程中的：

```bash
npm run db:migrate
```

更完整步骤见：`docs/upgrade-and-rollback.md`

### 2.3 升级后 smoke
至少检查：
- `GET /api/health`
- 首页
- 后台登录
- 一篇已发布文章页

如涉及搜索或恢复，再执行：

```bash
npm run search:reindex-posts
```

### 2.4 定时发布不生效
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

### 2.5 搜索丢失或不一致
优先执行：

```bash
npm run search:reindex-posts
```

说明：
- backup/export 不包含 Meilisearch 索引
- PostgreSQL 才是 canonical source of truth
- 单纯搜索异常，通常不需要整站数据回滚

### 2.6 完整恢复站点
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

### 2.7 后台登录异常
优先检查：
- HTTPS 是否开启
- `NEXTAUTH_URL` 是否为对外 HTTPS 地址
- `NEXTAUTH_SECRET` 是否存在
- `admin_path` 是否变化

相关文档：
- `docs/deployment.md`
- `docs/troubleshooting.md`
- `docs/settings-system.md`

## 3. CLI 命令速查表

| 命令 | 用途 | 典型场景 |
| --- | --- | --- |
| `npm run db:migrate` | 应用数据库迁移 | 新版本部署、首次初始化 |
| `npm run db:seed` | 写入默认设置/初始数据 | 新实例初始化 |
| `npm run admin:create -- <...>` | 创建或更新管理员 | 首次部署、恢复后兜底 |
| `npm run posts:publish-scheduled` | 手动触发定时发布 | cron、手动补跑 |
| `npm run search:reindex-posts` | 重建搜索索引 | 搜索丢失、恢复后重建 |
| `npm run backup:export -- --output <dir>` | 导出数据库与媒体快照 | 升级前、迁移前、定期备份 |
| `npm run backup:import -- --input <dir> --force --reindex-search` | 恢复快照并重建搜索 | 失败恢复、整站迁移 |
| `npm run build` | 生成生产构建 | 宿主机 / Docker 部署前 |
| `npm run docs:build` | 构建文档站 | 文档改动后验证 |

## 4. internal API 速查表

| 入口 | 方法 | 用途 | 备注 |
| --- | --- | --- | --- |
| `/api/health` | `GET` | 健康检查 | 公开可探活 |
| `/api/internal/posts/publish-scheduled` | `POST` | 触发 scheduled publish | 需要 `Authorization: Bearer <INTERNAL_CRON_SECRET>` |

## 5. 公开资源与恢复相关入口

这些入口不是“运维命令”，但在验证发布与恢复时经常要检查：
- `/sitemap.xml`
- `/rss.xml`
- `/robots.txt`
- 分类 / 标签 RSS 路由

当你怀疑发布后公开内容没有更新时，除了文章页本身，还要一起检查这些资源。

## 6. 常见恢复顺序

### 6.1 最小恢复顺序
1. 确认 `.env` / secret 仍可用
2. `npm run db:migrate`
3. `npm run build`
4. 启动服务
5. `GET /api/health`
6. 后台登录 smoke

### 6.2 完整站点恢复顺序
1. 切回兼容代码版本（如有需要）
2. 确认 secret 与部署配置
3. `npm run backup:import -- --input <backup-dir> --force --reindex-search`
4. 重启服务
5. 做首页 / 后台 / 文章页 / 搜索 smoke

更细说明见：`docs/upgrade-and-rollback.md`

## 7. 常见误区

- 把 internal API 当成公开接口
- 搜索异常就直接整站回滚
- 忘记 backup 不包含 Meilisearch 索引
- 忘记 standalone 构建后要补 `public` 与 `.next/static`
- 升级前不做备份
- 只回退代码，不处理已经变化的数据库状态

## 8. 推荐搭配阅读

如果你接下来要做：
- 部署：看 `docs/deployment.md`
- 升级 / 回滚：看 `docs/upgrade-and-rollback.md`
- 发布前检查：看 `docs/release-checklist.md`
- 运维问题排查：看 `docs/troubleshooting.md`
- 执行边界判断：看 `docs/execution-boundaries.md`

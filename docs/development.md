# Inkwell 开发指南

本文档面向未来维护者与贡献者，说明如何在本地恢复开发环境、修改代码并安全提交。

## 1. 本地开发最小前提

至少需要：
- Node.js 20+
- PostgreSQL
- Meilisearch
- 可写项目目录

环境变量模板见：`.env.example`

最小必填：
```bash
DATABASE_URL=
MEILISEARCH_HOST=
MEILISEARCH_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
INTERNAL_CRON_SECRET=
```

## 2. 首次启动顺序

### 2.1 安装依赖
```bash
npm install
```

### 2.2 准备环境变量
```bash
cp .env.example .env.local
```

然后填写 `.env.local`。

### 2.3 初始化数据库
```bash
npm run db:migrate
npm run db:seed
```

### 2.4 创建管理员
```bash
npm run admin:create -- admin@example.com admin Admin change-me-password
```

### 2.5 启动开发环境
```bash
npm run dev
```

默认访问：
- 前台：`http://localhost:3000`
- 后台登录：`http://localhost:3000/admin/login`

## 3. 常用开发命令

### 应用与测试
```bash
npm run dev
npm run build
npm run start
npm run lint
npm run type-check
npm run test
npm run test:integration
npm run test:browser
```

### 数据库
```bash
npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:seed
npm run admin:create -- <email> <username> <displayName> <password>
```

### 运维与内容链路
```bash
npm run posts:publish-scheduled
npm run search:reindex-posts
npm run backup:export -- --output ./backup
npm run backup:import -- --input ./backup --force --reindex-search
```

### 文档站
```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```

## 4. 常见开发改动路径

### 4.1 改前台页面
通常会涉及：
- `app/(blog)/**`
- `components/blog/**`
- `lib/blog/**`

如果改的是文章、归档、搜索、SEO 等能力，通常还要检查：
- `tests/integration/**`
- `tests/browser/**`

### 4.2 改后台页面
通常会涉及：
- `app/(admin)/[adminPath]/**`
- `components/admin/**`
- `lib/admin/**`
- `lib/auth.ts`
- `lib/settings.ts`

如果改后台路径、登录、会话、设置面板，务必同步检查：
- HTTPS 行为
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `docs/deployment.md`
- `docs/troubleshooting.md`

### 4.3 改 API 路由
通常会涉及：
- `app/api/**`
- 对应业务服务层 `lib/**`

内部接口（例如定时发布）还要同步检查：
- 鉴权 header
- `INTERNAL_CRON_SECRET`
- 文档同步

### 4.4 改数据库 schema
通常会涉及：
- `lib/db/schema/**`
- 生成迁移后新增 `lib/db/migrations/**`

流程固定：
1. 修改 schema
2. 运行 `npm run db:generate`
3. 不手改自动生成迁移
4. 运行 `npm run db:migrate`
5. 补测试与文档

### 4.5 改搜索链路
通常会涉及：
- `lib/search/**`
- `lib/meilisearch.ts`
- `scripts/reindex-search-posts.ts`

注意：
- CLI 路径不要重新依赖 `server-only` 的应用 DB 入口
- 搜索恢复链路要考虑 backup/import 之后的 reindex

### 4.6 改备份恢复链路
通常会涉及：
- `lib/backup/export.ts`
- `lib/backup/import.ts`
- `scripts/export-backup.ts`
- `scripts/import-backup.ts`

注意：
- 要考虑 secret 脱敏与保留逻辑
- 要考虑媒体文件
- 要考虑恢复后搜索重建
- 文档必须同步更新

## 5. 提交前最低检查

至少执行：
```bash
npm run type-check
npm run lint
npm run test
```

如果改动涉及以下内容，建议进一步执行：
```bash
npm run test:integration
npm run test:browser
```

适用场景：
- 数据库变更
- 部署链路
- 后台流程
- 前台公开交互
- 鉴权/设置/搜索/备份恢复

## 6. 哪些改动必须同步文档

只要涉及以下任一内容，就需要同步改文档：
- 新增 CLI 命令
- 调整环境变量
- 调整部署方式
- 修改备份/恢复流程
- 修改后台路径、登录、HTTPS、反向代理行为
- 引入新的公开能力或删除旧能力
- 新增开发者必须知道的工作流

优先检查这些文档：
- `README.md`
- `docs/deployment.md`
- `docs/troubleshooting.md`
- `docs/faq.md`
- `docs/architecture.md`
- `docs/development.md`
- `docs/environment.md`
- `docs/release-checklist.md`

## 7. 常见易忘点

### 7.1 后台登录依赖 HTTPS
生产环境后台 cookie 使用 `Secure`，公网正式部署必须启用 HTTPS。

### 7.2 standalone 宿主机部署需要补齐静态资源
构建后要把：
- `public`
- `.next/static`
复制到 `.next/standalone`

否则会出现：
- 首页 200
- 但 CSS / JS 404

### 7.3 搜索索引不是备份内容的一部分
backup/export 不包含 Meilisearch 索引。
恢复后通常需要：
```bash
npm run search:reindex-posts
```
或：
```bash
npm run backup:import -- --input ./backup --force --reindex-search
```

### 7.4 设置有一部分不在 `.env`
很多运行期配置来自数据库 `settings` 表，不要误以为所有东西都在 `.env.local`。

## 8. 文档站维护原则

当前文档站使用 VitePress + GitHub Pages。

维护原则：
- 仓库中的 Markdown 是 source of truth
- 文档站只是展示层，不维护第二份正文
- 修改 docs 内容时，优先改原始 Markdown，再由文档站重新构建

## 9. 接手开发时的推荐顺序

如果你已经很久没碰项目，建议按这个顺序恢复上下文：

1. `README.md`
2. `docs/deployment.md`
3. `docs/troubleshooting.md`
4. `docs/architecture.md`
5. 本文档 `docs/development.md`
6. `docs/environment.md`
7. `docs/release-checklist.md`

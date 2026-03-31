# Inkwell

Inkwell 是一个基于 Next.js App Router、PostgreSQL 和 Drizzle ORM 的自建博客框架，目标是替代 WordPress，提供内容管理、评论互动、SEO 优化与访客统计能力。

## 开发命令

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run type-check
npm run test
npm run test:integration
npm run test:browser
npm run db:generate
npm run db:migrate
npm run db:studio
npm run backup:export -- --output ./backup
npm run backup:import -- --input ./backup --force --reindex-search
npm run search:reindex-posts
```

## 测试说明

- `npm run test`：运行默认 Vitest 测试集，覆盖纯逻辑与 SSR 测试，并排除 `tests/integration/` 与 `tests/browser/`。
- `npm run test:integration`：使用 `vitest.integration.config.ts` 运行数据库相关集成测试。
- `npm run test:browser`：使用 Playwright 运行 `tests/browser/` 下的浏览器回归测试，默认访问 `http://localhost:3000`，必要时按 `playwright.config.ts` 自动启动 `npm run dev`。
- 当前浏览器回归覆盖公开归档、文章目录（TOC）、相关文章、浏览量、点赞、主题切换，以及公开文章页面包屑与分类跳转链路（`tests/browser/post-breadcrumbs.spec.ts`）。

## 环境变量

复制 `.env.example` 为 `.env.local` 后填写以下变量：

- `DATABASE_URL`
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `INTERNAL_CRON_SECRET`

## 备份与恢复

导出当前数据库快照与本地上传文件：

```bash
npm run backup:export -- --output ./backup
```

将快照恢复到当前实例：

```bash
npm run backup:import -- --input ./backup --force --reindex-search
```

说明：
- `--force` 会清空当前数据库中的业务表数据，并替换 `public/uploads`
- 默认拒绝导入到非空实例，避免误覆盖现有站点
- 默认导出会对 `settings` 表中的 secret 做脱敏；导入时会尽量保留目标实例现有 secret 值
- 由于备份不包含 Meilisearch 索引内容，恢复后建议配合 `--reindex-search` 或手动执行 `npm run search:reindex-posts`

## Docker / Compose（生产示例）

仓库提供 `Dockerfile` 与 `docker-compose.production.yml`，用于单机生产示例：

- `app`：Next.js 应用
- `postgres`：主数据库
- `meilisearch`：搜索索引服务

使用前请先修改 Compose 中的默认 secret 与域名配置，再执行：

```bash
docker build -t inkwell:local .
docker compose -f docker-compose.production.yml up -d
```

首次启动后，仍需在 app 容器内手动执行：

```bash
npm run db:migrate
npm run admin:create -- <email> <username> <displayName> <password>
npm run search:reindex-posts
```

说明：
- `public/uploads` 需要持久化，否则本地媒体会在重建后丢失
- 若是新建或丢失了 `meilisearch_data` volume，需手动执行一次 `npm run search:reindex-posts` 回填历史已发布文章索引
- 定时发布仍建议通过宿主机 cron 或外部调度器触发，不在容器内附带 scheduler
- 反向代理 / TLS 仍建议由容器外的 Nginx / Caddy 负责

## 宿主机 VPS 部署提示

如果使用 Linux VPS 宿主机原生部署，当前已经实测通过的关键链路包括：

- `npm run db:migrate`
- `npm run db:seed`
- `npm run admin:create -- <email> <username> <displayName> <password>`
- `npm run search:reindex-posts`
- `npm run backup:export -- --output <dir>`
- `npm run backup:import -- --input <dir> --force --reindex-search`

额外注意：
- `next build` 在低内存机器上可能需要额外 swap 或 `NODE_OPTIONS=--max-old-space-size=768`
- 若使用 systemd 托管 `.next/standalone/server.js`，要显式加载项目内 `.env.local`，否则运行期可能缺少 `DATABASE_URL` 等环境变量
- 宿主机 standalone 部署时，还要额外补齐 `public` 与 `.next/static` 到 `.next/standalone`，否则前端静态资源可能 `404`
- 本地媒体建议由 Nginx 直接托管 `public/uploads`
- 详细步骤见 `docs/deployment.md`

## 数据库约定

- Drizzle schema 位于 `lib/db/schema/`
- 自动生成的迁移位于 `lib/db/migrations/`
- 不要手动编辑迁移文件

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

## 数据库约定

- Drizzle schema 位于 `lib/db/schema/`
- 自动生成的迁移位于 `lib/db/migrations/`
- 不要手动编辑迁移文件

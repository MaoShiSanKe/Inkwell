# Inkwell

Inkwell 是一个基于 Next.js App Router、PostgreSQL 和 Drizzle ORM 的自建博客框架，目标是替代 WordPress，提供内容管理、评论互动、SEO 优化与访客统计能力。

## 开发命令

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run type-check
npm run db:generate
npm run db:migrate
npm run db:studio
```

## 环境变量

复制 `.env.example` 为 `.env.local` 后填写以下变量：

- `DATABASE_URL`
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

## 数据库约定

- Drizzle schema 位于 `lib/db/schema/`
- 自动生成的迁移位于 `lib/db/migrations/`
- 不要手动编辑迁移文件

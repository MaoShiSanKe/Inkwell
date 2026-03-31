# Inkwell

Inkwell 是一个面向自托管场景的博客 CMS / Publishing System，基于 Next.js App Router、PostgreSQL、Drizzle ORM 与 Meilisearch 构建，目标是提供一套可部署、可扩展、可恢复的内容发布系统，用于替代传统 WordPress 式博客后台。

[在线文档](https://maoshisanke.github.io/Inkwell/) · [部署指南](https://maoshisanke.github.io/Inkwell/docs/deployment) · [开发接手](https://maoshisanke.github.io/Inkwell/docs/development) · [贡献指南](CONTRIBUTING.md)

## 快速入口

| 入口 | 说明 |
| --- | --- |
| [在线文档](https://maoshisanke.github.io/Inkwell/) | 面向公开访客的独立文档站 |
| [部署指南](docs/deployment.md) | VPS / Docker / HTTPS / 备份恢复 / 搜索重建 |
| [开发接手文档](docs/development.md) | 面向未来维护者与贡献者的开发指南 |
| [架构总览](docs/architecture.md) | 快速恢复目录结构与关键链路认知 |
| [贡献指南](CONTRIBUTING.md) | 本地开发、提交流程与文档同步规则 |

## 当前状态

当前仓库已经具备博客 CMS 的核心能力，并已实测通过：

- Linux VPS 原生部署（Nginx + systemd + HTTPS）
- Docker / Docker Compose 单机部署示例
- 后台登录、文章发布、搜索重建、备份恢复等关键链路
- 独立文档站（GitHub Pages + VitePress）已上线
- 面向未来维护者的开发接手文档已补齐

当前更偏向：

- **单站点、自托管博客 CMS**
- **工程化可部署**
- **公开发布前的持续完善阶段**

## 为什么是 Inkwell

- **自托管优先**：数据库、媒体文件、搜索服务与部署链路都掌握在自己手里
- **工程化部署**：同时覆盖 Linux VPS 宿主机部署与 Docker / Compose 单机示例
- **可恢复**：已经具备 backup export / import 与搜索重建链路
- **对维护者友好**：除公开文档外，还补齐了开发接手、环境配置与发布检查文档

## 适合谁

- 个人博客
- 自托管内容站
- 小团队编辑型站点
- 希望掌控数据库、媒体文件与部署链路的用户
- 接受 PostgreSQL / Nginx / Docker / VPS 基础运维概念的开发者

## 当前不主打的场景

- 零门槛 SaaS 型博客后台
- 多租户 / 多站点平台
- 多机集群 / Kubernetes 官方部署方案
- 开箱即用对象存储适配层
- 完全不接触部署与运维细节的使用方式

## 项目预览

| 前台首页 | 后台管理 |
| --- | --- |
| ![Inkwell 前台首页预览](docs/assets/readme-frontend-home.png) | ![Inkwell 后台管理预览](docs/assets/readme-admin-dashboard.png) |

上图分别展示了公开前台首页与后台管理首页的当前界面状态。

## 项目定位

Inkwell 更适合“希望自己掌控内容系统与部署链路”的用户，而不是追求插件堆叠式后台体验或零运维 SaaS 的场景。

它当前最强调的是：

- **内容发布系统本身可用**
- **部署链路可验证**
- **搜索与备份恢复可落地**
- **未来继续维护时能快速恢复上下文**

因此，它更像一个面向自托管博客场景、持续打磨中的工程化 CMS，而不是一个强调一键式平台体验的托管产品。

## 项目亮点

- 公开文档站与仓库内 Markdown 同步维护
- 后台路径由数据库 settings 控制，而不是写死路由
- 生产环境登录、HTTPS、搜索、备份恢复等真实问题已在文档中沉淀
- 当前仓库已经具备继续公开完善的结构基础

## 功能概览

### 内容管理
- 文章创建、编辑、草稿、发布、定时发布
- 修订历史与保留策略
- slug 与历史别名管理
- 分类、标签、系列管理
- 自定义独立页面
- 友链管理

### 前台能力
- 首页、文章页、分类页、标签页、系列页、作者页
- 搜索页（Meilisearch）
- RSS / Sitemap / SEO 元信息 / 结构化数据
- 评论系统
- 点赞、浏览量、主题切换等公开交互能力

### 后台能力
- 后台登录与路径配置
- 文章管理、评论管理、媒体库、分类/标签/系列管理
- IP 黑名单
- 邮件通知开关与站点设置管理
- 订阅者管理

### 运维能力
- `npm run posts:publish-scheduled`
- `/api/internal/posts/publish-scheduled`
- `npm run search:reindex-posts`
- `npm run backup:export`
- `npm run backup:import`
- Docker / Compose 单机部署示例

## 已验证能力

### 部署与访问
- Linux VPS 原生部署（Nginx + systemd + HTTPS）
- Docker / Docker Compose 单机部署示例
- 独立文档站通过 GitHub Pages 发布

### 核心链路
- 后台登录与受保护后台访问
- 文章创建、编辑、真实发布链路
- 搜索索引重建
- 备份导出与恢复
- 定时发布脚本与内部 API 触发

### 文档与接手
- 仓库首页 README
- 独立文档站
- 部署文档 / FAQ / Troubleshooting
- 架构总览 / 开发指南 / 环境说明 / 发布检查清单

## 技术栈

| 层级 | 方案 |
| --- | --- |
| 应用框架 | Next.js 16（App Router） |
| 前端 | React 19 |
| 数据库 | PostgreSQL |
| ORM / 迁移 | Drizzle ORM / drizzle-kit |
| 搜索 | Meilisearch |
| 媒体处理 | Sharp |
| 邮件 | Nodemailer |
| 测试 | Vitest / Playwright |
| 部署 | Nginx / systemd / Docker Compose |
| 文档站 | VitePress / GitHub Pages |

## 快速开始

> 以下示例以本地开发为主。生产部署请直接看 `docs/deployment.md`。

### 1. 前置要求

你至少需要准备：

- Node.js 20+
- PostgreSQL
- Meilisearch
- 一个可写的本地项目目录

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local`，并填写：

```bash
DATABASE_URL=
MEILISEARCH_HOST=
MEILISEARCH_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
INTERNAL_CRON_SECRET=
```

说明：

- `NEXTAUTH_SECRET` 用于后台登录会话签名
- `NEXTAUTH_URL` 应设置为站点对外访问地址
- `INTERNAL_CRON_SECRET` 用于内部定时发布 API 鉴权
- SMTP、Turnstile、Umami 等配置主要通过数据库 `settings` 管理

### 4. 初始化数据库与管理员

```bash
npm run db:migrate
npm run db:seed
npm run admin:create -- admin@example.com admin Admin change-me-password
```

### 5. 启动开发环境

```bash
npm run dev
```

默认访问：

- 前台：`http://localhost:3000`
- 后台登录：`http://localhost:3000/admin/login`

## 常用命令

### 开发与测试

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

### 运维与内容发布

```bash
npm run posts:publish-scheduled
npm run search:reindex-posts
npm run backup:export -- --output ./backup
npm run backup:import -- --input ./backup --force --reindex-search
```

## 部署方式

### 方式 A：Linux VPS 宿主机部署

已实测通过：

- Nginx 反向代理
- systemd 托管 Next.js standalone
- certbot 签发 HTTPS 证书
- 后台登录与文章发布真实链路

关键提醒：

- 生产环境必须启用 HTTPS
- 后台会话在生产环境默认使用 `Secure` cookie
- standalone 宿主机部署时，需补齐 `public` 与 `.next/static` 到 `.next/standalone`
- 本地媒体建议由 Nginx 直接托管 `public/uploads`

详细步骤见：[`docs/deployment.md`](docs/deployment.md)

### 方式 B：Docker / Compose 单机部署

仓库提供：

- `Dockerfile`
- `.dockerignore`
- `docker-compose.production.yml`

首次启动后，仍需手动执行：

```bash
npm run db:migrate
npm run admin:create -- <email> <username> <displayName> <password>
npm run search:reindex-posts
```

说明：

- `public/uploads` 需要持久化
- PostgreSQL / Meilisearch 数据需要持久化
- 反向代理 / TLS 仍建议由容器外的 Nginx / Caddy 负责

详细步骤同样见：[`docs/deployment.md`](docs/deployment.md)

## 备份、恢复与搜索重建

### 导出备份

```bash
npm run backup:export -- --output ./backup
```

### 恢复备份

```bash
npm run backup:import -- --input ./backup --force --reindex-search
```

### 重建搜索索引

```bash
npm run search:reindex-posts
```

说明：

- 默认导出会对 `settings` 表中的 secret 做脱敏
- `--force` 会清空当前业务表并替换 `public/uploads`
- 备份不包含 Meilisearch 索引数据，恢复后建议执行 `--reindex-search`

## 文档导航

当前仓库内推荐阅读顺序：

1. [`README.md`](README.md) — 项目定位、快速开始、主要入口
2. [`docs/README.md`](docs/README.md) — 仓库文档索引、维护入口与 change type 导航
3. [`docs/deployment.md`](docs/deployment.md) — 部署、HTTPS、运维、恢复
4. [`docs/upgrade-and-rollback.md`](docs/upgrade-and-rollback.md) — 版本升级、失败回滚与恢复顺序
5. [`docs/operations-reference.md`](docs/operations-reference.md) — CLI、internal API、恢复与验证命令速查
6. [`docs/architecture.md`](docs/architecture.md) — 系统分层、执行边界、核心链路
7. [`docs/development.md`](docs/development.md) — 本地开发流程、按改动类型找入口
8. [`docs/troubleshooting.md`](docs/troubleshooting.md) — 常见部署与运行故障排查
9. [`docs/faq.md`](docs/faq.md) — 常见问题
10. [`CONTRIBUTING.md`](CONTRIBUTING.md) — 贡献指南
11. [`docs/ROADMAP.md`](docs/ROADMAP.md) — 文档体系后续演进方向

如果你已经确定要改哪类内容，可以直接看：

- 后台模块扩展：[`docs/admin-extension-workflow.md`](docs/admin-extension-workflow.md)
- 设置系统：[`docs/settings-system.md`](docs/settings-system.md)
- Schema 与迁移：[`docs/schema-and-migrations.md`](docs/schema-and-migrations.md)
- 执行边界：[`docs/execution-boundaries.md`](docs/execution-boundaries.md)
- 测试策略：[`docs/testing-strategy.md`](docs/testing-strategy.md)
- 升级与回滚：[`docs/upgrade-and-rollback.md`](docs/upgrade-and-rollback.md)
- 运维参考：[`docs/operations-reference.md`](docs/operations-reference.md)

## 当前边界与已知非目标

当前仓库的默认重心是：

- 自托管博客 CMS
- 单机部署优先
- 可恢复、可维护、可扩展的工程基础

当前未内置的能力包括：

- 自动证书申请 / ACME 客户端
- 多机集群 / Kubernetes 官方方案
- 内置对象存储适配层

这些能力更适合作为后续部署生态的一部分逐步完善。

## 文档站现状与后续

当前已经完成：

- 独立文档站已通过 GitHub Pages + VitePress 上线
- 仓库 Markdown 继续作为 source of truth
- README、部署文档、FAQ、故障排查、开发接手文档已接入展示层
- 面向维护者的扩展手册已经补齐：后台扩展、设置系统、schema/migration、执行边界、测试策略

接下来更值得继续补的内容：

- Nginx / Caddy 更完整的公开部署示例
- 升级与回滚指南
- 更细的 FAQ / Troubleshooting
- 文档站首页与公开上手路径继续打磨
- 更多面向长期维护的参考型文档

具体建议见：[`docs/ROADMAP.md`](docs/ROADMAP.md)

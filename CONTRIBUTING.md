# Contributing to Inkwell

感谢你关注 Inkwell。

当前项目仍处于持续完善阶段，欢迎围绕以下方向贡献：

- 功能完善
- Bug 修复
- 测试补强
- 文档改进
- 部署与运维经验沉淀

## 开发环境

建议准备：

- Node.js 20+
- PostgreSQL
- Meilisearch
- 本地可写工作目录

复制环境变量模板：

```bash
cp .env.example .env.local
```

然后填写至少以下变量：

```bash
DATABASE_URL=
MEILISEARCH_HOST=
MEILISEARCH_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
INTERNAL_CRON_SECRET=
```

## 启动项目

安装依赖：

```bash
npm install
```

初始化数据库：

```bash
npm run db:migrate
npm run db:seed
```

创建管理员：

```bash
npm run admin:create -- admin@example.com admin Admin change-me-password
```

启动开发服务：

```bash
npm run dev
```

## 提交前建议至少执行

```bash
npm run type-check
npm run lint
npm run test
```

若改动涉及数据库、部署、后台流程、前台用户交互，建议进一步执行：

```bash
npm run test:integration
npm run test:browser
```

## 文档同步要求

如果你的改动涉及以下任一内容，请同步更新文档：

- 新增 CLI 命令
- 调整环境变量
- 调整部署方式
- 修改备份/恢复流程
- 修改后台路径、登录、HTTPS、反向代理行为
- 引入新的公开能力或删除旧能力

常见需要更新的文件：

- `README.md`
- `docs/deployment.md`
- `docs/troubleshooting.md`
- `docs/faq.md`
- `docs/ROADMAP.md`

## 数据库与迁移规则

- 修改 schema 后，使用 `npm run db:generate` 生成迁移
- 不要手动编辑 `lib/db/migrations/` 中自动生成的迁移文件
- 不要直接改线上数据库结构而绕过迁移

## 安全与敏感信息

提交前请确认：

- 没有提交 `.env.local`
- 没有提交真实密钥、令牌、证书、私钥、数据库连接串
- 没有把部署机上的真实路径、账户或敏感日志直接写进仓库文档

当前仓库内应只保留：

- `.env.example` 这类占位模板
- 可公开的部署示例
- 去敏后的命令示例

## 部署相关贡献建议

如果你修改了部署链路，请尽量同时验证：

- `npm run db:migrate`
- `npm run admin:create`
- `npm run search:reindex-posts`
- `npm run backup:export`
- `npm run backup:import -- --force --reindex-search`
- `/api/health`

如果你的改动影响后台登录，请优先在 HTTPS 场景下验证，因为生产环境后台会话默认使用 `Secure` cookie。

## 文档站相关贡献建议

当前仓库已接入独立 docs site 基础设施（VitePress + GitHub Pages）。

如果你准备推动文档体系建设，请先阅读：

- `docs/README.md`
- `docs/ROADMAP.md`
- `docs/architecture.md`
- `docs/development.md`

维护原则：

- 仓库中的 Markdown 是 source of truth
- 文档站负责展示、导航与搜索
- 不要维护第二份重复正文
- 修改文档后，至少执行一次 `npm run docs:build`
- 如需本地预览，使用 `npm run docs:dev` 或 `npm run docs:preview`。

## 提交风格

建议使用清晰、简短、表达“为什么”的提交信息，例如：

- `fix: unblock CLI reindex on standalone deploy`
- `docs: expand public deployment guidance`
- `feat: add backup import CLI`

## 反馈与问题

若你发现项目问题，建议优先附带：

- 复现步骤
- 实际结果
- 预期结果
- 运行环境（本地 / Docker / VPS）
- 相关日志或截图（注意脱敏）

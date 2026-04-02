# Inkwell 开发指南

本文档面向未来维护者与贡献者，说明如何在本地恢复开发环境、修改代码并安全提交。

如果你是第一次接手本仓库，建议先看：
1. `README.md`
2. `docs/deployment.md`
3. `docs/architecture.md`
4. 本文档

如果你已经知道要改什么，但不确定该从哪里入手，优先看本文第 4 节的“按改动类型找入口”。

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

配置归属与边界建议继续看：`docs/environment.md`

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

## 4. 按改动类型找入口

这是未来维护时最有用的一节：先判断你改动的类型，再进入对应文档，而不是一上来就在代码里盲找。

### 4.1 新增或改造后台模块
通常会涉及：
- `app/(admin)/[adminPath]/**`
- `components/admin/**`
- `lib/admin/**`

先看：
- `docs/admin-extension-workflow.md`
- `docs/execution-boundaries.md`

至少验证：
```bash
npm run test
npm run test:integration
```

如果影响真实交互流程，再补：
```bash
npm run test:browser
```

### 4.2 新增或调整 DB-backed setting
通常会涉及：
- `lib/settings-config.ts`
- `lib/settings.ts`
- `lib/admin/settings.ts`
- `components/admin/settings-form.tsx`
- `app/(admin)/[adminPath]/(protected)/settings/actions.ts`

先看：
- `docs/settings-system.md`
- `docs/environment.md`

建议验证：
```bash
npm run test
npm run test:integration
npm run test:browser
```

### 4.3 修改 schema / migration / relation
通常会涉及：
- `lib/db/schema/**`
- `lib/db/schema/index.ts`
- `lib/db/migrations/**`

先看：
- `docs/schema-and-migrations.md`
- `docs/testing-strategy.md`

最低流程：
```bash
npm run db:generate
npm run db:migrate
npm run type-check
npm run lint
npm run test
```

### 4.4 判断该用 server action、route handler 还是 CLI
通常会涉及：
- `app/(admin)/**/actions.ts`
- `app/api/**`
- `scripts/*.ts`
- `lib/**`

先看：
- `docs/execution-boundaries.md`
- `docs/architecture.md`

### 4.5 前台页面或公开交互改动
通常会涉及：
- `app/(blog)/**`
- `components/blog/**`
- `lib/blog/**`

如果改动涉及首页 Hero、公开布局壳层、主题模式或前台展示变体，先补读：
- `docs/theme-framework.md`

建议先看：
- `docs/testing-strategy.md`
- `docs/architecture.md`
- `docs/theme-framework.md`

Theme Framework v1 当前已经覆盖：
- 页头品牌区 / 页脚说明区
- 首页 Hero 与主 CTA
- 首页精选入口区块（三张固定卡片）
- 首页文章列表 `comfortable | compact` 变体
- 首页摘要 / 作者 / 分类 / 发布时间开关
- `localStorage > backend default > system` 的默认主题模式优先级

这类改动通常不只是单个 `page.tsx` 文案变化，而是会同时影响 settings、公开布局和浏览器端主题状态。

建议至少验证：
```bash
npm run test
npm run test:browser
```

如改动同时触及 settings 保存链路，再补：
```bash
npm run test:integration
```

建议优先参考：
- `app/(blog)/page.test.tsx`
- `app/(blog)/layout.test.tsx`
- `tests/browser/settings.spec.ts`
- `tests/browser/theme-toggle.spec.ts`

若只是纯文档同步，再按 4.7 执行。

### 4.6 搜索 / 备份恢复 / 定时发布 / 运维脚本改动
通常会涉及：
- `lib/search/**`
- `lib/backup/**`
- `scripts/**`
- `app/api/internal/**`

先看：
- `docs/execution-boundaries.md`
- `docs/testing-strategy.md`
- `docs/deployment.md`

至少验证：
```bash
npm run test
npm run test:integration
```

### 4.7 纯文档或 docs site 改动
通常会涉及：
- `README.md`
- `docs/**`
- `.vitepress/config.ts`

先看：
- `docs/README.md`
- `docs/ROADMAP.md`

最低验证：
```bash
npm run docs:build
```

## 5. change type 决策树

如果你不确定该从哪层开始，可以按下面这个顺序判断：

### 场景 A：只是页面读数据展示
优先检查：page / component / query 层

### 场景 B：后台表单提交或管理操作
优先检查：server action + `lib/admin/**`

### 场景 C：需要稳定 HTTP 接口给外部系统调用
优先检查：`app/api/**` + shared service

### 场景 D：需要宿主机 cron 或手动命令入口
优先检查：`scripts/*.ts` + shared service

### 场景 E：需要新增持久化结构
优先检查：`lib/db/schema/**` + `docs/schema-and-migrations.md`

### 场景 F：需要新增站点运行时设置
优先检查：`docs/settings-system.md`，先判断它到底该进 `.env` 还是 `settings`

## 6. 常见开发改动路径

### 6.1 改后台页面
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

### 6.2 改 API 路由
通常会涉及：
- `app/api/**`
- 对应业务服务层 `lib/**`

内部接口（例如定时发布）还要同步检查：
- 鉴权 header
- `INTERNAL_CRON_SECRET`
- 文档同步

### 6.3 改搜索链路
通常会涉及：
- `lib/search/**`
- `lib/meilisearch.ts`
- `scripts/reindex-search-posts.ts`

注意：
- CLI 路径不要重新依赖 `server-only` 的应用 DB 入口
- 搜索恢复链路要考虑 backup/import 之后的 reindex

### 6.4 改备份恢复链路
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

## 7. 提交前最低检查

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
- 鉴权 / settings / 搜索 / 备份恢复

更细规则见：`docs/testing-strategy.md`

## 8. 哪些改动必须同步文档

只要涉及以下任一内容，就需要同步改文档：
- 新增 CLI 命令
- 调整环境变量
- 调整部署方式
- 修改备份/恢复流程
- 修改后台路径、登录、HTTPS、反向代理行为
- 引入新的公开能力或删除旧能力
- 新增开发者必须知道的工作流
- 改变测试建议、执行边界或维护流程

优先检查这些文档：
- `README.md`
- `docs/deployment.md`
- `docs/troubleshooting.md`
- `docs/faq.md`
- `docs/architecture.md`
- `docs/development.md`
- `docs/environment.md`
- `docs/release-checklist.md`
- 对应专项手册

## 9. 常见易忘点

### 9.1 后台登录依赖 HTTPS
生产环境后台 cookie 使用 `Secure`，公网正式部署必须启用 HTTPS。

### 9.2 standalone 宿主机部署需要补齐静态资源
构建后要把：
- `public`
- `.next/static`
复制到 `.next/standalone`

否则会出现：
- 首页 200
- 但 CSS / JS 404

### 9.3 搜索索引不是备份内容的一部分
backup/export 不包含 Meilisearch 索引。
恢复后通常需要：
```bash
npm run search:reindex-posts
```
或：
```bash
npm run backup:import -- --input ./backup --force --reindex-search
```

### 9.4 设置有一部分不在 `.env`
很多运行期配置来自数据库 `settings` 表，不要误以为所有东西都在 `.env.local`。

## 10. 文档站维护原则

当前文档站使用 VitePress + GitHub Pages。

维护原则：
- 仓库中的 Markdown 是 source of truth
- 文档站只是展示层，不维护第二份正文
- 修改 docs 内容时，优先改原始 Markdown，再由文档站重新构建

## 11. 接手开发时的推荐顺序

如果你已经很久没碰项目，建议按这个顺序恢复上下文：

1. `README.md`
2. `docs/deployment.md`
3. `docs/troubleshooting.md`
4. `docs/architecture.md`
5. 本文档 `docs/development.md`
6. `docs/environment.md`
7. `docs/release-checklist.md`
8. 再按改动类型进入专项手册

如果要改首页/公开布局，再重点读：
- `docs/theme-framework.md`
- `app/(blog)/layout.tsx`
- `app/(blog)/page.tsx`
- `lib/theme.ts`
- `tests/browser/settings.spec.ts`
- `tests/browser/theme-toggle.spec.ts`

如果要改设置页与保存链路，再重点读：
- `docs/settings-system.md`
- `components/admin/settings-form.tsx`
- `lib/admin/settings.ts`
- `app/(admin)/[adminPath]/(protected)/settings/actions.ts`
- `tests/integration/admin/settings.integration.test.ts`
- `tests/browser/settings.spec.ts`

文档同步时，优先维护仓库文档，不要把行为说明散落到本地说明或临时笔记里。

更多见：
- `docs/README.md`
- `docs/theme-framework.md`
- `docs/testing-strategy.md`

## 12. 本地协作约束

- 提交或推送前，先检查是否包含 `.env.local`、secrets、token、凭据、私钥或本地机器路径
- 删除文件前如果边界不确定，优先移动到 `E:/otherP/Inkwell/needdel`
- 修改范围仅限 `E:/otherP/Inkwell` 及其子目录
- 下载或补齐依赖时，优先局限在当前项目目录内，避免全局污染

这些规则与项目本地 `CLAUDE.md` 保持一致。

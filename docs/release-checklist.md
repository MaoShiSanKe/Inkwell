# Inkwell 发布与部署检查清单

本文档用于在正式部署、升级、迁移或长期搁置后重新恢复时，快速检查当前版本是否具备可上线状态。

如果你不确定这次改动到底该补哪些验证，先看：
- `docs/testing-strategy.md`
- 本文档

## 1. 发布前代码检查

至少执行：
```bash
npm run type-check
npm run lint
npm run test
```

若改动涉及以下任一内容，建议进一步执行：
```bash
npm run test:integration
npm run test:browser
```

适用场景：
- 数据库变更
- 部署链路
- 后台登录/鉴权
- 前台公开交互
- 搜索
- 备份恢复
- 媒体上传
- settings / admin_path

## 2. 文档同步检查

如果改动涉及以下内容，必须同步文档：
- 新增 CLI 命令
- 环境变量变更
- 部署方式变化
- 备份/恢复流程变化
- 搜索重建流程变化
- 后台路径、登录、HTTPS、反向代理行为变化
- 新增或删除公开能力
- 新增开发者必须了解的工作流
- 变更测试建议、执行边界或扩展方式

重点检查：
- `README.md`
- `docs/deployment.md`
- `docs/troubleshooting.md`
- `docs/faq.md`
- `docs/architecture.md`
- `docs/development.md`
- `docs/environment.md`
- 本文档
- 对应专项手册

## 3. 本地/目标环境配置检查

### 3.1 环境变量
确认以下变量已配置：
```bash
DATABASE_URL=
MEILISEARCH_HOST=
MEILISEARCH_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
INTERNAL_CRON_SECRET=
```

### 3.2 依赖服务
确认：
- PostgreSQL 可访问
- Meilisearch 可访问
- 应用运行环境已准备好（Node.js 或容器）

### 3.3 配置归属没有混淆
确认：
- 部署级 secret 仍在 `.env` / 环境注入中维护
- DB-backed setting 没被误做成部署环境变量
- route-affecting setting 改动后已同步验证重定向与文档

## 4. 数据库与初始化检查

按需执行：
```bash
npm run db:migrate
npm run db:seed
npm run admin:create -- <email> <username> <displayName> <password>
```

检查点：
- 迁移是否成功
- 是否需要初始化默认 settings
- 是否已有可用管理员账号

## 5. 专项变更检查

### 5.1 schema / migration 改动
如果本次改动涉及 schema，至少确认：
- 只修改了 `lib/db/schema/**`
- 使用 `npm run db:generate` 生成迁移
- 没有手改自动生成 migration
- `lib/db/schema/index.ts` 的 export / relation 已同步
- 若新增业务表，已检查 backup/export/import、搜索、seed、tests

建议参考：`docs/schema-and-migrations.md`

### 5.2 settings 系统改动
如果本次改动涉及 setting，至少确认：
- 已判断它应该进 `.env` 还是 `settings`
- `lib/settings-config.ts` 定义完整
- 相关 getter / admin service / form / action 已同步
- 若为 secret，已检查导出/恢复语义
- 若影响路由或公开页面，已检查 revalidation 与 browser 测试

建议参考：`docs/settings-system.md`

### 5.3 admin_path / 鉴权 / 登录改动
如果本次改动涉及后台路径、登录或鉴权，至少确认：
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` 正确
- HTTPS 场景可稳定登录
- 登录跳转与受保护页跳转正确
- 浏览器测试或手动 smoke 已覆盖
- 相关文档已同步

### 5.4 搜索 / 备份 / 定时发布 / 运维脚本改动
如果本次改动涉及这些链路，至少确认：
- CLI 入口没有重新依赖 Web-only 上下文
- internal API 的鉴权边界仍正确
- backup 恢复后的搜索重建路径可用
- 机器可读输出与退出码行为没有退化

建议参考：`docs/execution-boundaries.md`

### 5.5 revalidation 范围改动
如果本次改动改变了 mutation 成功后的刷新行为，至少确认：
- 后台页是否被刷新
- 对应公开路由是否被刷新
- sitemap / RSS 是否需要刷新
- layout 级 setting 改动是否刷新首页或公共布局

## 6. 搜索与备份链路检查

### 6.1 搜索重建
按需执行：
```bash
npm run search:reindex-posts
```

适用场景：
- 首次启用 Meilisearch
- Meilisearch 数据丢失
- 备份恢复后

### 6.2 备份导出
```bash
npm run backup:export -- --output ./backup
```

### 6.3 备份导入
```bash
npm run backup:import -- --input ./backup --force --reindex-search
```

检查点：
- 导出是否成功
- 导入是否按预期拒绝/覆盖
- 恢复后搜索是否能重建

## 7. 宿主机部署检查

如果使用 Linux VPS 宿主机部署，至少确认：

### 7.1 build 与 standalone
```bash
npm run build
```

构建后确认：
- `public` 已复制到 `.next/standalone`
- `.next/static` 已复制到 `.next/standalone/.next`

### 7.2 systemd / 环境文件
确认运行进程显式加载了 `.env.local`，否则可能出现：
- `DATABASE_URL is not configured`

### 7.3 HTTPS
确认：
- 公网已启用 HTTPS
- `NEXTAUTH_URL` 为外部 HTTPS 地址
- 后台登录会话可稳定持久化

## 8. Docker / Compose 部署检查

如果使用 Compose，至少确认：
- `app + postgres + meilisearch` 均可启动
- `public/uploads` 已持久化
- PostgreSQL / Meilisearch 数据卷已持久化
- 首次启动后执行过：
```bash
npm run db:migrate
npm run admin:create -- <email> <username> <displayName> <password>
npm run search:reindex-posts
```
- 反向代理 / TLS 在容器外处理

## 9. 上线后 smoke 检查

建议至少覆盖：

### 9.1 基础访问
- 首页返回 200
- CSS / JS 正常加载
- 关键页面可访问

### 9.2 后台
- 后台登录页可打开
- 登录成功后会话稳定
- 能进入文章管理页

### 9.3 内容链路
- 新建/编辑/发布文章成功
- 前台文章页可访问
- sitemap / RSS 更新正常

### 9.4 运维链路
- `GET /api/health` 正常
- 定时发布 CLI 或内部 API 可触发
- 搜索可用
- 备份导出/恢复可执行

## 10. 文档站检查

如果本次改动涉及 docs site，还应确认：

### 本地
```bash
npm run docs:build
npm run docs:preview
```

### GitHub Pages
- GitHub Actions workflow 成功
- Pages 可访问
- 导航、搜索、链接正常
- 关键开发文档可访问
- 新增手册已能从 sidebar 或索引页找到

## 11. 长期搁置后重新接手时的恢复顺序

如果项目停了一段时间，再回来时建议按顺序恢复：

1. `README.md`
2. `docs/deployment.md`
3. `docs/troubleshooting.md`
4. `docs/architecture.md`
5. `docs/development.md`
6. `docs/environment.md`
7. 本文档

这样能最快恢复：
- 部署状态
- 架构认知
- 运行配置
- 发布检查路径

# Inkwell 发布与部署检查清单

本文档用于在正式部署、升级、迁移或长期搁置后重新恢复时，快速检查当前版本是否具备可上线状态。

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

重点检查：
- `README.md`
- `docs/deployment.md`
- `docs/troubleshooting.md`
- `docs/faq.md`
- `docs/architecture.md`
- `docs/development.md`
- `docs/environment.md`
- 本文档

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

## 5. 搜索与备份链路检查

### 5.1 搜索重建
按需执行：
```bash
npm run search:reindex-posts
```

适用场景：
- 首次启用 Meilisearch
- Meilisearch 数据丢失
- 备份恢复后

### 5.2 备份导出
```bash
npm run backup:export -- --output ./backup
```

### 5.3 备份导入
```bash
npm run backup:import -- --input ./backup --force --reindex-search
```

检查点：
- 导出是否成功
- 导入是否按预期拒绝/覆盖
- 恢复后搜索是否能重建

## 6. 宿主机部署检查

如果使用 Linux VPS 宿主机部署，至少确认：

### 6.1 build 与 standalone
```bash
npm run build
```

构建后确认：
- `public` 已复制到 `.next/standalone`
- `.next/static` 已复制到 `.next/standalone/.next`

### 6.2 systemd / 环境文件
确认运行进程显式加载了 `.env.local`，否则可能出现：
- `DATABASE_URL is not configured`

### 6.3 HTTPS
确认：
- 公网已启用 HTTPS
- `NEXTAUTH_URL` 为外部 HTTPS 地址
- 后台登录会话可稳定持久化

## 7. Docker / Compose 部署检查

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

## 8. 上线后 smoke 检查

建议至少覆盖：

### 8.1 基础访问
- 首页返回 200
- CSS / JS 正常加载
- 关键页面可访问

### 8.2 后台
- 后台登录页可打开
- 登录成功后会话稳定
- 能进入文章管理页

### 8.3 内容链路
- 新建/编辑/发布文章成功
- 前台文章页可访问
- sitemap / RSS 更新正常

### 8.4 运维链路
- `GET /api/health` 正常
- 定时发布 CLI 或内部 API 可触发
- 搜索可用
- 备份导出/恢复可执行

## 9. 文档站检查

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

## 10. 长期搁置后重新接手时的恢复顺序

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

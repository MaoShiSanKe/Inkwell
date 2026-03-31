# Inkwell 升级与回滚指南

本文档面向未来维护者与部署者，说明当你需要升级 Inkwell 版本、部署新改动，或在升级失败后恢复站点时，应该按什么顺序操作。

适用范围：
- Linux VPS 宿主机部署
- Docker / Docker Compose 单机部署
- 单站点、自托管场景

不适用范围：
- 多机集群
- Kubernetes
- 蓝绿发布 / 金丝雀发布
- 自动化数据库回滚平台

## 1. 先理解 Inkwell 的恢复模型

升级与回滚前，先记住几个关键事实：

### 1.1 PostgreSQL + uploads 才是核心状态
对 Inkwell 来说，真正需要保护的是：
- PostgreSQL 业务数据
- `public/uploads` 媒体文件
- 部署环境中的 secret 与配置

### 1.2 Meilisearch 索引不是备份主体
搜索索引可以重建，不是主数据源。

恢复后如果需要，执行：

```bash
npm run search:reindex-posts
```

或在恢复时直接带上：

```bash
npm run backup:import -- --input <backup-dir> --force --reindex-search
```

### 1.3 backup snapshot 与代码版本有关联
当前 backup manifest 会记录：
- `packageVersion`
- `latestDrizzleMigrationTag`

这意味着：
- 不能把任意快照随便恢复到任意代码版本
- 如果要做完整数据回滚，应该先恢复到与该快照兼容的代码版本，再导入快照

### 1.4 secret 默认不会被完整导出
`backup:export` 默认会对 `settings` 表中的 secret 做脱敏。

这意味着：
- 备份恢复不会替你凭空恢复真实 secret
- 回滚前要确认 `.env` 中的部署级 secret 仍可用
- DB-backed secret 若备份中是脱敏值，目标实例没有当前值时，该 secret 可能会被跳过

## 2. 升级前最低准备

无论是宿主机还是 Docker，升级前都建议先做下面这些事。

### 2.1 记录当前已知可用版本
至少记下：
- 当前代码提交或发布版本
- 当前部署方式（VPS / Docker）
- 当前 `.env` / 反向代理 / systemd 或 Compose 配置位置

如果你使用 git 部署，建议先记住当前提交：

```bash
git rev-parse HEAD
```

### 2.2 先做一次可恢复备份
建议在升级前执行：

```bash
npm run backup:export -- --output <backup-dir>
```

至少确认：
- 备份目录已生成
- 导出过程中没有 checksum / media 缺失错误
- 你知道这个备份对应的是哪个版本

### 2.3 先看这次升级是否涉及高风险变更
如果这次改动涉及以下任一项，要提高回滚警觉：
- schema / migration
- settings 结构变化
- `admin_path` 或登录相关行为
- 搜索索引结构
- backup import / export 行为
- 部署方式、standalone 资源复制、反向代理或 HTTPS

建议先阅读：
- `docs/release-checklist.md`
- `docs/schema-and-migrations.md`
- `docs/settings-system.md`
- `docs/testing-strategy.md`

### 2.4 先确认回滚材料是否齐全
至少确认：
- 上一个可用代码版本仍可拿到
- 升级前备份已完成
- `.env` / secret 没有丢
- 你知道如何重启当前部署方式下的服务

## 3. 宿主机部署升级步骤

适用于：
- Linux VPS
- systemd 托管 Next.js standalone
- Nginx 反向代理

推荐顺序：

### 3.1 拉取新代码
把项目更新到目标版本。

### 3.2 安装依赖
```bash
npm install
```

### 3.3 应用数据库迁移
```bash
npm run db:migrate
```

如果这一步失败，不要继续启动新版本，先停在这里处理。

### 3.4 构建应用
```bash
npm run build
```

### 3.5 补齐 standalone 静态资源
如果你使用 standalone 部署，构建后仍要确认：
- `public` 已复制到 `.next/standalone`
- `.next/static` 已复制到 `.next/standalone/.next`

否则很容易出现：
- 首页 200
- 但 CSS / JS 404

### 3.6 重启服务
使用你的 systemd 服务配置重启应用。

### 3.7 做升级后最小 smoke
至少确认：
- 首页可访问
- CSS / JS 正常
- `GET /api/health` 正常
- 后台登录稳定
- 关键后台页可打开

如果这次升级涉及搜索、备份恢复或内容发布，再补：
- `npm run search:reindex-posts`
- `npm run posts:publish-scheduled`
- 手动创建/编辑/发布一篇文章验证链路

## 4. Docker / Compose 升级步骤

适用于：
- `docker-compose.production.yml`
- 单机 app + postgres + meilisearch 方案

推荐顺序：

### 4.1 更新代码与配置
确认：
- Compose 配置已更新
- 占位 secret / 域名没有被错误覆盖
- volume 仍然正确挂载

### 4.2 重建并启动容器
常见方式：

```bash
docker compose -f docker-compose.production.yml up -d --build
```

### 4.3 在 app 容器内执行迁移
```bash
docker compose -f docker-compose.production.yml exec app npm run db:migrate
```

### 4.4 按需执行初始化或恢复性命令
例如：

```bash
docker compose -f docker-compose.production.yml exec app npm run search:reindex-posts
```

### 4.5 做升级后最小 smoke
至少确认：
- 首页正常
- 健康检查正常
- 后台登录正常
- app / postgres / meilisearch 都在运行
- `public/uploads` 与数据卷未丢

## 5. 什么时候可以只做代码回滚

满足以下条件时，可以优先尝试 **代码回滚**：
- 还没有执行新的 migration
- 或虽然执行了 migration，但旧代码仍能兼容当前数据库结构
- 数据本身没有被错误写坏
- 主要问题是构建、静态资源、部署配置或运行时行为退化

典型例子：
- standalone 静态资源漏复制
- Nginx / HTTPS 配置错误
- 新版本前端资源有问题
- 反向代理或环境变量配置失误

这种情况下，优先思路通常是：
1. 切回上一个已知可用代码版本
2. 重新安装依赖 / 构建
3. 重新启动服务
4. 再做 smoke

## 6. 什么时候需要完整数据回滚

满足以下任一项时，要考虑 **代码 + 数据一起回滚**：
- 已执行的新 migration 与旧代码不兼容
- 新版本写入了错误数据
- settings / schema 结构变化导致站点逻辑失真
- 数据恢复必须回到升级前状态

这种情况下，不要只回退代码；否则可能出现：
- 代码版本回退了，但数据库结构已经不匹配
- 旧代码启动了，但行为仍异常
- secret / settings 状态不一致

## 7. 完整回滚步骤

### 7.1 先切回与备份兼容的代码版本
这是完整回滚最容易忽略的一步。

先恢复到与升级前备份匹配的代码版本，再继续导入备份。

### 7.2 确认部署级 secret 仍然可用
确认：
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `INTERNAL_CRON_SECRET`
- `MEILISEARCH_*`

仍然正确。

### 7.3 执行备份恢复
```bash
npm run backup:import -- --input <backup-dir> --force --reindex-search
```

如果你不想在恢复时联动搜索重建，也可以先：

```bash
npm run backup:import -- --input <backup-dir> --force
```

然后再手动执行：

```bash
npm run search:reindex-posts
```

### 7.4 重启服务并做 smoke
至少确认：
- 首页正常
- 后台可登录
- 关键文章页可访问
- 搜索可用
- sitemap / RSS 正常
- 媒体文件没有丢

## 8. 升级失败后的决策顺序

如果升级后站点异常，建议按下面顺序判断：

### 场景 A：站点起不来 / 页面无样式 / 健康检查异常
优先检查：
- `npm run build` 是否成功
- standalone 静态资源是否复制
- systemd / Compose / Nginx 是否指向新构建结果

通常先考虑代码或部署层回退。

### 场景 B：后台登录异常
优先检查：
- HTTPS
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `admin_path` 是否发生变化

通常先考虑配置修正或代码回退。

### 场景 C：数据库行为异常 / 页面结构错乱 / 保存逻辑异常
优先检查：
- 是否执行了新 migration
- schema / settings 是否已变化
- 是否需要完整数据回滚

### 场景 D：只有搜索异常
优先检查：
- Meilisearch volume 是否还在
- 直接执行：

```bash
npm run search:reindex-posts
```

不要因为单纯搜索异常就立刻做整站数据回滚。

## 9. 升级后建议验证清单

至少验证：
- `GET /api/health`
- 首页加载
- 后台登录
- 文章列表页
- 一篇已发布文章详情页

如果涉及高风险改动，再追加：
- 设置页保存
- 新建 / 编辑 / 发布文章
- 搜索页查询
- 备份导出
- 备份导入到测试环境或备用实例
- 定时发布入口

更完整检查可参考：`docs/release-checklist.md`

## 10. 常见错误

- 没做升级前备份就直接迁移
- 只回退代码，不处理已经变化的数据库状态
- 忘记 backup snapshot 与 migration tag 绑定
- 忘记 `.env` / secret 不是备份自动恢复的一部分
- 宿主机升级后忘记补齐 `public` 与 `.next/static`
- 搜索异常时直接整站回滚，而不是先 reindex

## 11. 推荐阅读顺序

如果你接下来准备做升级或回滚，建议按顺序读：

1. `docs/deployment.md`
2. 本文档 `docs/upgrade-and-rollback.md`
3. `docs/release-checklist.md`
4. `docs/troubleshooting.md`
5. 若涉及 schema / settings，再看对应专项手册

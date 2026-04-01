# Inkwell 常见维护决策记录

本文档不是命令索引，也不是排障手册。

它面向未来维护者，回答的是另一类问题：
> **当你已经知道要处理什么问题时，下一步该怎么判断方向，而不是立刻开始试错？**

如果你现在需要的是：
- 常用命令与入口：看 `docs/operations-reference.md`
- 环境与配置归属：看 `docs/environment.md`
- 执行边界：看 `docs/execution-boundaries.md`
- 升级 / 回滚 / 恢复：看 `docs/upgrade-and-rollback.md`
- 运行态巡检与日志：看 `docs/monitoring-and-logs.md`
- 先记录现场事实再做判断：看 `docs/maintenance-field-template.md`
- 准备交接给下一位维护者：看 `docs/handoff-checklist.md`

## 1. 先理解：这份文档解决什么问题

维护阶段最容易浪费时间的地方不是“不会执行命令”，而是：
- 该改 `.env` 还是 `settings`
- 该用 CLI 还是 internal API
- 搜索异常时该先 reindex 还是回滚
- 这次是“首次验收”问题，还是“长期维护”问题
- 这类改动到底要不要同步文档

这份文档就是把这些高频判断集中放到一页里。

## 2. env 还是 settings？

### 优先放 `.env` 的情况
满足以下任一项时，优先考虑 `.env`：
- 进程启动前必须存在
- 属于部署环境差异
- 是外部服务连接配置
- 是不应在后台 UI 里随意暴露或修改的 secret

典型例子：
- `DATABASE_URL`
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `INTERNAL_CRON_SECRET`

### 优先放 `settings` 的情况
满足以下任一项时，优先考虑数据库 `settings`：
- 属于站点业务策略
- 管理员运行中可能需要调整
- 更接近站点行为，而不是基础设施连接

典型例子：
- `admin_path`
- revision 保留策略
- SMTP / Umami 等站点级配置

### 快速判断句
- 像“连接配置”的，优先 `.env`
- 像“站点行为配置”的，优先 `settings`
- 不确定时，先看 `docs/environment.md` 与 `docs/settings-system.md`

## 3. CLI 还是 internal API？

### 优先 CLI 的情况
更适合：
- 宿主机 cron
- SSH 登录后手动排查
- 本机直接执行运维动作
- 你需要稳定退出码与机器可读 CLI 输出

典型例子：
- `npm run posts:publish-scheduled`
- `npm run search:reindex-posts`
- `npm run backup:export`
- `npm run backup:import`

### 优先 internal API 的情况
更适合：
- 外部调度器
- 平台任务系统
- 机器对机器调用
- 不方便直接在目标环境执行 `npm` 命令

典型例子：
- `POST /api/internal/posts/publish-scheduled`

### 快速判断句
- 你能登录机器并执行 shell：优先 CLI
- 你要把调度交给外部系统：优先 internal API
- 需要更细边界说明：看 `docs/operations-reference.md` 与 `docs/execution-boundaries.md`

## 4. 搜索异常时，先 reindex 还是先回滚？

### 先 reindex 的情况
满足以下现象时，通常先重建索引：
- 搜索页能打开，但结果为空
- 恢复站点后搜索还没回来
- 只有 Meilisearch 索引状态异常
- 文章页本身仍正常

优先动作：

```bash
npm run search:reindex-posts
```

原因：
- PostgreSQL 才是 canonical source of truth
- backup 不包含 Meilisearch 索引
- “搜索空了”通常不等于“整站数据坏了”

### 先考虑回滚的情况
满足以下任一项时，再考虑回滚：
- schema / 数据结构已经被错误改动
- 新代码写入了错误数据
- 页面结构与业务行为整体异常，不只是一条搜索链路
- 升级后数据库状态与代码版本明显不匹配

### 快速判断句
- 只有搜索异常：先 reindex
- 数据 / schema / 页面行为整体失真：再考虑回滚
- 细节看 `docs/upgrade-and-rollback.md` 与 `docs/troubleshooting.md`

## 5. 代码回滚，还是代码 + 数据一起回滚？

### 先尝试只做代码回滚
更适合：
- 新 migration 还没执行
- 或执行了 migration，但旧代码仍兼容当前数据库结构
- 数据本身没有被错误写坏
- 问题主要在构建、静态资源、代理层、环境变量或运行时行为退化

典型例子：
- standalone 静态资源漏复制
- Nginx / HTTPS 配置错误
- 前端资源回归
- 环境变量配置失误

### 需要代码 + 数据一起回滚
更适合：
- 新 migration 与旧代码不兼容
- 新版本已经写入错误数据
- settings / schema 变化导致站点逻辑失真
- 你明确要回到升级前的数据状态

### 快速判断句
- 部署层 / 构建层 / 配置层问题：先代码回滚
- 数据层 / schema 层 / 状态层问题：考虑代码 + 数据一起回滚

## 6. 这是“首次验收”问题，还是“长期维护”问题？

### 更像首次验收
如果你刚部署完、新环境刚迁移完，或刚从恢复流程出来，需要判断 go / no-go：
- 优先看 `docs/first-deployment-checklist.md`

### 更像长期维护
如果站点已经稳定运行一段时间，你是在确认低频高风险链路有没有悄悄失效：
- 优先看 `docs/long-term-maintenance.md`

### 快速判断句
- 刚上线、刚迁移、刚恢复：先看首次验收
- 已上线一段时间、做周期性回看：先看长期维护

## 7. 这是“运行态排查”问题，还是“发布前检查”问题？

### 更像运行态排查
如果站点已经在线上异常：
- 优先看日志、健康检查、排障顺序
- 先看 `docs/monitoring-and-logs.md`
- 再看 `docs/troubleshooting.md`

### 更像发布前检查
如果站点还没上线，只是在判断这次改动是否已准备好：
- 优先看 `docs/release-checklist.md`
- 再看 `docs/testing-strategy.md`

### 快速判断句
- 线上正在坏：先排查
- 还没发，只是在判断能不能发：先检查发布条件

## 8. 改动后要不要同步文档？

### 必须同步的情况
只要改动影响以下任一项，就不该只改代码：
- CLI 命令
- 环境变量
- 部署方式
- 备份 / 恢复流程
- 搜索重建流程
- 后台路径、登录、HTTPS、反向代理行为
- 新增或删除公开能力
- 测试建议、执行边界、扩展方式

### 容易被忽略的情况
尤其别忘记：
- `admin_path` 改动会影响书签、路由认知与运维入口
- internal API 鉴权边界变化会影响调度方式
- revalidation 范围变化会影响公开页面、sitemap、RSS
- 文档站导航变化至少要跑一次 `npm run docs:build`

### 快速判断句
- 只要行为、入口、配置、验证方式变了，就同步文档
- 不确定时，至少检查 `README.md`、`docs/README.md`、`docs/release-checklist.md`

## 9. VPS 宿主机，还是 Docker / Compose？

### 优先 VPS 宿主机
更适合：
- 你熟悉 Linux、systemd、Nginx
- 你希望控制面更直接
- 你愿意自己处理构建、静态资源、环境注入与 cron

### 优先 Docker / Compose
更适合：
- 你希望部署结构更标准化
- 你更习惯容器化管理 app / postgres / meilisearch
- 你可以接受 TLS 与反向代理仍在容器外处理

### 快速判断句
- 你更熟悉宿主机运维：VPS 路线更直接
- 你更习惯容器生命周期管理：Compose 路线更稳妥
- 两者都不是零运维；详细对照见 `docs/deployment.md`

## 10. 哪些改动应被视为高风险维护决策？

只要涉及以下任一项，就不要把它当成普通小改动：
- `admin_path`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `INTERNAL_CRON_SECRET`
- schema / migration
- backup / restore 语义
- 搜索索引与 Meilisearch 连接
- 反向代理 / HTTPS / 静态资源路径
- revalidation 范围

这些改动至少应额外检查：
- 对应 smoke 是否覆盖
- 是否需要浏览器测试或集成测试
- 是否要同步 README / docs / FAQ / 运维入口

## 11. 推荐搭配阅读

- 配置归属：`docs/environment.md`
- 设置系统：`docs/settings-system.md`
- 运维入口：`docs/operations-reference.md`
- 执行边界：`docs/execution-boundaries.md`
- 升级 / 回滚：`docs/upgrade-and-rollback.md`
- 首次验收：`docs/first-deployment-checklist.md`
- 长期维护：`docs/long-term-maintenance.md`
- 发布检查：`docs/release-checklist.md`
- 故障排查：`docs/troubleshooting.md`

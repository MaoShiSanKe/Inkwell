# Inkwell FAQ

## Inkwell 是什么？

Inkwell 是一个面向自托管场景的博客 CMS / Publishing System，适合个人博客、小型内容站和希望掌控部署链路的用户。

## 它现在已经能正式上线吗？

可以用于正式上线你自己的博客。

当前已经实测通过：

- Linux VPS 原生部署
- Nginx + systemd + HTTPS
- 后台登录
- 文章发布
- 搜索重建
- 备份恢复

但如果你要把它当成“面对大众的一键部署型产品”，仍建议继续补文档与部署示例。

## 它是不是 WordPress 替代品？

定位上是，但范围更偏：

- 自托管
- 单机部署优先
- 工程化可维护
- 需要一定技术能力

当前不是“开箱即用的零门槛 SaaS 后台”。

## 需要 Docker 吗？

不需要。

当前支持两条主要路径：

- Linux VPS 宿主机部署
- Docker / Compose 单机部署

如果你熟悉 VPS、Nginx、systemd，宿主机部署完全可行。

## 为什么后台登录必须用 HTTPS？

因为生产环境后台会话默认使用 `Secure` cookie。

`Secure` cookie 只能通过 HTTPS 发送，所以公网正式部署时必须启用 HTTPS，后台登录才会稳定工作。

## 证书申请是不是项目内置的？

不是。

证书申请、续期、Nginx / Caddy 的 TLS 配置，属于部署层责任，不是 Inkwell 框架内置能力。

推荐在部署层使用：

- `certbot`
- `python3-certbot-nginx`

## 搜索数据是否包含在备份里？

不包含。

备份导出的是数据库业务数据和本地媒体文件；Meilisearch 索引内容不在备份内。

恢复后建议执行：

```bash
npm run search:reindex-posts
```

或直接在恢复时带上：

```bash
npm run backup:import -- --input ./backup --force --reindex-search
```

## 恢复备份时为什么默认拒绝导入？

这是安全保护。

默认不允许覆盖非空目标实例，避免误操作清空现有站点。

如果你明确要覆盖目标实例，需要加：

```bash
--force
```

## Docker / Compose 是否已经包含 HTTPS？

没有。

当前仓库提供的是：

- app
- PostgreSQL
- Meilisearch

HTTPS、证书申请、反向代理仍建议由容器外 Nginx / Caddy 负责。

## 为什么 `GET /api/health` 正常，站点仍可能不可用？

因为它只能证明：
- 应用进程正在响应
- 当前接口能返回 JSON

它不能自动证明这些链路也都正常：
- 首页 CSS / JS
- 后台登录与会话
- 搜索
- 备份导出 / 恢复
- internal API

所以 `GET /api/health` 更像“最小探活”，不是整站验收结论。

如果你要判断站点是否真的可用，继续看：
- `docs/first-deployment-checklist.md`
- `docs/monitoring-and-logs.md`

## 什么时候该用 CLI，什么时候该用 internal API？

简单判断：
- **宿主机 cron / SSH 手动排查 / 本机执行**：优先用 CLI
- **外部调度器 / 平台任务系统 / 机器对机器调用**：优先用 internal API

当前最典型的是 scheduled publish：
- CLI：`npm run posts:publish-scheduled`
- internal API：`POST /api/internal/posts/publish-scheduled`

如果你只是人工排查，CLI 通常更直接；如果你要接第三方调度器，internal API 更合适。

更完整对照见：`docs/operations-reference.md`

## 为什么后台路径会突然变成 404？

因为 Inkwell 的后台路径不是写死的，而是来自数据库 `settings` 里的 `admin_path`。

如果：
- 你访问的是旧后台路径
- 最近有人改了 `admin_path`
- 部署后文档 / 书签 / 路由认知没有同步

那么后台入口就可能直接 404。

这通常不是“页面丢了”，而是你访问的路径已经不是当前有效后台路径。

优先检查：
- 是否改过 `admin_path`
- 当前访问 URL 是否还是旧路径
- `docs/troubleshooting.md`

## 为什么恢复后搜索可能是空的？

因为 backup 不包含 Meilisearch 索引。

恢复后常见状态是：
- PostgreSQL 数据已经回来了
- 文章页可以打开
- 但搜索索引还没重建

此时直接执行：

```bash
npm run search:reindex-posts
```

或者恢复时直接带：

```bash
npm run backup:import -- --input ./backup --force --reindex-search
```

## 为什么发布后还要继续回看 24~48 小时？

因为很多问题不会在“刚发布完的 5 分钟内”立刻暴露，例如：
- 定时发布链路到下一次触发时才出问题
- 搜索或备份策略在后续运行时才显现异常
- 日志中连续错误需要一段时间才看得出来
- 用户会话、反向代理、静态资源缓存问题可能有延迟表现

所以发布后至少建议：
- 当天再回看一次
- 第二天再回看一次
- 如果改动涉及登录、搜索、备份恢复、代理层，适当提高频率

具体回看项见：`docs/monitoring-and-logs.md`

## 文档站是不是已经建好了？

是，当前已经上线基础可用版本，访问地址：

- `https://maoshisanke.github.io/Inkwell/`

当前状态：

- 仓库 Markdown 仍作为 source of truth
- 文档站使用 `VitePress`
- 托管在 `GitHub Pages`
- README、部署、FAQ、故障排查与开发接手文档已接入展示层
- 升级与回滚指南已补到 `docs/upgrade-and-rollback.md`

当前仍在继续完善：

- 文档首页与公开上手路径
- FAQ / Troubleshooting 继续补充
- 更多维护参考型文档

当前已补：
- `docs/upgrade-and-rollback.md`
- `docs/operations-reference.md`
- `docs/reverse-proxy-examples.md`
- `docs/monitoring-and-logs.md`
- `docs/first-deployment-checklist.md`
- `docs/troubleshooting.md` 的细化排障案例

## 为什么推荐 VitePress？

因为它：

- 与当前前端工程栈契合
- Markdown-first，迁移成本低
- 适合公开技术文档
- 搜索、导航、静态部署都比较轻量直接

如果未来出现更强的版本化、社区化需求，再考虑 Docusaurus 也合理。

## 当前最值得继续补什么？

如果目标是面向大众公开发布，建议继续补：

- 更完整的 FAQ
- 文档站首页与导航继续打磨
- 更多面向长期维护的参考型文档
- 更明确的发布后值班 / 回看建议

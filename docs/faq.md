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
- Nginx / Caddy 更完整示例
- FAQ / Troubleshooting 继续补充
- 更多维护参考型文档

## 为什么推荐 VitePress？

因为它：

- 与当前前端工程栈契合
- Markdown-first，迁移成本低
- 适合公开技术文档
- 搜索、导航、静态部署都比较轻量直接

如果未来出现更强的版本化、社区化需求，再考虑 Docusaurus 也合理。

## 当前最值得继续补什么？

如果目标是面向大众公开发布，建议继续补：

- Nginx / Caddy 完整示例
- 升级与回滚指南
- 首次部署检查清单
- 更完整的 FAQ
- 文档站首页与导航继续打磨

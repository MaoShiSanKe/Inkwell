# Inkwell 长期维护参考

本文档面向已经把 Inkwell 跑起来、并准备长期维护这个站点的维护者。

它要回答的问题不是：
> **现在这次部署有没有成功？**

而是：
> **站点已经上线并持续运行后，哪些周期性检查最值得坚持，哪些低频但高风险的链路最不能遗忘？**

如果你现在需要的是：
- 首次部署后的 go / no-go 验收：看 `docs/first-deployment-checklist.md`
- 发布前 / 升级前检查：看 `docs/release-checklist.md`
- 运行中站点的日志与最小巡检：看 `docs/monitoring-and-logs.md`
- 升级 / 回滚 / 恢复：看 `docs/upgrade-and-rollback.md`
- 常用运维命令入口：看 `docs/operations-reference.md`

## 1. 什么时候该打开这份文档

适合：
- 站点已经上线，准备做周期性回看
- 项目搁置一段时间后重新接手
- 想确认“平时不出事”的链路仍然真的可用
- 想避免只盯着首页可访问，却忽略备份、搜索、定时发布或后台登录这类低频高风险能力

不适合：
- 刚部署完、还没做首次验收
- 只做一次发布前 smoke
- 只想查某个具体命令怎么执行

## 2. 先把几类维护动作分开

长期维护里最容易混淆的是：把所有检查都塞进同一张清单。

更推荐把它分成四类：

### 2.1 首次上线验收
回答：这次部署是不是已经达到 go / no-go 条件。

优先看：
- `docs/first-deployment-checklist.md`

### 2.2 发布前 / 升级前检查
回答：这次改动上线前是否已经做了足够验证。

优先看：
- `docs/release-checklist.md`
- `docs/testing-strategy.md`

### 2.3 运行中排查与发布后回看
回答：现在站点是否还活着、日志是否已经出现异常信号。

优先看：
- `docs/monitoring-and-logs.md`
- `docs/troubleshooting.md`

### 2.4 周期性长期维护
回答：在“暂时没报错”的情况下，哪些链路仍然需要定期确认没有悄悄失效。

这正是本文档的重点。

## 3. 建议维护节奏

下面不是强制频率，而是一个低成本、足够实用的起点。
如果站点流量更大、改动更频繁，可以适当提高频率。

### 3.1 每周或每两周至少回看一次

建议至少确认：
- 首页与一篇已发布文章页仍可访问
- 后台登录页可打开，登录后会话没有明显异常
- `GET /api/health` 正常
- 搜索页仍能查到至少一个已发布文章关键词
- 最近一段 app / 代理层日志没有连续错误
- 如果你使用 scheduled publish，确认这条链路没有被遗忘

可参考：
- `docs/monitoring-and-logs.md`
- `docs/operations-reference.md`

### 3.2 每月做一次低频高风险链路检查

建议至少覆盖：
- 手动执行一次备份导出
- 在测试环境或备用实例验证一次恢复路径
- 确认 HTTPS 续期链路仍可用
- 确认文档仍和真实部署入口一致
- 如果近期没有触发过 scheduled publish，手动补跑一次入口

常见命令：

```bash
npm run backup:export -- --output ./backup
```

```bash
npm run backup:import -- --input ./backup --force --reindex-search
```

```bash
certbot renew --dry-run
```

```bash
npm run posts:publish-scheduled
```

说明：
- `backup:import` 更适合在测试环境或备用实例验证，不要把生产实例当成演练场
- `certbot renew --dry-run` 只适用于你使用 certbot 的部署方式
- 如果搜索看起来异常，优先先做 `npm run search:reindex-posts`，不要直接整站回滚

### 3.3 每次高风险配置变更后追加检查

如果你改了这些内容，不要等到下次例行回看：
- `admin_path`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- 反向代理配置
- HTTPS / 证书链路
- 搜索服务地址或 key
- backup / restore 相关脚本与流程

至少追加确认：
- 后台登录是否仍稳定
- 旧书签 / 旧入口是否已经失效并同步文档
- 公开路由、搜索、internal API 是否仍可用
- README / docs / 书签认知是否需要一起更新

优先看：
- `docs/environment.md`
- `docs/reverse-proxy-examples.md`
- `docs/troubleshooting.md`
- `docs/release-checklist.md`

## 4. 长期维护时最不能忘的 5 条链路

### 4.1 后台登录
很多站点不是“首页挂了”，而是后台登录先悄悄失效。

优先确认：
- HTTPS 是否仍正常
- `NEXTAUTH_URL` 是否仍与真实外部地址一致
- 代理层是否仍传递了正确协议头

如果异常，先看：
- `docs/monitoring-and-logs.md`
- `docs/troubleshooting.md`

### 4.2 搜索
搜索是典型的“主站还能开，但体验已经退化”的能力。

优先确认：
- 搜索页还能查到已发布内容
- 恢复或迁移之后是否已经重建索引

常用命令：

```bash
npm run search:reindex-posts
```

### 4.3 备份与恢复
“有备份”不等于“可恢复”。

长期维护里最值得定期确认的是：
- 备份还能正常导出
- 恢复步骤仍然和当前代码/文档一致
- 恢复后搜索重建路径没有失效

优先看：
- `docs/upgrade-and-rollback.md`
- `docs/operations-reference.md`

### 4.4 定时发布
如果站点平时 scheduled 内容不多，这条链路最容易长时间没人碰，直到真正要用时才发现已经坏了。

如果你依赖它，建议至少周期性确认：
- CLI 入口仍能执行
- 或 internal API 入口仍可鉴权成功

优先看：
- `docs/operations-reference.md`
- `docs/execution-boundaries.md`

### 4.5 反向代理与静态资源
这类问题常常只在迁移、重建或手工替换构建产物后出现。

优先确认：
- 首页不是“纯文本无样式”
- `/_next/static/*` 没有持续 404
- `public/uploads` 仍由正确路径托管

优先看：
- `docs/reverse-proxy-examples.md`
- `docs/troubleshooting.md`

## 5. 长时间搁置后重新接手，建议按这个顺序恢复

如果项目放了一段时间，再回来时，不要直接开代码或直接 SSH 上去改环境。

建议顺序：
1. `README.md`
2. `docs/README.md`
3. `docs/deployment.md`
4. `docs/first-deployment-checklist.md`
5. 本文档
6. `docs/architecture.md`
7. `docs/development.md`
8. `docs/environment.md`
9. `docs/release-checklist.md`

这个顺序更容易先恢复：
- 项目定位
- 当前部署认知
- 上线后应该看什么
- 长期维护应该盯哪些低频高风险链路
- 再进入代码与扩展层细节

## 6. 维护者最低应该明确的事实

如果你准备长期维护一个实例，至少别对这些问题模糊：
- 当前站点是 VPS 宿主机部署，还是 Docker / Compose 部署
- 当前后台真实入口路径是什么
- 当前 scheduled publish 主要依赖 CLI，还是 internal API
- 备份通常导出到哪里、恢复时参考哪份文档
- HTTPS / 证书续期由什么方式维护
- 文档站地址与仓库内 source of truth 分别是什么

这些信息未必都要写进代码，但维护者脑中必须有清晰答案。

## 7. 常见误区

- 只看首页能打开，就认为整站长期稳定
- 只做备份导出，不做恢复路径验证
- 只在发布当天看日志，之后完全不回看
- 站点搁置太久后直接开始改代码，不先恢复部署与维护认知
- 改了 `admin_path`、代理层或登录相关配置，却没同步文档和书签认知
- 搜索异常时直接怀疑数据库，而不是先确认 Meilisearch 与 reindex 路径

## 8. 推荐搭配阅读

- 首次部署验收：`docs/first-deployment-checklist.md`
- 发布前检查：`docs/release-checklist.md`
- 运行态巡检与日志：`docs/monitoring-and-logs.md`
- 常用运维入口：`docs/operations-reference.md`
- 升级 / 回滚 / 恢复：`docs/upgrade-and-rollback.md`
- 故障排查：`docs/troubleshooting.md`
- 环境与配置边界：`docs/environment.md`

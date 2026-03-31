# Inkwell 首次部署验收清单

本文档面向首次把 Inkwell 部署到真实环境后的维护者，用于回答一个问题：
> **现在这个站点，是真的可用，还是只是“进程跑起来了”？**

目标：
- 给出一份部署完成后的 go / no-go 清单
- 让未来维护者按顺序确认：首页、后台、搜索、备份、内部接口都正常
- 同时适用于 Linux VPS 宿主机部署与 Docker / Compose 单机部署

如果你需要：
- 完整部署步骤：看 `docs/deployment.md`
- 运维命令速查：看 `docs/operations-reference.md`
- 升级或失败恢复：看 `docs/upgrade-and-rollback.md`
- 发布前总检查：看 `docs/release-checklist.md`

## 1. 什么时候使用这份清单

适用于：
- 首次上线一个新站点
- 新环境迁移完成后做验收
- 恢复站点后确认它是否真的回到了可用状态
- 想把“部署完成”从主观判断变成可执行检查列表

不适用于：
- 只改了一行文档
- 日常很小的前端文案调整
- 已经有成熟监控体系且你只是在做重复巡检

## 2. 先确认环境真的准备好了

在开始点页面之前，先确认：
- 应用进程已启动
- PostgreSQL 可访问
- Meilisearch 可访问
- 部署级环境变量已正确注入
- 若是公网部署，HTTPS 已可用

### 2.1 VPS / 宿主机场景最低确认
至少确认：
- `npm run build` 已成功
- `.next/standalone` 所需静态资源已补齐
- systemd 服务已启动
- Nginx / 反向代理已指向正确端口

### 2.2 Docker / Compose 场景最低确认
至少确认：
- `docker compose ... ps` 中 app / postgres / meilisearch 都已运行
- `public/uploads`、PostgreSQL、Meilisearch 数据卷都已持久化
- 容器外反向代理 / TLS 已配置

## 3. 最小验收顺序

建议按这个顺序，不要跳步骤：

1. 首页
2. CSS / JS 静态资源
3. `GET /api/health`
4. 后台登录页
5. 后台登录与会话
6. 文章管理页
7. 一篇已发布文章页
8. 搜索
9. 备份导出
10. 内部发布入口
11. 备份恢复能力（至少在测试环境或备用实例验证）

## 4. 基础访问验收

### 4.1 首页
检查：
- 首页返回 200
- 页面不是纯文本或无样式状态
- 基础布局正常

### 4.2 静态资源
检查：
- CSS / JS 正常加载
- 没有明显的 `/_next/static/*` 404
- 若首页无样式，优先怀疑 standalone 静态资源未复制或代理层配置错误

### 4.3 健康检查
调用：

```http
GET /api/health
```

应确认：
- 返回 200
- `data.status = "ok"`
- 时间戳格式正常

说明：
- 这只能证明应用进程在响应
- 不能替代后台登录、搜索、备份链路验证

## 5. 后台验收

### 5.1 后台登录页
检查：
- 能打开 `/{adminPath}/login`
- 页面不是 404
- 表单可见

### 5.2 后台登录
检查：
- 输入管理员账号后可登录
- 登录后不会立刻被打回登录页
- 会话在刷新后仍稳定

如果失败，优先怀疑：
- HTTPS 未启用
- `NEXTAUTH_URL` 不正确
- `NEXTAUTH_SECRET` 缺失
- 反向代理没有正确传协议头

### 5.3 后台关键页面
登录后至少打开：
- 文章管理页
- 设置页

确认：
- 页面能正常加载
- 没有明显报错
- 后台路由与 `admin_path` 认知一致

## 6. 内容链路验收

### 6.1 已发布文章页
至少打开一篇已发布文章，确认：
- 页面返回 200
- 正文正常显示
- 没有明显布局破坏

### 6.2 sitemap / RSS
至少确认这些资源可访问：
- `/sitemap.xml`
- `/rss.xml`
- `/robots.txt`

如果你的站点启用了分类 / 标签 RSS，也应抽查对应 RSS 路由。

## 7. 搜索验收

### 7.1 先确认是否已建索引
首次部署后建议执行：

```bash
npm run search:reindex-posts
```

### 7.2 再确认搜索页行为
检查：
- 搜索页可访问
- 至少一个已发布文章关键词能查到结果
- 没有明显的 Meilisearch 连接错误

说明：
- backup 不包含搜索索引
- 首次部署、恢复之后、Meilisearch 数据丢失之后，都要考虑 reindex

## 8. 备份与恢复验收

### 8.1 导出备份
至少执行：

```bash
npm run backup:export -- --output <backup-dir>
```

确认：
- 导出成功
- 备份目录生成
- 没有 checksum / media 缺失错误

### 8.2 恢复能力
如果条件允许，至少在测试环境、备用实例或受控环境验证：

```bash
npm run backup:import -- --input <backup-dir> --force --reindex-search
```

最低确认：
- 恢复过程可执行
- 恢复后首页 / 后台 / 搜索正常
- 媒体文件没有明显缺失

如果当前不是测试环境，不要把生产实例当场强制恢复；至少要确保恢复流程在别处验证过。

## 9. 内部发布入口验收

Inkwell 的 scheduled publish 有两种入口，至少验证其中一种。

### 9.1 CLI 入口
```bash
npm run posts:publish-scheduled
```

### 9.2 internal API 入口
```http
POST /api/internal/posts/publish-scheduled
Authorization: Bearer <INTERNAL_CRON_SECRET>
```

确认：
- 入口可触发
- secret 校验生效
- 无到期文章时也能返回合理结果

## 10. Docker 与 VPS 额外检查项

### 10.1 VPS / 宿主机额外检查
确认：
- systemd 服务可重启
- `journalctl` 能看到应用日志
- Nginx access / error log 正常
- certbot 续期链路可用（若启用 certbot）

### 10.2 Docker / Compose 额外检查
确认：
- `docker compose ps` 中 health 状态正常
- app / postgres / meilisearch 日志可查看
- volume 没有丢
- 外部反向代理仍正确指向容器暴露端口

## 11. Go / No-Go 判断标准

### 可以认为“首次部署通过”
至少满足：
- 首页可访问
- CSS / JS 正常
- `GET /api/health` 正常
- 后台能稳定登录
- 至少一篇已发布文章可访问
- 搜索可用或已完成 reindex 并确认无明显异常
- 备份导出成功
- 至少一个 scheduled publish 入口可触发

### 不应认为“部署完成”
如果出现以下任一项：
- 首页无样式
- 后台登录不稳定
- 健康检查失败
- 搜索完全不可用且未确认原因
- 备份导出失败
- 内部发布入口不可触发

## 12. 常见误区

- 只看首页能打开就认为部署成功
- 只看 `api/health` 正常就认为整站无问题
- 首次部署后不执行 search reindex
- 后台能打开登录页就认为登录链路没问题
- 从不验证 backup export，只把“以后再说”当默认策略
- 在生产实例上直接做高风险 restore 测试

## 13. 推荐搭配阅读

- 部署路径：`docs/deployment.md`
- 升级与回滚：`docs/upgrade-and-rollback.md`
- 运维命令速查：`docs/operations-reference.md`
- 监控与日志：`docs/monitoring-and-logs.md`
- 已知故障：`docs/troubleshooting.md`
- 发布前综合检查：`docs/release-checklist.md`

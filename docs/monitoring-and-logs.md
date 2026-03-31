# Inkwell 监控与日志说明

本文档面向未来维护者与部署者，说明当站点处于运行中状态时，应该：
- 先做哪些最小巡检
- 出问题时先看哪些日志
- 不同部署方式下日志入口在哪里
- 常见异常该按什么顺序排查

目标不是建设一套完整 observability 平台，而是给维护者一份 **最低可执行的运行态检查手册**。

如果你需要：
- 完整部署步骤：看 `docs/deployment.md`
- 恢复与运维命令索引：看 `docs/operations-reference.md`
- 升级失败后的恢复：看 `docs/upgrade-and-rollback.md`
- 已知故障排查：看 `docs/troubleshooting.md`

## 1. 最小健康检查

这是未来维护者最先应该养成的习惯：不要一上来就翻代码，先看站点是不是整体活着。

### 1.1 最小巡检顺序
建议按顺序做：

1. 首页能否打开
2. CSS / JS 是否正常
3. `GET /api/health` 是否返回正常结果
4. 后台登录页能否打开
5. 后台登录后会话是否稳定
6. 一篇已发布文章页能否打开
7. 如有搜索，搜索页是否可用

### 1.2 健康检查接口
```http
GET /api/health
```

当前返回结构：

```json
{
  "data": {
    "status": "ok",
    "timestamp": "2026-04-01T00:00:00.000Z"
  },
  "error": null
}
```

实现位置：
- `app/api/health/route.ts`

说明：
- 这个接口适合做最小探活
- 它不能证明数据库、搜索、后台登录、上传链路都正常
- 但它能快速告诉你“应用进程是否还活着”

## 2. 先看哪类日志

遇到问题时，建议先判断是哪一层出错：

### 2.1 页面打不开 / 502 / 网关异常
优先看：
- 反向代理日志
- 应用进程日志

### 2.2 页面能开，但没样式 / 静态资源 404
优先看：
- Nginx / Caddy 静态路径配置
- standalone 静态资源是否复制

### 2.3 后台登录不稳定
优先看：
- HTTPS / 反向代理配置
- `NEXTAUTH_URL`
- 应用日志

### 2.4 搜索异常
优先看：
- 应用日志
- Meilisearch 容器 / 进程日志
- 是否需要 `npm run search:reindex-posts`

### 2.5 备份恢复异常
优先看：
- `backup:import` 的 CLI 输出
- 应用日志
- 媒体目录与备份输入目录是否一致

## 3. 宿主机部署时看哪些日志

适用场景：
- Linux VPS
- systemd 托管 Next.js standalone
- Nginx 反向代理

### 3.1 systemd 应用日志
常见查看方式：

```bash
journalctl -u inkwell -n 200 --no-pager
```

实时跟随：

```bash
journalctl -u inkwell -f
```

说明：
- `inkwell` 需要替换成你的真实 systemd 服务名
- 这里通常能看到应用启动失败、环境变量缺失、运行时异常

### 3.2 Nginx access log / error log
常见路径通常是：
- `/var/log/nginx/access.log`
- `/var/log/nginx/error.log`

查看示例：

```bash
tail -n 100 /var/log/nginx/access.log
tail -n 100 /var/log/nginx/error.log
```

实时跟随：

```bash
tail -f /var/log/nginx/error.log
```

适合排查：
- 502 / 504
- 静态资源 404
- 代理转发失败
- TLS / 证书相关错误

### 3.3 certbot / 续期验证
推荐手动验证：

```bash
certbot renew --dry-run
```

适合排查：
- HTTPS 续期是否仍正常
- 证书自动续期链路是否失效

## 4. Docker / Compose 部署时看哪些日志

适用场景：
- `docker-compose.production.yml`
- 单机 app + postgres + meilisearch

### 4.1 查看 app 容器日志
```bash
docker compose -f docker-compose.production.yml logs app --tail=200
```

实时跟随：

```bash
docker compose -f docker-compose.production.yml logs -f app
```

### 4.2 查看 PostgreSQL 日志
```bash
docker compose -f docker-compose.production.yml logs postgres --tail=200
```

### 4.3 查看 Meilisearch 日志
```bash
docker compose -f docker-compose.production.yml logs meilisearch --tail=200
```

### 4.4 查看容器健康状态
```bash
docker compose -f docker-compose.production.yml ps
```

说明：
- 当前 Compose 已给 `postgres`、`meilisearch`、`app` 配了 healthcheck
- 如果 `ps` 显示 unhealthy，优先看对应容器日志

## 5. 运行态最常见的异常模式

### 5.1 `DATABASE_URL is not configured`
常见原因：
- `.env.local` 没加载
- systemd `EnvironmentFile` 没配
- 容器环境变量缺失

优先看：
- systemd 日志或 app 容器日志
- `docs/troubleshooting.md`
- `docs/environment.md`

### 5.2 首页 200，但没有 CSS / JS
常见原因：
- standalone 构建后没有复制 `public` 与 `.next/static`
- 反向代理静态路径配置异常

优先看：
- Nginx / Caddy 配置
- `docs/troubleshooting.md`
- `docs/reverse-proxy-examples.md`

### 5.3 后台登录页能开，但登录后被打回
常见原因：
- 公网还在 HTTP
- `NEXTAUTH_URL` 错误
- 反向代理没有正确传协议头

优先看：
- 代理层配置
- 应用日志
- `docs/troubleshooting.md`
- `docs/environment.md`

### 5.4 搜索没结果或搜索异常
常见原因：
- Meilisearch 不可用
- 索引丢失
- 恢复站点后没重建索引

优先操作：

```bash
npm run search:reindex-posts
```

### 5.5 backup restore 后页面不完整
常见原因：
- 媒体目录没有恢复完整
- 搜索索引未重建
- 代码版本与快照不兼容

优先看：
- `docs/upgrade-and-rollback.md`
- `docs/operations-reference.md`

## 6. 最低巡检命令清单

### 6.1 应用探活
```bash
curl -fsS http://127.0.0.1:3000/api/health
```

如果走域名：

```bash
curl -fsS https://your-domain.com/api/health
```

### 6.2 搜索重建
```bash
npm run search:reindex-posts
```

### 6.3 手动补跑定时发布
```bash
npm run posts:publish-scheduled
```

### 6.4 导出备份
```bash
npm run backup:export -- --output <backup-dir>
```

### 6.5 完整恢复
```bash
npm run backup:import -- --input <backup-dir> --force --reindex-search
```

## 7. 问题发生时的优先排查顺序

建议按下面顺序，而不是跳来跳去：

1. 先看首页是否正常
2. 再看 `/api/health`
3. 再看应用日志
4. 再看代理层日志
5. 再看数据库 / 搜索是否健康
6. 再判断是否是配置问题、部署问题或业务逻辑问题
7. 最后才进入代码层深挖

这个顺序能先排掉最常见的运行态故障。

## 8. 维护者最小观察面板

如果你没有接 Grafana / Prometheus，也至少建议维护这几个“最小观察点”：
- 首页 HTTP 状态
- `/api/health`
- 后台登录可用性
- Nginx / app 日志最近 100 行
- PostgreSQL / Meilisearch 进程或容器存活状态
- 最近一次备份是否成功

## 9. 常见误区

- 只看 `api/health` 正常就认为整站没问题
- 搜索异常时不先尝试 reindex
- 后台登录异常时先怪代码，不先看 HTTPS / 代理层
- 容器 unhealthy 但不去看容器日志
- systemd 服务起不来却只看浏览器，不看 `journalctl`

## 10. 推荐搭配阅读

- 运行命令速查：`docs/operations-reference.md`
- 部署路径：`docs/deployment.md`
- 升级与回滚：`docs/upgrade-and-rollback.md`
- 反向代理：`docs/reverse-proxy-examples.md`
- 已知故障：`docs/troubleshooting.md`

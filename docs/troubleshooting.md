# Inkwell 故障排查

本文档整理了当前仓库与真实部署验证中已经遇到、且最容易复发的问题。

## 1. 页面能打开，但没有 CSS / JS

### 现象

- 首页返回 `200`
- 但页面没有样式
- 前端交互不完整
- `/_next/static/*` 资源返回 `404`

### 常见原因

你使用了 Next.js `standalone` 输出，但**没有把 `public` 与 `.next/static` 复制到 `.next/standalone`**。

### 处理方式

```bash
mkdir -p .next/standalone/.next
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

### 适用范围

- Linux VPS 宿主机部署
- 直接运行 `.next/standalone/server.js`

### 说明

Dockerfile 已经显式复制这些资源；问题主要出现在宿主机 standalone 手工部署中。

## 2. 后台登录页能打开，但登录后会话不稳定

### 现象

- 能打开后台登录页
- 登录后可能又被打回登录页
- 后台深层页面访问不稳定

### 常见原因

生产环境后台会话默认使用 `Secure` cookie；如果公网仍是 **HTTP**，cookie 无法稳定工作。

### 处理方式

- 启用 HTTPS
- 正确配置域名与反向代理
- 确认 `NEXTAUTH_URL` 使用站点对外 HTTPS 地址

### 推荐方案

```bash
apt-get update
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com --non-interactive --agree-tos -m you@example.com --redirect
```

## 3. `DATABASE_URL is not configured`

### 现象

- 应用或脚本启动时报 `DATABASE_URL is not configured`

### 常见原因

- `.env.local` 没有加载
- systemd 没有显式指定 `EnvironmentFile`
- 运行目录不正确

### 处理方式

若使用 systemd，请确认至少包含：

```ini
Environment=NODE_ENV=production
EnvironmentFile=/path/to/inkwell/.env.local
ExecStart=/usr/bin/node /path/to/inkwell/.next/standalone/server.js
```

## 4. `next build` 在小内存 VPS 上失败

### 现象

- 构建中途退出
- 提示 heap out of memory / OOM

### 常见原因

- 机器内存不足，例如 1C1G

### 处理方式

可选：

- 临时增加 swap
- 限制 Node 堆内存

```bash
NODE_OPTIONS=--max-old-space-size=768 npm run build
```

## 5. `search:reindex-posts` 在 CLI 环境报 `server-only` 相关错误

### 现象

- CLI 执行 `npm run search:reindex-posts` 失败
- 报错涉及 `server-only`

### 常见原因

CLI 路径错误依赖了仅适用于应用服务端上下文的 DB 入口。

### 当前状态

此问题已在仓库中修复；`search:reindex-posts` 现在会使用 CLI-safe 的数据库上下文。

### 若仍出现

请确认：

- 远端代码已更新到最新提交
- 已重新部署最新构建产物

## 6. 备份恢复后搜索结果为空

### 现象

- 数据库恢复成功
- 前台搜索没有结果

### 常见原因

备份不包含 Meilisearch 索引内容；恢复后如果没有重建搜索索引，就会出现“文章存在，但搜索为空”。

### 处理方式

```bash
npm run backup:import -- --input ./backup --force --reindex-search
```

或者手动执行：

```bash
npm run search:reindex-posts
```

## 7. `backup:import` 默认拒绝导入

### 现象

- 导入时报目标实例非空

### 原因

这是故意设计的安全保护，避免误覆盖现有站点。

### 处理方式

确认你确实要覆盖目标实例后，再使用：

```bash
npm run backup:import -- --input ./backup --force
```

如需同时恢复后重建搜索：

```bash
npm run backup:import -- --input ./backup --force --reindex-search
```

## 8. 评论、媒体、后台等功能不完整，如何判断是部署问题还是功能问题？

建议按以下顺序排查：

1. 先看首页是否有 CSS / JS
2. 再看 `/api/health` 是否正常
3. 再看后台登录是否稳定
4. 再检查数据库迁移是否执行
5. 再检查 `NEXTAUTH_URL`、`NEXTAUTH_SECRET`、`DATABASE_URL`
6. 再检查反向代理与 HTTPS 是否正确

原则上：

- **页面无样式** 更像是静态资源部署问题
- **后台无法持久登录** 更像是 HTTPS / cookie 问题
- **功能按钮报错** 更像是数据库、配置或业务逻辑问题

## 9. 下一步还建议补什么文档？

如果你的目标是面向大众公开发布，建议继续补：

- 完整 Nginx 配置示例
- Caddy 配置示例
- 升级与回滚流程
- FAQ
- 首次部署检查清单
- 常见监控与日志查看方法

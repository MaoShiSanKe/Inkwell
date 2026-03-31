# Inkwell 反向代理示例

本文档面向部署者与未来维护者，提供 Inkwell 当前最常见的两类反向代理示例：
- Nginx
- Caddy

目标：
- 给出 **可直接改路径/域名后使用** 的最小示例
- 说明哪些配置属于 Inkwell 必需的部署前提
- 解释为什么后台登录、媒体访问、健康检查、内部 API 会受反向代理影响

如果你还没有完成应用部署本身，先看：
- `docs/deployment.md`
- `docs/environment.md`

## 1. 使用前先确认什么

在配置反向代理前，至少确认：
- 应用已经能在本机 `127.0.0.1:3000` 正常响应
- `.env` 中的 `NEXTAUTH_URL` 已准备为对外访问地址
- 若要启用后台登录，公网最终必须走 HTTPS
- 如果使用本地媒体上传，`public/uploads` 路径存在且可访问

## 2. 为什么 Inkwell 需要正确的反向代理

### 2.1 后台登录依赖 HTTPS
生产环境后台会话默认使用 `Secure` cookie。

这意味着：
- 如果公网还是 HTTP，后台登录会话可能不稳定
- `NEXTAUTH_URL` 需要与真实外部地址保持一致
- 反向代理要正确传递协议头

### 2.2 本地媒体适合由代理层直接托管
如果你使用本地上传媒体，推荐：
- 动态页面请求回源到 Next.js
- `/uploads/` 由代理层直接提供静态文件

这样可以减少 Node.js 回源压力。

### 2.3 internal API 建议继续走代理层访问控制
例如：
- `/api/internal/posts/publish-scheduled`

建议：
- 至少依赖 `INTERNAL_CRON_SECRET`
- 如果条件允许，再加来源 IP / 回环地址限制

## 3. Nginx 最小可用示例

适用场景：
- Linux VPS 宿主机部署
- Next.js standalone / systemd
- 本地媒体在 `public/uploads`

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 20m;

    location /uploads/ {
        alias /path/to/inkwell/public/uploads/;
        access_log off;
        expires 30d;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

### 3.1 你需要替换的部分
- `your-domain.com` → 你的真实域名
- `/path/to/inkwell/public/uploads/` → 你的实际项目路径
- `127.0.0.1:3000` → Next.js 实际监听地址

### 3.2 这个示例解决了什么
- `/uploads/` 直接由 Nginx 返回
- 页面请求代理到 Next.js
- 应用能感知真实协议与来源 IP
- 后续可以直接接 certbot 做 HTTPS

## 4. Nginx + certbot HTTPS 示例

如果你使用 Linux VPS + Nginx，推荐直接使用：
- `certbot`
- `python3-certbot-nginx`

```bash
apt-get update
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com --non-interactive --agree-tos -m you@example.com --redirect
```

### 4.1 作用
- 申请 Let's Encrypt 证书
- 自动修改 Nginx 配置
- 自动将 HTTP 重定向到 HTTPS
- 自动安装续期任务

### 4.2 申请前提
- 域名已经解析到目标 VPS
- 80 端口可访问
- 原始 Nginx HTTP 配置已可工作

### 4.3 续期验证
建议额外执行：

```bash
certbot renew --dry-run
```

## 5. Caddy 最小可用示例

适用场景：
- 希望简化 TLS 配置
- 不想手动管理 certbot + Nginx 站点文件
- 单机部署且域名已正确解析

```txt
your-domain.com {
    encode zstd gzip

    handle_path /uploads/* {
        root * /path/to/inkwell/public
        file_server
    }

    reverse_proxy 127.0.0.1:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

### 5.1 你需要替换的部分
- `your-domain.com` → 你的真实域名
- `/path/to/inkwell/public` → 你的实际项目 `public` 目录
- `127.0.0.1:3000` → Next.js 实际监听地址

### 5.2 说明
- `handle_path /uploads/*` 用于直接托管 `public/uploads`
- 其他请求回源到 Next.js
- Caddy 会自动处理 HTTPS（前提是域名、网络和证书申请条件都正常）

## 6. Docker / Compose 场景怎么用

如果你使用 Docker / Compose：
- app 容器负责跑 Inkwell
- PostgreSQL / Meilisearch 用 volume 持久化
- 反向代理与 TLS 仍建议在容器外处理

也就是说：
- Nginx / Caddy 配置目标通常还是宿主机暴露端口
- `NEXTAUTH_URL` 仍要写成外部真实地址
- `/uploads/` 的静态托管路径要与宿主机映射后的目录一致

## 7. 部署后最小验证

配置完反向代理后，至少验证：
- 首页返回 200
- CSS / JS 正常
- `/api/health` 正常
- 后台登录页可打开
- HTTPS 下后台登录会话稳定
- `/uploads/...` 路径下的本地媒体能访问

如果你还接了内部调度入口，再补：
- `POST /api/internal/posts/publish-scheduled`

## 8. 什么时候优先怀疑代理层配置

如果出现以下问题，先看代理层：
- 首页能开，但没有 CSS / JS
- 后台登录页能开，但登录后又被打回
- 本地媒体 404
- 域名访问异常，但本机 3000 端口直连正常
- HTTPS 看似开了，但 cookie 或回调行为异常

相关排查见：`docs/troubleshooting.md`

## 9. 常见错误

- `NEXTAUTH_URL` 与公网真实地址不一致
- 没有传 `X-Forwarded-Proto`
- `/uploads/` 路径 alias / root 配错
- 直接把 internal API 当公开接口暴露
- 还没确认 HTTP 配置可用，就先折腾 HTTPS 自动化
- Caddy / Nginx 能通，但 Next.js 实际监听地址不对

## 10. 推荐搭配阅读

- 完整部署路径：`docs/deployment.md`
- 升级与回滚：`docs/upgrade-and-rollback.md`
- 运维入口速查：`docs/operations-reference.md`
- 登录 / 静态资源故障排查：`docs/troubleshooting.md`

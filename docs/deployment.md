# Inkwell 部署说明

> 本文档面向 **VPS / 通用 Linux 宿主机** 场景。
> 当前目标是说明 **框架层能力如何接入部署层调度**，并补充 **Docker / Docker Compose 单机生产示例**。

---

## 1. 适用范围

本文档说明以下内容：

- Inkwell 的基本生产运行前提
- `scheduled` 定时发布的责任边界
- `INTERNAL_CRON_SECRET` 的使用方式
- Linux VPS 上的最小可用调度方案
- Docker / Docker Compose 单机生产示例
- 搜索索引重建方式
- 开发阶段如何手动验证

本文档**不要求**你在本地开发环境安装 Docker。

---

## 2. 责任边界

### 2.1 框架层负责
Inkwell 框架当前负责：

- 文章 `scheduled` 状态管理
- 后台创建 / 编辑时的未来发布时间录入与回填
- 服务端校验 scheduled 时间必须晚于当前时间
- 到期 scheduled 文章自动转为 `published`
- 自动发布时同步更新 `sitemap_entries`
- 自动发布时联动 revision 清理
- 提供触发入口：
  - 脚本入口
  - 内部 HTTP API 入口
  - 搜索索引全量重建 CLI

### 2.2 部署环境负责
部署环境负责：

- 定期触发自动发布入口
- 在需要时执行搜索索引重建
- 选择使用哪种调度方式：
  - Linux cron
  - 面板定时任务
  - 外部 HTTP 调度器
  - 其他平台任务系统
- 容器外反向代理与 TLS（若使用 Docker / Compose）

换句话说：

> **Inkwell 负责“能发布、能重建索引”，部署环境负责“什么时候触发这些运维动作”。**

---

## 3. 基本部署前提

生产环境通常需要：

- Node.js 或容器运行环境
- PostgreSQL
- `.env.local` 或等价环境配置
- Meilisearch
- 反向代理（如 Nginx）
- 正确配置的站点域名与 `NEXTAUTH_URL`

若使用 Linux VPS：

- 推荐使用 systemd / pm2 / 其他进程管理方式托管 Next.js 服务
- 推荐使用宿主机 cron 或面板任务触发定时发布

若使用 Docker / Compose：

- 推荐使用单机 Compose 统一拉起 `app + postgres + meilisearch`
- 推荐将反向代理与 TLS 保持在容器外层处理
- 推荐为数据库、搜索索引和 `public/uploads` 配置持久化卷

---

## 4. 环境变量

生产环境至少需要正确配置：

```bash
DATABASE_URL=
MEILISEARCH_HOST=
MEILISEARCH_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
INTERNAL_CRON_SECRET=
```

说明：

- `INTERNAL_CRON_SECRET` 仅用于内部定时任务 API 鉴权
- 不要把真实 secret 提交到 Git
- `.env.example` 只保留占位符，不写真实值
- SMTP 等邮件发送配置主要通过后台写入数据库 `settings`，不是 Compose 必配项

---

## 5. 定时发布的两种触发方式

Inkwell 当前提供两种触发入口，任选其一。

### 5.1 方式 A：脚本触发
适用于：

- Linux cron
- 面板定时任务
- 手动命令触发

命令：

```bash
npm run posts:publish-scheduled
```

作用：

- 扫描 `status = scheduled` 的文章
- 找出 `published_at <= now()` 的文章
- 自动转为 `published`
- 更新 sitemap
- 联动 revision 清理

### 5.2 方式 B：内部 HTTP API 触发
适用于：

- 外部调度器
- 平台任务系统
- 不方便直接执行本地脚本的环境

请求方式：

```http
POST /api/internal/posts/publish-scheduled
Authorization: Bearer <INTERNAL_CRON_SECRET>
```

作用与脚本入口一致。

说明：

- 这是内部接口，不应暴露给公开用户
- 请求必须带 `Authorization: Bearer <INTERNAL_CRON_SECRET>`
- 未配置 secret 或 secret 错误时会返回错误状态

---

## 6. 备份恢复与搜索索引重建

### 6.1 备份导出
导出当前数据库快照与本地上传文件：

```bash
npm run backup:export -- --output ./backup
```

说明：

- 导出内容包含数据库业务表快照与 `public/uploads`
- 默认会对 `settings` 表中的 secret 做脱敏
- 备份 manifest 会记录校验和、恢复顺序与当前迁移标签

### 6.2 备份导入
将快照恢复到当前实例：

```bash
npm run backup:import -- --input ./backup --force --reindex-search
```

可选：

```bash
npm run backup:import -- --input ./backup --force
```

说明：

- 默认拒绝导入到非空实例，防止误覆盖现有数据
- `--force` 会清空当前业务表并替换 `public/uploads`
- 导入前会校验 manifest、表文件校验和、媒体校验和与迁移标签
- 若备份中的 secret 为脱敏值，导入时会优先保留目标实例当前已有 secret
- 若目标实例没有对应 secret，而备份中该 secret 为脱敏值，则该键会被跳过，不会凭空恢复真实值

### 6.3 什么时候需要执行搜索索引重建
以下场景推荐执行：

- 首次为已有站点启用 Meilisearch
- Docker / Compose 中 `meilisearch_data` volume 丢失后
- 从数据库与媒体备份恢复后
- 怀疑 `published_posts` 索引与 PostgreSQL 已发布文章不一致时

### 6.4 重建命令

```bash
npm run search:reindex-posts
```

可选：

```bash
npm run search:reindex-posts -- --batch-size 200
```

### 6.5 作用

- 从 PostgreSQL 读取所有 `status = published` 的文章
- 重建 `published_posts` 索引内容
- 恢复正文级搜索能力

说明：

- backup/export 不包含 Meilisearch 索引数据
- canonical source of truth 仍是 PostgreSQL
- 索引重建属于正常恢复流程的一部分
## 7. 生产环境推荐方案（Linux VPS）

如果是通用 Linux VPS，推荐优先使用：

- **systemd 托管 Next.js + 宿主机 cron / 外部调度器**

### 7.1 已验证的最小宿主机部署路径
基于实际 Debian VPS 验证，通过以下组合可运行：

- Node.js 20+
- PostgreSQL
- Meilisearch
- Nginx
- systemd 托管 Next.js standalone
- 项目目录内 `.env.local`

推荐步骤：

1. 安装依赖：`npm install`
2. 执行迁移：`npm run db:migrate`
3. 初始化默认设置：`npm run db:seed`
4. 构建：`npm run build`
5. 创建管理员：`npm run admin:create -- <email> <username> <displayName> <password>`
6. 用 systemd 启动 standalone 服务
7. 用 Nginx 反向代理到应用端口

### 7.2 systemd 托管建议
Next.js 已启用 `standalone` 输出，可直接运行：

```bash
node .next/standalone/server.js
```

在宿主机部署中，构建完成后还应按 Next.js 官方 `output: "standalone"` 说明补齐静态资源：

```bash
mkdir -p .next/standalone/.next
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

若不补这一步，应用进程虽然可能已经启动，但 `public` 下资源、`/_next/static/*` 下的 JS/CSS 等静态文件仍可能返回 `404`。

若使用 systemd，建议至少保证：

- `NODE_ENV=production`
- 通过 `EnvironmentFile` 显式加载项目内 `.env.local`
- `ExecStart` 指向 `.next/standalone/server.js`

关键点：

- standalone 进程不会自动替你读取项目根目录 `.env.local`
- standalone 输出默认不会替你复制 `public` 与 `.next/static`
- 若未在 systemd 中显式加载环境文件，运行期会出现 `DATABASE_URL is not configured` 之类错误
- 若未补齐静态资源，站点首页可能返回 `200`，但前端资源仍会加载失败

### 7.3 低内存 VPS 注意事项
在低内存 VPS（例如 1C1G）上，`next build` 可能因内存不足失败。

如果构建时出现 OOM，可按需采取以下方式之一：

- 临时增加 swap
- 限制 Node 堆内存，例如：

```bash
NODE_OPTIONS=--max-old-space-size=768 npm run build
```

这属于部署环境资源约束，不影响应用功能逻辑。

### 7.4 反向代理与静态文件
若使用本地媒体上传，建议：

- 反向代理动态请求到 Next.js 应用端口
- 直接由代理层托管 `public/uploads`

这样可以避免本地媒体请求回源到 Node.js。

当前更完整的可复用示例已整理为：
- `docs/reverse-proxy-examples.md`

其中包括：
- Nginx 最小可用示例
- Nginx + certbot HTTPS 示例
- Caddy 最小可用示例
- 部署后最小验证项

如果你采用 HTTPS + certbot，建议先确保 HTTP 站点配置正确，再交给 `certbot` 自动完成 HTTPS 部署。

关键点仍然是：
- `X-Forwarded-Proto` 应保留，以便应用正确识别外部协议
- `/uploads/` 的静态路径必须与你的实际目录一致
- 上传体积限制可按需求调整

### 7.5 推荐 cron 配置
若站点已经对公网开放，推荐优先在 **HTTPS** 地址上验证站点行为，再启用 cron / 外部调度器。

每 5 分钟执行一次：

```txt
*/5 * * * * cd /path/to/inkwell && npm run posts:publish-scheduled >> /var/log/inkwell-cron.log 2>&1
```

说明：

- `/path/to/inkwell` 替换为你的项目目录
- 日志输出到 `/var/log/inkwell-cron.log`
- 每 5 分钟通常足够满足博客定时发布需求

如果你需要更高精度，可调整频率，但通常没必要每分钟执行一次。

### 7.6 已验证的运维 smoke 项
当前已在真实 VPS 上验证通过：

- `npm run db:migrate`
- `npm run db:seed`
- `npm run admin:create -- <email> <username> <displayName> <password>`
- `npm run search:reindex-posts`
- `npm run backup:export -- --output <dir>`
- `npm run backup:import -- --input <dir> --force --reindex-search`
- `GET /api/health`
- `POST /api/internal/posts/publish-scheduled`（带 `Authorization: Bearer <INTERNAL_CRON_SECRET>`）
- HTTPS 证书签发与 Nginx TLS 部署
- HTTPS 下后台登录、文章管理与真实发布文章链路

说明：

- `search:reindex-posts` 当前已可在 CLI 环境中直接运行，不再依赖 `server-only` 的应用 DB 入口
- backup import 可在恢复后直接联动搜索重建
- 若站点当前没有已发布文章，搜索重建结果中的 `sourceCount` 可能为 `0`，这属于正常现象
- 后台登录会话默认使用 `Secure` cookie，公网生产环境必须启用 HTTPS 才能稳定工作

### 7.7 HTTPS / 证书说明
HTTPS 与证书管理属于**部署层责任**，不是 Inkwell 框架内置能力。

也就是说：

- Inkwell 不负责自动申请证书
- Inkwell 不内置 ACME / certbot 客户端
- Inkwell 不自动替你配置 Nginx / Caddy TLS

但如果你要正式对公网开放站点，**HTTPS 是必需项**，尤其是后台登录场景。

原因：

- 后台会话 cookie 在生产环境应使用 `Secure` 选项
- `Secure` cookie 只会通过 HTTPS 发送
- 若公网仍是 HTTP，后台登录会话可能无法稳定持久化

### 7.8 推荐证书方案（Nginx + certbot）
若你使用 Linux VPS + Nginx，推荐直接使用：

- `certbot`
- `python3-certbot-nginx`

示例：

```bash
apt-get update
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com --non-interactive --agree-tos -m you@example.com --redirect
```

作用：

- 申请 Let's Encrypt 证书
- 自动修改 Nginx 站点配置
- 自动将 HTTP 重定向到 HTTPS
- 自动安装续期任务

说明：

- 你的域名必须已经解析到目标 VPS
- 80 端口需要可访问，便于 ACME 校验
- 申请成功后，建议重新验证后台登录与关键页面访问

### 7.9 续期说明
使用 `certbot` 时，续期通常由系统定时任务自动处理。

建议额外确认：

```bash
certbot renew --dry-run
```

若 dry-run 通过，说明证书续期链路基本正常。

---

## 8. 什么时候使用 HTTP API 方案

如果你不想让调度器直接进入项目目录执行命令，可以改用内部 HTTP API：

```bash
curl -X POST "https://your-domain.com/api/internal/posts/publish-scheduled" \
  -H "Authorization: Bearer YOUR_INTERNAL_CRON_SECRET"
```

适用场景：

- 托管平台更容易发 HTTP 请求而不是执行 shell
- 想把调度职责交给外部服务
- 不方便在目标机器上直接执行 `npm` 命令

---

## 9. Docker / Docker Compose 单机生产示例

### 9.1 范围
仓库提供的 Docker v1 示例默认覆盖：

- `app`：Next.js 应用
- `postgres`：PostgreSQL
- `meilisearch`：Meilisearch

说明：

- 这是单机生产示例，不是多机编排方案
- 不包含 Nginx / Caddy / TLS 自动化
- 不包含容器内 cron / scheduler 服务
- 定时发布仍建议由宿主机 cron 或外部调度器触发

### 9.2 相关文件

- `Dockerfile`
- `.dockerignore`
- `docker-compose.production.yml`

### 9.3 首次启动

```bash
docker build -t inkwell:local .
docker compose -f docker-compose.production.yml up -d
```

首次启动后，在 app 容器内继续执行：

```bash
npm run db:migrate
npm run admin:create -- <email> <username> <displayName> <password>
npm run search:reindex-posts
```

### 9.4 持久化要求
必须持久化以下数据：

- PostgreSQL data
- Meilisearch data
- `public/uploads`

其中 `public/uploads` 尤其重要：

- 本地媒体文件存放于这里
- 若不持久化，重建容器后会丢失上传图片
- 备份导出与恢复都依赖这些文件存在

### 9.5 反向代理与 TLS
Docker v1 不负责处理：

- HTTPS 证书申请
- TLS 终止
- 域名反向代理

推荐方式：

- 在容器外使用 Nginx / Caddy
- 将请求转发到 app 暴露的 3000 端口
- 正确设置对外域名对应的 `NEXTAUTH_URL`

### 9.6 调度边界
即使使用 Docker / Compose，本项目仍建议：

- 用宿主机 cron 执行 `npm run posts:publish-scheduled`
- 或由外部调度器调用内部 API
- 在新建或恢复 Meilisearch 实例后，手动执行 `npm run search:reindex-posts`

不建议在 v1 再引入额外的 scheduler / cron sidecar，以免增加部署复杂度。

---

## 10. 开发阶段如何验证

开发阶段**无需配置 cron**。

### 10.1 验证脚本入口
直接执行：

```bash
npm run posts:publish-scheduled
```

### 10.2 验证内部 API
在本地服务启动后，用请求工具或 `curl` 调用：

```bash
curl -X POST "http://localhost:3000/api/internal/posts/publish-scheduled" \
  -H "Authorization: Bearer YOUR_INTERNAL_CRON_SECRET"
```

### 10.3 推荐验证流程
1. 在后台创建一篇 `scheduled` 文章
2. 把发布时间设为接近当前时间的未来时刻
3. 等待到点或手动触发脚本/API
4. 检查文章是否变为 `published`
5. 检查前台是否可见
6. 检查 sitemap 是否同步更新

### 10.4 Docker 验证流程
1. `docker build -t inkwell:local .`
2. `docker compose -f docker-compose.production.yml up -d`
3. 在 app 容器内执行 `npm run db:migrate`
4. 在 app 容器内执行 `npm run admin:create -- ...`
5. 在 app 容器内执行 `npm run search:reindex-posts`
6. 访问站点首页，确认 app 正常可用
7. 上传本地图片，重启容器后确认图片仍存在
8. 运行 `npm run backup:export -- --output <dir>`，确认容器化环境下备份仍可执行
9. 运行 `npm run backup:import -- --input <dir> --force --reindex-search`，确认容器化环境下恢复链路可执行

### 10.5 宿主机 VPS 验证流程
若你采用宿主机原生部署，可按以下顺序做上线后核验：

1. `npm install`
2. `npm run db:migrate`
3. `npm run db:seed`
4. `npm run build`
5. `npm run admin:create -- <email> <username> <displayName> <password>`
6. 启动 systemd 服务并确认站点首页返回 200
7. 调用 `GET /api/health`，确认健康检查通过
8. 调用内部发布 API，确认 `INTERNAL_CRON_SECRET` 鉴权与路由可用
9. 运行 `npm run search:reindex-posts`
10. 运行 `npm run backup:export -- --output <dir>`
11. 再运行 `npm run backup:import -- --input <dir> --force --reindex-search`

这样可以一次性覆盖：应用启动、数据库迁移、管理员初始化、搜索重建、备份导出、备份恢复与内部调度入口。

---

## 11. 安全注意事项

### 11.1 内部 API 不是公开功能
- 不要把内部 API 当作公开接口给前台调用
- 不要把 `INTERNAL_CRON_SECRET` 暴露到浏览器端
- 不要在客户端代码中引用该 secret

### 11.2 secret 管理
- `INTERNAL_CRON_SECRET` 应写在服务器环境变量或私有配置中
- 不要提交到 Git
- 不要写死在代码里
- Compose 文件中的占位 secret 必须在部署前替换

### 11.3 请求来源控制
如果生产环境允许，建议额外做以下限制之一：

- 反向代理层限制来源 IP
- 面板任务只在本机回环地址调用
- 仅允许内网访问该内部接口

这不是框架必需条件，但属于推荐的部署安全加固。

---

## 12. 当前实现状态概览

当前与部署/运维相关的实现已经包括：

- 后台 scheduled 状态编辑能力
- `publishScheduledPosts(now)` 服务逻辑
- `npm run posts:publish-scheduled` 脚本入口
- `/api/internal/posts/publish-scheduled` 内部 API 入口
- `npm run backup:export` 备份导出 CLI
- `npm run backup:import` 备份恢复 CLI
- `npm run search:reindex-posts` 搜索索引重建 CLI
- Docker / Compose 单机生产示例
- sitemap 同步更新
- revision 清理联动

这意味着：

> **框架层已具备定时发布、备份导出、备份恢复、索引重建与容器化部署基础能力，部署阶段只需选择调度方式并补齐反向代理/TLS。**

---

## 13. 推荐实践总结

如果你是通用 VPS 部署，推荐两种主路径：

### 13.1 宿主机原生部署
1. 正常部署 Next.js 服务
2. 配好 `INTERNAL_CRON_SECRET`
3. 在 Linux 宿主机上配置 cron
4. 每 5 分钟执行：
   - `npm run posts:publish-scheduled`
5. 需要恢复站点时执行：
   - `npm run backup:import -- --input <dir> --force --reindex-search`
6. 在首次启用或恢复 Meilisearch 后执行：
   - `npm run search:reindex-posts`

### 13.2 Docker / Compose 单机部署
1. 修改 Compose 中的占位 secret / 域名配置
2. `docker compose -f docker-compose.production.yml up -d`
3. 在 app 容器内执行迁移与管理员创建
4. 在 app 容器内执行一次 `npm run search:reindex-posts`
5. 在容器外配置反向代理 / TLS
6. 用宿主机 cron 或外部调度器触发 scheduled publish
7. 需要恢复站点时，在 app 容器内执行 `npm run backup:import -- --input <dir> --force --reindex-search`

---

## 14. 公开部署文档还应继续补的内容

如果你的目标是面向大众开放部署，建议在后续文档中继续补齐：

- Nginx / Caddy 反向代理示例
- HTTPS / 域名配置完整教程
- Docker Compose 扩展配置（多环境拆分）
- 首次初始化检查清单
- 故障排查与 FAQ
- 容器镜像发布与 CI 自动构建

其中“升级与回滚流程”已经独立整理为：
- `docs/upgrade-and-rollback.md`

这些内容不影响当前 v1 容器化部署使用，但会显著提升公开项目的可部署性与可理解性。

## 15. 仓库文档与独立文档站的关系

当前仓库文档承担的是：

- 一手事实来源
- 快速开始入口
- 部署与运维最低完备说明

当前独立文档站已经上线，建议继续保持：

- `README.md`：项目首页与入口
- `docs/deployment.md`：仓库内一手部署说明
- `docs/README.md`：仓库内文档索引
- `docs/ROADMAP.md`：文档体系演进说明

独立文档站更适合承载：

- 多页教程
- FAQ
- 故障排查
- 最佳实践
- 面向大众的完整上手路径

也就是说：

> **仓库文档解决“代码仓库里必须知道什么”，独立文档站解决“第一次接触项目的人如何顺利用起来”。**

当前推荐的独立文档站方案见 `docs/ROADMAP.md`。

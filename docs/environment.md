# Inkwell 环境与配置说明

本文档说明 Inkwell 的配置从哪里来、各配置项负责什么，以及开发与生产场景下需要特别注意的差异。

## 1. 配置来源分两类

Inkwell 的配置不是全部来自 `.env`。

当前主要分为两类：

### 1.1 环境变量
用于：
- 连接外部服务
- 部署级配置
- 运行时敏感配置
- 进程启动前必须存在的配置

模板见：`.env.example`

### 1.2 数据库 `settings` 表
用于：
- 站点运行期可在后台调整的配置
- 不适合硬编码到部署环境中的站点级设置
- SMTP、Umami、后台路径、revision 策略等

读取入口：`lib/settings.ts`
定义入口：`lib/settings-config.ts`

## 2. 当前 `.env.example`

```bash
DATABASE_URL=
MEILISEARCH_HOST=
MEILISEARCH_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
INTERNAL_CRON_SECRET=
```

## 3. 各环境变量职责

### 3.1 `DATABASE_URL`
用途：
- PostgreSQL 连接串
- Web 应用、CLI 脚本、迁移、搜索重建、备份恢复都依赖它

典型影响：
- 缺失时会出现 `DATABASE_URL is not configured`
- systemd / standalone 部署时若 `.env.local` 没显式加载，最容易在这里出错

### 3.2 `MEILISEARCH_HOST`
用途：
- Meilisearch 服务地址
- 搜索页与重建索引流程依赖它

典型影响：
- 前台搜索不可用
- `npm run search:reindex-posts` 无法完成

### 3.3 `MEILISEARCH_API_KEY`
用途：
- 访问 Meilisearch 的 API key

典型影响：
- 搜索与索引写入失败

### 3.4 `NEXTAUTH_SECRET`
用途：
- 后台会话签名 secret
- `lib/auth.ts` 使用它对管理员 session 进行 HMAC 签名

典型影响：
- 缺失时后台无法稳定建立登录会话
- 更换后旧 session 会失效

### 3.5 `NEXTAUTH_URL`
用途：
- 站点对外访问根地址
- 用于站点 origin 判断与生产环境部署行为对齐

典型影响：
- 生产环境应设置为真实外部 HTTPS 地址
- 设置错误时，登录、回调、生成链接、反向代理行为可能异常

### 3.6 `INTERNAL_CRON_SECRET`
用途：
- 内部定时发布 API 的 Bearer 鉴权 secret
- `POST /api/internal/posts/publish-scheduled` 依赖它

典型影响：
- 缺失时内部发布 API 返回 503
- 错误时返回 401

## 4. 哪些配置不在 `.env`

当前很多站点行为来自数据库 `settings` 表，而不是环境变量。

常见例子：
- `admin_path`
- `revision_limit`
- `revision_ttl_days`
- SMTP 配置
- Umami 配置
- 其他后台可调的站点设置

例如：
- 后台路径定义在 `lib/settings-config.ts` 中的 `admin_path`
- 运行时通过 `lib/settings.ts:107` 的 `getAdminPath()` 读取

这意味着：
- 改后台路径时，不是改 `.env`
- 改 revision 保留策略时，不是改 `.env`
- SMTP / Umami 这类内容主要通过后台与数据库 settings 管理

## 5. 开发与生产的关键差异

### 5.1 HTTPS 与后台登录
后台 session cookie 在生产环境使用 `secure: true`。

因此：
- 开发环境用 `http://localhost:3000` 没问题
- 公网生产环境必须启用 HTTPS
- 否则后台登录会话可能不稳定

### 5.2 standalone 宿主机部署
如果用 Next.js standalone 输出：
- 运行进程本身不会自动读取项目根 `.env.local`
- 需要由 systemd `EnvironmentFile` 或等价机制显式加载

否则最常见错误是：
- `DATABASE_URL is not configured`

### 5.3 Docker / Compose
在 Compose 中通常直接通过环境变量传入：
- `DATABASE_URL`
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `INTERNAL_CRON_SECRET`

但站点业务配置仍然主要在数据库 `settings` 表中维护。

## 6. 配置排查顺序建议

如果站点行为异常，建议按顺序排查：

1. `.env.local` 是否存在
2. `DATABASE_URL` 是否正确
3. `NEXTAUTH_SECRET` 是否存在
4. `NEXTAUTH_URL` 是否与对外地址一致
5. `MEILISEARCH_HOST` / `MEILISEARCH_API_KEY` 是否可用
6. `INTERNAL_CRON_SECRET` 是否配置
7. 是否误把数据库 settings 中的配置当成 env 配置处理

## 7. 安全注意事项

- 不要提交 `.env.local`
- 不要把真实密钥、令牌、证书、数据库连接串提交到仓库
- `.env.example` 只保留占位符
- 文档中只写去敏示例
- 内部 API secret 不要暴露到浏览器端

## 8. 对未来维护者的建议

重新接手时，请先区分清楚：

### 属于部署层的配置
- `.env.local`
- systemd / Docker / Nginx / GitHub Pages 等外部环境

### 属于应用层可调配置
- 数据库 `settings` 表
- 后台管理界面可改的各类设置

很多“看起来像配置问题”的 bug，本质上是这两层职责混淆。

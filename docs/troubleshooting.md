# Inkwell 故障排查

本文档整理当前仓库与真实部署验证中最容易复发的问题。

它不是完整部署手册，重点是回答一个问题：
> **当前异常更像是部署层问题、配置问题，还是某条功能链路本身有问题？**

如果你需要：
- 完整部署步骤：`docs/deployment.md`
- 首次上线验收顺序：`docs/first-deployment-checklist.md`
- 运维命令速查：`docs/operations-reference.md`
- 升级 / 回滚 / 恢复：`docs/upgrade-and-rollback.md`
- 监控与日志入口：`docs/monitoring-and-logs.md`

## 1. 首页返回 200，但没有 CSS / JS

### 现象
- 首页返回 `200`
- 页面像纯文本
- 前端交互不完整
- `/_next/static/*` 资源返回 `404`

### 根因
最常见原因是你使用了 Next.js `standalone` 输出，但**没有把 `public` 与 `.next/static` 复制到 `.next/standalone`**。

这在 Linux VPS 宿主机手工部署中最容易出现；仓库内 `Dockerfile` 已显式复制这些静态资源，所以 Docker 场景通常不会踩这个坑。

### 处理步骤
1. 先确认浏览器 Network 面板或反向代理日志中是否存在 `/_next/static/*` 的 `404`。
2. 在当前构建目录补齐静态资源：

```bash
mkdir -p .next/standalone/.next
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

3. 重启应用进程。
4. 再验证：
   - 首页
   - 一篇文章页
   - 后台登录页

### 额外检查
如果你明明复制过资源，但仍无样式，再检查：
- 反向代理是否仍指向旧的构建目录
- systemd `WorkingDirectory` / `ExecStart` 是否对应当前版本
- 发布脚本是否把旧的 `.next/standalone` 留在了线上

### 预防建议
- 把 `public` 与 `.next/static` 复制步骤写入固定部署脚本
- 每次部署后都执行一次 `docs/first-deployment-checklist.md` 中的首页与静态资源验收

## 2. 后台登录页能打开，但登录后会话不稳定

### 现象
- 能打开后台登录页
- 登录后又被打回登录页
- 刷新后会话丢失
- 深层后台页偶尔 302 回登录页

### 根因
生产环境后台会话 cookie 在 `NODE_ENV=production` 下使用 `Secure`。

因此最常见原因是：
- 公网仍在使用 HTTP
- `NEXTAUTH_URL` 不是站点对外 HTTPS 地址
- `NEXTAUTH_SECRET` 缺失
- 反向代理没有正确传协议头，导致应用误判当前协议

### 处理步骤
1. 先确认你访问的是 HTTPS 地址，而不是 HTTP。
2. 检查 `.env.local` 或部署环境中的：

```bash
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret
```

3. 检查反向代理至少传递了这些头：

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

4. 重启应用与反向代理。
5. 清掉浏览器旧 cookie 后重新登录。
6. 登录后至少再验证：
   - 刷新当前页
   - 打开文章管理页
   - 打开设置页

### 额外检查
如果之前能登录，改完配置后突然全部失效，还要检查：
- 是否更换过 `NEXTAUTH_SECRET`；更换后旧 session 会全部失效
- 是否改过 `admin_path`
- 是否改动过反向代理层的 TLS / header 配置

### 预防建议
- 后台登录相关改动后，必须在 HTTPS 场景做真实 smoke
- 不要随意轮换 `NEXTAUTH_SECRET`，除非你明确接受所有旧 session 失效

## 3. 后台路径突然变成 404

### 现象
- `/{old-admin-path}` 或 `/{old-admin-path}/login` 直接 `404`
- 站点首页正常，但后台入口像“消失了”

### 根因
Inkwell 的后台路径不是写死的，而是来自数据库 `settings` 表中的 `admin_path`。

如果当前 URL 中的 `adminPath` 与数据库配置不一致，后台 layout 会直接 `notFound()`。

### 处理步骤
1. 先确认最近是否改过后台设置中的 `admin_path`。
2. 用新的后台路径访问：

```text
https://your-domain.com/{admin_path}/login
```

3. 如果你不确定当前值，检查数据库 `settings` 中的 `admin_path`。
4. 若这是刚修改后的问题，重启应用后重新验证：
   - 新登录页地址
   - 登录跳转
   - 受保护后台页

### 预防建议
- 改 `admin_path` 后，不要只验证登录页能打开；还要验证登录后跳转与深层后台页
- 文档、浏览器书签、运维脚本中的后台地址都要同步更新

## 4. 应用或 CLI 脚本报 `DATABASE_URL is not configured`

### 现象
- `npm run db:migrate`
- `npm run backup:export`
- `npm run backup:import`
- `npm run posts:publish-scheduled`
- `npm run search:reindex-posts`

以上命令在启动时直接报：

```text
DATABASE_URL is not configured.
```

### 根因
最常见原因是部署层没有把数据库连接串正确注入到进程：
- `.env.local` 没有加载
- systemd 没有配置 `EnvironmentFile`
- 容器环境变量没传进去
- 当前工作目录不对，导致脚本没有读取到预期环境文件

### 处理步骤
如果你使用 systemd，至少确认服务定义包含：

```ini
Environment=NODE_ENV=production
EnvironmentFile=/path/to/inkwell/.env.local
WorkingDirectory=/path/to/inkwell
ExecStart=/usr/bin/node /path/to/inkwell/.next/standalone/server.js
```

如果你使用 Docker / Compose，确认：
- `DATABASE_URL` 已传入 app 容器
- 数据库主机名与网络配置正确

如果你是手动执行 CLI，确认当前目录就是项目根目录，并且 `.env.local` 中存在正确的 `DATABASE_URL`。

### 预防建议
- 把 `.env.local` 注入方式固化到 systemd / Compose 配置
- 每次部署后至少跑一次 `npm run db:migrate` 或 `GET /api/health` 做基本探活

## 5. 搜索页可打开，但搜索为空或 reindex 失败

### 现象
常见表现有三类：
- 搜索页能打开，但明明有文章却搜不到结果
- `npm run search:reindex-posts` 报 `MEILISEARCH_HOST is not configured.`
- 日志中出现明显的 Meilisearch 连接错误

### 根因
最常见原因是：
- `MEILISEARCH_HOST` 没有配置
- Meilisearch 服务没起来或应用连不上
- 你做了首次部署或 backup restore，但没有重建索引
- 远端代码还是旧版本，CLI 还停留在历史错误实现上

### 处理步骤
1. 先确认 Meilisearch 服务本身可访问。
2. 检查部署环境中的：

```bash
MEILISEARCH_HOST=
MEILISEARCH_API_KEY=
```

3. 重新执行索引重建：

```bash
npm run search:reindex-posts
```

4. 如果这是恢复后的实例，也可以直接使用：

```bash
npm run backup:import -- --input <backup-dir> --force --reindex-search
```

5. 如果 CLI 仍报历史上那类 `server-only` 相关错误，优先确认：
   - 远端代码已更新到最新提交
   - 最新构建产物已重新部署

### 重要说明
- PostgreSQL 才是 canonical source of truth
- backup 不包含 Meilisearch 索引
- 因此“文章存在但搜索为空”通常不需要整站回滚，优先 reindex 即可

### 预防建议
- 首次部署后把 `npm run search:reindex-posts` 视为默认步骤
- backup restore 完成后默认带上 `--reindex-search`

## 6. `backup:import` 拒绝导入，或报 checksum / schema 不匹配

### 现象
常见报错包括：
- `Import target is not empty ... Re-run with --force ...`
- `Checksum mismatch for <file>`
- `Media checksum mismatch.`
- `Backup migration tag ... does not match current schema ...`

### 根因
这些报错大多不是“程序坏了”，而是保护机制在工作：
- 目标实例非空时，默认拒绝覆盖
- 备份目录被改动、传输损坏、文件不完整时会触发 checksum 校验失败
- 当前代码版本与备份对应的 schema 版本不一致时，会拒绝继续导入

### 处理步骤
#### 6.1 目标实例非空
如果你明确要覆盖目标实例，再执行：

```bash
npm run backup:import -- --input <backup-dir> --force
```

如果恢复后还要重建搜索：

```bash
npm run backup:import -- --input <backup-dir> --force --reindex-search
```

#### 6.2 checksum / media checksum 不匹配
优先检查：
- 备份目录是否被手工改过
- 媒体文件是否丢失
- 备份文件是否传输不完整

处理方式通常是：
- 重新获取原始备份
- 不要手改导出的 JSON / manifest / media 目录

#### 6.3 migration tag 不匹配
这通常说明：
- 你正在用“较新的代码”导入“较旧 schema”导出的备份
- 或者反过来，代码版本落后于备份

正确做法是：
1. 先切到与备份兼容的代码版本
2. 再执行导入
3. 导入完成后按升级流程继续前进

### 恢复后最低验证
恢复成功后至少验证：
- 首页
- 后台登录
- 一篇文章页
- 搜索
- 媒体文件

### 预防建议
- 备份与对应代码版本一起保存
- 恢复流程至少在测试环境或备用实例验证一次，不要把生产实例当第一次演练场

## 7. internal API / scheduled publish 触发异常

### 现象
最常见的三种返回：
- `503`：`INTERNAL_CRON_SECRET is not configured.`
- `401`：`Unauthorized.`
- `200` 但 `publishedCount = 0`

### 如何理解这些结果
#### 7.1 返回 503
说明部署环境没有注入 `INTERNAL_CRON_SECRET`。

#### 7.2 返回 401
说明请求没有正确带：

```http
Authorization: Bearer <INTERNAL_CRON_SECRET>
```

常见错误：
- 漏掉 `Bearer ` 前缀
- token 写错
- 调度器仍在调用旧域名 / 旧 URL

#### 7.3 返回 200 但 `publishedCount = 0`
这不一定是异常，很多时候只是：
- 当前没有到期的 scheduled 文章
- 调度器触发正常，但没有需要发布的内容

### 处理步骤
1. 先检查部署环境中是否有：

```bash
INTERNAL_CRON_SECRET=
```

2. 再用正确 header 手动触发：

```http
POST /api/internal/posts/publish-scheduled
Authorization: Bearer <INTERNAL_CRON_SECRET>
```

3. 如果仍不确定，可直接在服务器上执行 CLI 入口：

```bash
npm run posts:publish-scheduled
```

4. 如果 API 返回 200 但没有发布任何文章，再核对：
- 是否真的存在 `status = scheduled` 的文章
- 它们的发布时间是否已经到期
- 服务器时间是否正确

### 预防建议
- 只保留一个清晰的生产触发入口：CLI 或 internal API，避免多套调度混用
- 首次部署后至少验证一次“无到期文章”和“一篇到期文章”两种情况

## 8. 怎么快速判断更像部署问题，还是功能问题？

可以先按下面的信号做快速分流：

| 现象 | 更像哪类问题 | 第一优先动作 |
| --- | --- | --- |
| 首页 200 但无样式 | 静态资源 / standalone 部署问题 | 检查 `/_next/static/*` 是否 404 |
| 后台登录页能打开，但登录后掉回去 | HTTPS / cookie / `NEXTAUTH_*` 配置问题 | 检查 HTTPS、`NEXTAUTH_URL`、`NEXTAUTH_SECRET` |
| 搜索页打开但没结果 | Meilisearch / reindex 问题 | 先跑 `npm run search:reindex-posts` |
| 恢复时报 non-empty / checksum / migration tag | backup import 安全校验或版本不匹配 | 先确认是否该 `--force`、是否用了匹配代码版本 |
| internal API 返回 401 / 503 | secret 或 header 问题 | 检查 `INTERNAL_CRON_SECRET` 与 `Authorization` header |
| 只有某个按钮或业务动作报错 | 更可能是数据库、权限或业务逻辑问题 | 先查应用日志与对应模块实现 |

如果你仍然拿不准，建议按这个顺序排查：
1. 首页与静态资源
2. `GET /api/health`
3. 后台登录
4. 数据库迁移
5. 搜索与备份链路
6. internal API / scheduled publish
7. 对应模块日志与实现

## 9. 推荐搭配阅读

- 部署说明：`docs/deployment.md`
- 首次部署验收：`docs/first-deployment-checklist.md`
- 运维参考：`docs/operations-reference.md`
- 监控与日志：`docs/monitoring-and-logs.md`
- 升级与回滚：`docs/upgrade-and-rollback.md`
- 发布前检查：`docs/release-checklist.md`

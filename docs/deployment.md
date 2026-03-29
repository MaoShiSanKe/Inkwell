# Inkwell 部署说明

> 本文档面向 **VPS / 通用 Linux 宿主机** 场景。
> 当前目标是说明 **框架层能力如何接入部署层调度**，而不是要求本地开发环境安装 Docker。

---

## 1. 适用范围

本文档说明以下内容：

- Inkwell 的基本生产运行前提
- `scheduled` 定时发布的责任边界
- 定时发布的两种触发方式
- `INTERNAL_CRON_SECRET` 的使用方式
- Linux VPS 上的最小可用调度方案
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

### 2.2 部署环境负责
部署环境负责：

- 定期触发自动发布入口
- 选择使用哪种调度方式：
  - Linux cron
  - 面板定时任务
  - 外部 HTTP 调度器
  - 其他平台任务系统

换句话说：

> **Inkwell 负责“能发布”，部署环境负责“什么时候触发发布”。**

---

## 3. 基本部署前提

生产环境通常需要：

- Node.js
- PostgreSQL
- `.env.local` 或等价环境配置
- 反向代理（如 Nginx）
- 正确配置的站点域名与 `NEXTAUTH_URL`

若使用 Linux VPS：

- 推荐使用 systemd / pm2 / 其他进程管理方式托管 Next.js 服务
- 推荐使用宿主机 cron 或面板任务触发定时发布

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

## 6. 生产环境推荐方案（Linux VPS）

如果是通用 Linux VPS，推荐优先使用：

- **宿主机 cron + 脚本入口**

### 6.1 推荐 cron 配置
每 5 分钟执行一次：

```cron
*/5 * * * * cd /path/to/inkwell && npm run posts:publish-scheduled >> /var/log/inkwell-cron.log 2>&1
```

说明：

- `/path/to/inkwell` 替换为你的项目目录
- 日志输出到 `/var/log/inkwell-cron.log`
- 每 5 分钟通常足够满足博客定时发布需求

如果你需要更高精度，可调整频率，但通常没必要每分钟执行一次。

---

## 7. 什么时候使用 HTTP API 方案

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

## 8. 开发阶段如何验证

开发阶段**无需配置 cron**。

### 8.1 验证脚本入口
直接执行：

```bash
npm run posts:publish-scheduled
```

### 8.2 验证内部 API
在本地服务启动后，用请求工具或 `curl` 调用：

```bash
curl -X POST "http://localhost:3000/api/internal/posts/publish-scheduled" \
  -H "Authorization: Bearer YOUR_INTERNAL_CRON_SECRET"
```

### 8.3 推荐验证流程
1. 在后台创建一篇 `scheduled` 文章
2. 把发布时间设为接近当前时间的未来时刻
3. 等待到点或手动触发脚本/API
4. 检查文章是否变为 `published`
5. 检查前台是否可见
6. 检查 sitemap 是否同步更新

---

## 9. 安全注意事项

### 9.1 内部 API 不是公开功能
- 不要把内部 API 当作公开接口给前台调用
- 不要把 `INTERNAL_CRON_SECRET` 暴露到浏览器端
- 不要在客户端代码中引用该 secret

### 9.2 secret 管理
- `INTERNAL_CRON_SECRET` 应写在服务器环境变量或私有配置中
- 不要提交到 Git
- 不要写死在代码里

### 9.3 请求来源控制
如果生产环境允许，建议额外做以下限制之一：

- 反向代理层限制来源 IP
- 面板任务只在本机回环地址调用
- 仅允许内网访问该内部接口

这不是框架必需条件，但属于推荐的部署安全加固。

---

## 10. Docker 说明

当前项目支持在生产部署阶段考虑 Docker / Docker Compose，
但 **Docker 不是开发前提，也不是定时发布能力的前置条件**。

因此：

- 本地开发无需安装 Docker
- 定时发布能力不依赖 Docker 才能工作
- Docker 相关接线可在后续生产部署阶段单独处理

---

## 11. 当前实现状态概览

当前与定时发布相关的实现已经包括：

- 后台 scheduled 状态编辑能力
- future `publishedAt` 校验
- scheduled 编辑回填
- 前台仅公开 `published`
- `publishScheduledPosts(now)` 服务逻辑
- `npm run posts:publish-scheduled` 脚本入口
- `/api/internal/posts/publish-scheduled` 内部 API 入口
- sitemap 同步更新
- revision 清理联动

这意味着：

> **框架层已具备定时发布基础能力，部署阶段只需要选择一种调度方式并定期触发即可。**

---

## 12. 推荐实践总结

如果你是通用 VPS 部署，最简单可行的做法是：

1. 正常部署 Next.js 服务
2. 配好 `INTERNAL_CRON_SECRET`
3. 在 Linux 宿主机上配置 cron
4. 每 5 分钟执行：
   - `npm run posts:publish-scheduled`

如果你未来改为平台任务或外部调度器，也可以直接改调：

- `POST /api/internal/posts/publish-scheduled`

框架层无需再重写。

---

## 13. 后续文档建议

如果后续需要继续完善部署文档，建议新增章节：

- systemd / pm2 启动方式
- Nginx 反向代理示例
- HTTPS / 域名配置
- 数据库备份策略
- Docker / Docker Compose 生产部署示例（可选）

这些内容属于后续增强，不影响当前定时发布能力使用。

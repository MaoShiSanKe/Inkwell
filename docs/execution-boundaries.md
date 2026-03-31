# Inkwell 执行边界说明

本文档用于说明在 Inkwell 中，什么时候应该使用：
- server action
- route handler (`app/api/**`)
- CLI script (`scripts/*.ts`)
- 共享业务服务层 (`lib/**`)

未来维护时，很多混乱都来自“把逻辑放错层”。本页的目标就是避免这种情况。

## 1. 总原则

优先把业务规则放在共享服务层，再由不同入口调用。

推荐分工：
- 页面组件：读数据、渲染 UI
- server action：表单提交、认证、redirect、revalidation
- route handler：HTTP 协议边界、header/token 校验、JSON response
- CLI script：命令行参数解析、环境加载、机器可读输出
- `lib/admin/**` / `lib/**`：真正的业务逻辑与数据库读写

## 2. 什么时候该用 server action

适合场景：
- 后台表单提交
- 只服务于当前站点 Web UI 的 mutation
- 需要和 `useActionState()` 搭配
- 成功后通常需要 `redirect()` 与 `revalidatePath()`

当前典型例子：
- `app/(admin)/[adminPath]/(protected)/posts/actions.ts`
- `app/(admin)/[adminPath]/(protected)/categories/actions.ts`
- `app/(admin)/[adminPath]/(protected)/settings/actions.ts`

server action 负责：
- 读取 `adminPath`
- 检查登录态
- 未登录跳转
- 调用服务层
- 根据结果 revalidate / redirect

不适合放在 action 中的内容：
- 大量重复业务规则
- 底层数据库组合逻辑
- 独立于 Web UI 的运维入口

## 3. 什么时候该用 route handler

适合场景：
- 需要提供 HTTP 接口
- 需要 header / token / request body 边界处理
- 需要返回稳定 JSON 协议
- 需要让站外调度器或其他系统调用

当前最典型例子：
- `app/api/internal/posts/publish-scheduled/route.ts`
- `app/api/health/route.ts`

内部运维 API 当前模式：
- 从 header 中取 Bearer token
- 对 `INTERNAL_CRON_SECRET` 做校验
- 调用共享服务层
- 在 route 中负责公开 JSON 响应与必要的 revalidation

不要把 route handler 当成：
- 随便替代 server action 的写操作层
- 把大量业务逻辑直接塞进去的地方

## 4. 什么时候该用 CLI script

适合场景：
- 宿主机 cron / 手动命令 / 运维脚本入口
- 不依赖浏览器或 HTTP 请求
- 希望能输出 JSON 或稳定命令行结果
- 需要在 Next.js runtime 外运行

当前典型例子：
- `scripts/publish-scheduled-posts.ts`
- `scripts/reindex-search-posts.ts`
- `scripts/export-backup.ts`
- `scripts/import-backup.ts`
- `scripts/create-admin.ts`

CLI 层负责：
- `dotenv` 加载 `.env.local`
- 解析 argv
- 调用服务层或 CLI-safe 数据访问逻辑
- 输出稳定结果
- 设置退出码

参考：
- `scripts/reindex-search-posts.ts`
- `scripts/import-backup.ts`

## 5. 为什么共享服务层很重要

Inkwell 当前很多关键链路都有多个入口：

### 5.1 定时发布
- service：`lib/admin/posts.ts`
- CLI：`scripts/publish-scheduled-posts.ts`
- internal API：`app/api/internal/posts/publish-scheduled/route.ts`

### 5.2 搜索重建
- service：`lib/search/reindex-posts.ts`
- CLI：`scripts/reindex-search-posts.ts`

### 5.3 备份恢复
- services：`lib/backup/export.ts`、`lib/backup/import.ts`
- CLI：`scripts/export-backup.ts`、`scripts/import-backup.ts`

这说明：
- 真正的业务规则不应该只属于某个入口
- 不同入口只是不同的执行边界

## 6. 谁负责 auth、参数解析、revalidation

### 6.1 auth
- 后台 Web 提交：通常在 server action 处理
- internal API：通常在 route handler 校验 token
- CLI：通常依赖本地环境，不走 Web auth

### 6.2 参数解析
- 表单字段：server action
- HTTP headers/body：route handler
- argv：CLI script
- 业务校验：服务层

### 6.3 revalidation
当前仓库模式下，一般由入口层负责：
- server action 成功后负责 `revalidatePath()`
- internal API 在业务成功后负责 `revalidatePath()`
- CLI 通常不负责 Next.js 页面 revalidation，除非明确运行在同一应用上下文中

示例：
- 文章后台 action 会刷新后台页与公开文章页：`app/(admin)/[adminPath]/(protected)/posts/actions.ts`
- internal publish API 会刷新文章页、sitemap 与 RSS：`app/api/internal/posts/publish-scheduled/route.ts:56-60`

## 7. CLI-safe 的额外规则

CLI 运行时不应该依赖只适用于 Next.js 应用服务端上下文的入口。

这是搜索重建链路已经踩过的坑。

当前正确模式：
- 在 CLI 或 CLI-shared 路径中使用显式数据库上下文
- 不重新依赖 `server-only` 的 Web DB 入口

参考：
- `lib/search/reindex-posts.ts`
- `scripts/reindex-search-posts.ts`

## 8. 如何做选择：决策树

### 场景 A：后台表单保存
优先：server action + `lib/admin/*`

### 场景 B：给外部调度器提供入口
优先：route handler + shared service

### 场景 C：给宿主机 cron 提供入口
优先：CLI script + shared service

### 场景 D：多个入口共享同一业务规则
优先：先抽到 `lib/**`

### 场景 E：只是页面读取展示
优先：page / server component 调用查询层，不要为了“统一”硬做 API

## 9. 常见反模式

- 在 page.tsx 里直接写 mutation
- 在 server action 里重复实现完整业务逻辑
- 在 route handler 里堆数据库细节
- 让 CLI 依赖 Web-only 运行时模块
- 没有抽共享服务，导致 HTTP/CLI/后台 action 三份逻辑各写一遍
- 业务成功后忘了做正确范围的 revalidation

## 10. 文档同步要求

如果你调整了执行边界，至少检查：
- `docs/development.md`
- `docs/architecture.md`
- `docs/release-checklist.md`
- 必要时 `docs/deployment.md`

## 11. 推荐阅读顺序

如果你接下来要新增运维入口、后台 action 或 internal API，建议按顺序读：

1. `docs/development.md`
2. 本文档 `docs/execution-boundaries.md`
3. `docs/admin-extension-workflow.md`
4. `docs/testing-strategy.md`

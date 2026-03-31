# Inkwell 后台模块扩展工作流

本文档面向未来维护者与贡献者，说明当你需要为 Inkwell 新增或改造一个后台模块时，应该如何沿用当前仓库的实现模式，而不是临时拼接页面逻辑。

## 1. 什么时候需要一个新的后台模块

通常在以下场景下，适合新增独立后台模块：

- 需要一组独立的列表 / 新建 / 编辑页面
- 需要自己的服务层、表单状态和权限校验
- 需要单独的后台导航入口或仪表盘入口
- 需要对公开页面、搜索、sitemap 或设置产生独立影响

如果只是对现有模块补一个字段、增加一个批量操作、调整一个表单，不一定需要新模块，优先看是否能在当前模块内扩展。

## 2. 当前后台模块的通用结构

Inkwell 当前的后台模块基本遵循同一套分层：

1. 页面层：`app/(admin)/[adminPath]/(protected)/**`
2. 表单组件层：`components/admin/**`
3. 表单状态/字段转换：`lib/admin/*-form.ts`
4. 服务层：`lib/admin/**`
5. 认证与后台路径：`lib/auth.ts`、`lib/settings.ts`

典型例子：
- 文章：`app/(admin)/[adminPath]/(protected)/posts/**`
- 分类：`app/(admin)/[adminPath]/(protected)/categories/**`
- 设置：`app/(admin)/[adminPath]/(protected)/settings/**`
- 页面：`app/(admin)/[adminPath]/(protected)/pages/**`

## 3. 一个后台模块通常要有哪些文件

以当前仓库模式，新增一个模块通常至少会有：

### 3.1 列表页 / 详情页 / 新建页
通常放在：
- `app/(admin)/[adminPath]/(protected)/<module>/page.tsx`
- `app/(admin)/[adminPath]/(protected)/<module>/new/page.tsx`
- `app/(admin)/[adminPath]/(protected)/<module>/[id]/page.tsx`

职责：
- 读取服务层数据
- 渲染表单组件
- 传递 `adminPath`
- 不直接承载复杂业务规则

### 3.2 Server Actions
通常放在：
- `app/(admin)/[adminPath]/(protected)/<module>/actions.ts`

职责：
- 获取 `adminPath`
- 读取当前认证态
- 处理未登录重定向
- 调用 `lib/admin/*` 服务函数
- 在成功后执行 `revalidatePath()` / `redirect()`

可参考：
- `app/(admin)/[adminPath]/(protected)/posts/actions.ts`
- `app/(admin)/[adminPath]/(protected)/categories/actions.ts`
- `app/(admin)/[adminPath]/(protected)/settings/actions.ts`

### 3.3 表单组件
通常放在：
- `components/admin/<module>-form.tsx`

职责：
- 接收初始值、错误信息与 action
- 调用 `useActionState()` 驱动表单提交
- 不直接写数据库

### 3.4 服务层
通常放在：
- `lib/admin/<module>.ts`

职责：
- 数据校验
- 数据库读写
- 业务规则
- 返回结构化结果给 action

不要在 `page.tsx` 或组件里直接堆业务写操作。

## 4. 后台认证与动态路径模式

后台不是写死在 `/admin`。

关键事实：
- 后台真实路径来自 `lib/settings.ts` 的 `getAdminPath()`
- `app/(admin)/[adminPath]/layout.tsx` 会校验 URL 中的 `adminPath`
- `app/(admin)/[adminPath]/(protected)/layout.tsx` 会校验会话

因此新增后台模块时：
- 不要把真实后台路径硬编码在组件中
- server action 中要从 formData 或当前设置推导 `effectiveAdminPath`
- 未登录时要跳转到 `/${effectiveAdminPath}/login?...`

参考实现：
- `app/(admin)/[adminPath]/(protected)/posts/actions.ts:36-45`
- `app/(admin)/[adminPath]/(protected)/categories/actions.ts:37-46`
- `app/(admin)/[adminPath]/(protected)/settings/actions.ts:38-50`

## 5. 标准实现步骤

### 步骤 1：先确认数据归属
先判断这个模块是否需要：
- 新表 / 新 relation
- 新 settings key
- 只是复用已有实体的另一种管理界面

如果涉及新表，先看：`docs/schema-and-migrations.md`
如果涉及新 setting，先看：`docs/settings-system.md`

### 步骤 2：先写服务层，再写页面
推荐顺序：
1. `lib/admin/<module>.ts`
2. 需要的话补 `lib/admin/<module>-form.ts`
3. `actions.ts`
4. `components/admin/<module>-form.tsx`
5. `page.tsx` / `new/page.tsx` / `[id]/page.tsx`

这样能避免把业务规则散落到 UI 层。

### 步骤 3：复用现有返回结构
服务层应尽量返回：
- `success`
- `errors`
- `values`
- 需要 revalidate 的 slug / id / next path

不要让 action 自己重新推断所有业务结果。

### 步骤 4：在 action 中负责 redirect 与 revalidation
Inkwell 当前模式是：
- service 负责业务结果
- action 负责：
  - auth
  - redirect
  - revalidatePath

不要把 `redirect()` 写到服务层。

## 6. Revalidation 责任边界

后台 mutation 成功后，通常不只需要刷新后台列表页。

### 6.1 只影响后台时
至少 revalidate：
- 列表页
- 新建页或详情页

### 6.2 影响公开页面时
还要 revalidate：
- 对应公开路由
- 可能受影响的详情页
- 必要时 `sitemap.xml` / `rss.xml`

参考：
- 文章操作会 revalidate `/${adminPath}/posts` 和 `/post/${slug}`：`app/(admin)/[adminPath]/(protected)/posts/actions.ts:24-30,81-83,137-139`
- 分类操作会 revalidate 后台分类页、文章编辑页和 `/category/${slug}`：`app/(admin)/[adminPath]/(protected)/categories/actions.ts:17-30`
- 设置操作会根据是否影响分析脚本或后台路径，决定 revalidate 后台和首页：`app/(admin)/[adminPath]/(protected)/settings/actions.ts:21-36,85-89`

### 6.3 经验规则
如果一个后台操作会影响以下任一项，就不要只 revalidate 后台：
- 公开 URL
- SEO / sitemap / RSS
- 设置驱动的公开展示
- 搜索索引
- 依赖 settings 的 layout 逻辑

## 7. 新模块还要同步哪些入口

新增一个后台模块后，通常还要检查：

- 仪表盘入口：`app/(admin)/[adminPath]/(protected)/page.tsx`
- 后台导航 / 快捷卡片是否需要更新
- 表单中是否需要引用此模块的数据（例如文章页中的分类/标签/系列）
- 公开页面是否需要新增对应入口

如果这是内容型模块，还要考虑：
- 是否需要 SEO / sitemap
- 是否需要搜索接入
- 是否需要备份导出/恢复覆盖
- 是否需要浏览器回归测试

## 8. 一个模块常见的连带影响

新增后台模块时，除了 UI 本身，还要检查：

### 8.1 数据库
- 是否需要新增 schema
- 是否需要 relation
- 是否需要 seed 默认数据

### 8.2 搜索
- 是否要进入搜索索引
- 是否要在已有搜索 reindex 流程中补入数据

### 8.3 备份恢复
- 是否要进入 backup export/import 表清单
- 是否有 secret / media / ordered restore 的特殊要求

### 8.4 文档
至少检查：
- `README.md`
- `docs/development.md`
- `docs/architecture.md`
- `docs/release-checklist.md`

## 9. 测试建议

### 至少补哪些测试
- 服务层规则变更：`test` 或 `test:integration`
- 后台写操作：至少 `test:integration`
- 影响公开 UI 或后台交互流程：补 `test:browser`

### 优先参考现有案例
- 文章：`tests/integration/admin/posts.integration.test.ts`
- 设置：`tests/integration/admin/settings.integration.test.ts`
- 自定义页面：`tests/browser/custom-pages.spec.ts`
- 后台设置：`tests/browser/settings.spec.ts`

更多规则见：`docs/testing-strategy.md`

## 10. 推荐检查清单

当你新增或改造后台模块时，建议按顺序确认：

1. 服务层是否已经独立承载业务规则
2. action 是否只负责 auth / redirect / revalidation
3. 是否正确使用 `getAdminPath()` 而不是写死后台路径
4. 成功后的 revalidate 范围是否覆盖后台与公开页面
5. 是否需要补 schema / settings / search / backup 相关逻辑
6. 是否补了对应层级的测试
7. 是否同步更新了开发与维护文档

## 11. 最常见的错误

- 在页面组件里直接写数据库 mutation
- 把后台路径写死成 `/admin`
- 只刷新后台列表页，忘记刷新公开路由
- 新增内容实体后忘了同步 search / backup / docs
- 用 server action 承载过多业务规则，导致逻辑重复
- 新模块接入后没有补集成测试或浏览器测试

## 12. 推荐阅读顺序

如果你接下来真的要做后台扩展，建议按顺序读：

1. `docs/development.md`
2. 本文档 `docs/admin-extension-workflow.md`
3. `docs/execution-boundaries.md`
4. `docs/schema-and-migrations.md`（若涉及新表）
5. `docs/settings-system.md`（若涉及新 setting）
6. `docs/testing-strategy.md`

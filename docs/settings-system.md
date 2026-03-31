# Inkwell 设置系统说明

本文档面向未来维护者与贡献者，说明 Inkwell 的配置为什么分为环境变量和数据库 `settings` 表两层，以及当你需要新增一个设置项时，应该如何沿用现有实现。

## 1. 先判断：这个配置应该放哪里

新增一个配置前，先判断它属于哪一层。

### 1.1 适合放进 `.env`
满足以下任一项时，优先考虑环境变量：
- 进程启动前就必须存在
- 用于连接外部服务
- 属于部署环境差异
- 是 secret，且不适合在后台界面中被编辑
- 更接近基础设施，而不是站点业务设置

典型例子：
- `DATABASE_URL`
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `INTERNAL_CRON_SECRET`

### 1.2 适合放进数据库 `settings` 表
满足以下任一项时，优先考虑 `settings`：
- 站点运行中可能需要调整
- 应由后台管理员修改
- 是站点级业务配置，而不是部署连接配置
- 不同实例需要保留独立业务设置

典型例子：
- `admin_path`
- `revision_limit`
- `revision_ttl_days`
- `excerpt_length`
- SMTP 设置
- Umami 设置

## 2. 当前设置系统的结构

Inkwell 的 DB-backed settings 不是零散读取，而是有统一定义。

### 2.1 定义入口
- `lib/settings-config.ts`

这里定义了每个 setting 的：
- `defaultValue`
- `isSecret`
- `parse()`
- `serialize()`

核心对象：
- `settingDefinitions`
- `DEFAULT_SETTINGS`
- `SETTING_KEYS`

### 2.2 读取入口
- `lib/settings.ts`

这里负责：
- 读取 settings 表
- 解析成应用层值
- 提供上层 getter，例如 `getAdminPath()`

### 2.3 后台写入入口
- `lib/admin/settings.ts`
- `lib/admin/settings-form.ts`
- `components/admin/settings-form.tsx`
- `app/(admin)/[adminPath]/(protected)/settings/actions.ts`

## 3. 新增一个 setting 的完整链路

新增一个 DB-backed setting 时，不要只改一个地方。当前仓库模式至少要检查以下层。

### 3.1 在 `lib/settings-config.ts` 中定义 setting
你需要补：
- key
- defaultValue
- isSecret
- parse
- serialize

参考：
- `admin_path`：`lib/settings-config.ts:138-144`
- `smtp_password`：`lib/settings-config.ts:193-198`
- `umami_script_url`：`lib/settings-config.ts:223-228`

### 3.2 让默认值进入 `DEFAULT_SETTINGS`
如果忘了这里，seed 与读取默认值会不完整。

### 3.3 如果需要，给 `lib/settings.ts` 增加 getter
如果上层会频繁读取，建议补一个明确的 accessor，而不是在页面中硬取底层 key。

例如：
- `getAdminPath()` 用于后台路径解析
- `getSiteOrigin()` 用于站点 origin 逻辑

### 3.4 更新后台设置服务
如果这个 setting 需要由后台修改，还要更新：
- `lib/admin/settings.ts`
- `lib/admin/settings-form.ts`
- `components/admin/settings-form.tsx`
- `app/(admin)/[adminPath]/(protected)/settings/actions.ts`

这几个层分别负责：
- 校验和持久化
- 表单 state
- UI 呈现
- action 层的 auth / redirect / revalidation

### 3.5 判断是否需要 seed
如果一个新 setting 必须有初始值，检查：
- `scripts/seed.ts`

### 3.6 判断是否影响公开页面或后台路径
如果会影响运行时路由或公开展示，要同步考虑 revalidation。

例如当前设置 action 中：
- 后台路径变化会刷新旧路径和新路径：`app/(admin)/[adminPath]/(protected)/settings/actions.ts:25-36`
- 分析配置变化会 revalidate 首页布局：`app/(admin)/[adminPath]/(protected)/settings/actions.ts:21-23,87-89`

### 3.7 判断是否需要文档同步
新增 setting 后，至少检查：
- `docs/environment.md`
- `docs/development.md`
- `docs/release-checklist.md`
- 必要时 `README.md` / `docs/deployment.md`

## 4. Secret setting 与普通 setting 的区别

### 4.1 普通 setting
特点：
- `isSecret: false`
- 可直接展示当前值
- 导出备份时可明文进入快照

### 4.2 Secret setting
特点：
- `isSecret: true`
- UI 与导出/恢复链路要特殊处理
- 不应在仓库、日志或公开文档中暴露真实值

当前例子：
- `smtp_password`

这类 key 需要特别注意：
- 后台保存时是否允许空值表示“保持不变”
- backup export 时是否脱敏
- backup import 时若快照中是脱敏值，是否保留目标实例当前 secret

相关链路：
- `lib/settings-config.ts`
- `lib/admin/settings.ts`
- `lib/backup/export.ts`
- `lib/backup/import.ts`

## 5. 什么时候不要把配置做成 setting

以下情况通常不适合进入 `settings` 表：

- 会影响服务启动能力
- 是内部 API 鉴权 secret
- 需要在容器 / systemd / CI 环境中直接注入
- 不应该由后台管理员从 UI 中修改

例如：
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `INTERNAL_CRON_SECRET`

## 6. Route-affecting settings 要额外小心

当前最典型的是：
- `admin_path`

它不是普通展示配置，而是会影响：
- 后台入口 URL
- 登录重定向
- 受保护布局
- 文档与运维认知

因此这类 setting 的新增或修改，要额外检查：
- route 生成逻辑
- redirect
- revalidation
- 浏览器测试
- 文档同步

## 7. 推荐实现步骤

如果你要新增一个 DB-backed setting，建议按顺序做：

1. 判断它是否真的应该属于 `settings` 表
2. 在 `lib/settings-config.ts` 里补定义
3. 更新默认值和类型
4. 在 `lib/settings.ts` 中补 getter（如有必要）
5. 更新 `lib/admin/settings.ts` 的读写逻辑
6. 更新表单 state 和 UI
7. 在 `settings/actions.ts` 中补提交字段与必要的 revalidation
8. 补测试
9. 补文档

## 8. 测试建议

新增 setting 后，至少考虑以下验证：

### 8.1 集成测试
优先看：
- `tests/integration/admin/settings.integration.test.ts`

适合验证：
- parse / validate
- 保存失败时的 errors
- 保存成功后的值
- secret 处理

### 8.2 浏览器测试
如果该 setting 会影响后台设置页面交互或公开页面行为，考虑补：
- `tests/browser/settings.spec.ts`

### 8.3 运维链路验证
如果该 setting 会影响：
- 公开布局
- 分析脚本
- 后台路径
- 邮件通知

则还要检查是否需要：
- `npm run docs:build`
- `npm run test:browser`
- 手动 smoke

## 9. 文档同步建议

新增 setting 后，通常需要同步：

- `docs/environment.md`：说明配置归属
- `docs/development.md`：说明改动入口
- `docs/release-checklist.md`：增加发布检查项

如果该 setting 是公开功能的一部分，还要考虑：
- `README.md`
- `docs/deployment.md`
- `docs/faq.md`

## 10. 常见错误

- 把部署 secret 做成后台可改 setting
- 只在 `settingDefinitions` 中加了 key，却忘了 UI / service / tests
- 忘记更新默认值
- 忘记处理 secret setting 的导出/恢复语义
- 忘记做 revalidation，导致设置保存后前台不刷新
- 忘记补文档，导致未来自己不知道配置入口在哪里

## 11. 推荐阅读顺序

如果你接下来要改设置系统，建议按顺序读：

1. `docs/environment.md`
2. 本文档 `docs/settings-system.md`
3. `docs/execution-boundaries.md`
4. `app/(admin)/[adminPath]/(protected)/settings/actions.ts`
5. `lib/settings-config.ts`
6. `lib/settings.ts`
7. `docs/testing-strategy.md`

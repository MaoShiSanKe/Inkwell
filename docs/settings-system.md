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
- Theme Framework v1（站点品牌、首页 hero、首页展示变体、公开布局外壳、默认主题模式）
- 全站公开公告（含可关闭、版本控制与时间窗口）

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

## 3.1 Theme Framework v1 这类展示 setting 该怎么设计

如果你要新增的是“公开站点展示层”的主题化配置，优先沿用当前 settings 链路，而不是直接引入主题市场、页面搭建器或任意 token 编辑器。

Theme Framework v1 当前建议采用：
- 品牌名称 / 副标题
- 首页标题 / 简介 / 主 CTA
- 首页列表展示模式与元信息开关
- 公开布局宽度 / 表面风格 / 强调色
- 默认主题模式（`system | light | dark`）

当前 v1 已落地的表现包括：
- 公开页头品牌区与结构化页脚
- 首页 Hero 文案与主按钮
- 首页精选入口区块（标题、说明、三张固定链接卡片）
- 首页列表 `comfortable | compact` 变体
- 首页摘要 / 作者 / 分类 / 发布时间开关
- public/admin 主题切换遵循 `localStorage > backend default > system`

设计原则：
- 优先有限枚举与结构化字段，而不是任意 JSON blob
- 优先“单主题、多变体”，而不是多主题注册系统
- 优先复用 `publicLayoutChanged` + `revalidatePath("/", "layout")`
- 保留 `public_custom_css` 作为 escape hatch，但不要让它反客为主

这类设置适合第一阶段解决：
- 首页和公开外壳的硬编码问题
- 浏览器后台可配置的品牌与展示能力
- 类似 WordPress 主题设置页的可维护体验

## 3.2 公开站点公告这类 setting 该怎么设计

如果你要新增的是“访客能直接看到”的公开站点级配置，优先参考当前全站公告这条实现链路，而不是直接给管理员一个原始 HTML 输入框。

当前公告相关 setting 包括：
- `public_notice_enabled`
- `public_notice_variant`
- `public_notice_dismissible`
- `public_notice_version`
- `public_notice_start_at`
- `public_notice_end_at`
- `public_notice_title`
- `public_notice_body`
- `public_notice_link_label`
- `public_notice_link_url`

设计原则：
- 优先结构化字段，而不是一整个 JSON blob 或富文本对象
- 优先 typed parse / serialize，而不是把所有校验推迟到页面层
- 当配置会影响公开布局时，应继续复用 `publicLayoutChanged` + `revalidatePath("/", "layout")`
- 当配置需要浏览器端记忆行为（例如关闭公告）时，版本号应由 settings 显式控制，而不是隐式依赖标题/正文 hash

这类 setting 的好处是：
- 更安全
- 更容易测试
- 更容易被未来维护者理解
- 不会把公开运营功能变成第二套“任意代码注入系统”

另外，当一个公开站点 setting 依赖访客浏览器端状态时（例如“可关闭公告”），建议同步设计：
- 一个显式的布尔开关，例如 `public_notice_dismissible`
- 一个显式版本字段，例如 `public_notice_version`

如果公告需要按时间窗口生效，继续沿用仓库里已有的“浏览器本地 `datetime-local` 输入 + 提交为 ISO 绝对时间”的模式：
- 后台表单用 `datetime-local`
- action / service 层保存 ISO 时间字符串
- 运行时按 `start_at <= now < end_at` 判断是否显示
- `start_at` / `end_at` 任一为空时表示该边界不受限制

### 3.3 如果需要，给 `lib/settings.ts` 增加 getter
如果上层会频繁读取，建议补一个明确的 accessor，而不是在页面中硬取底层 key。

例如：
- `getAdminPath()` 用于后台路径解析
- `getSiteOrigin()` 用于站点 origin 逻辑
- `getThemeFrameworkSettings()` 用于首页与公开布局主题配置

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

### 3.8 当前最适合延后的内容
即便开始做 Theme Framework，也不建议当前阶段直接引入：
- 多主题安装 / 激活系统
- 菜单树配置系统
- section builder
- page builder
- 插件式扩展接口

这些更适合 Theme Framework v2 之后再判断。

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

## 12. 对 Theme Framework v1 的结论

当前 Inkwell 最合适的主题化方向不是：
- 插件化主题生态
- 主题市场
- 页面搭建器

而是：

> **先把首页与公开布局的核心展示参数，纳入结构化 settings 系统，形成单主题、多变体、后台可配置的 Theme Framework v1。**

这也是当前项目阶段性最合适、最稳的演进方式。

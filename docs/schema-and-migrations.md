# Inkwell Schema 与迁移维护指南

本文档面向未来维护者与贡献者，说明当你需要新增表、修改字段或调整 relation 时，应该如何在 Inkwell 中安全推进 schema 变更，而不是只停留在“跑一下 migration”。

## 1. 什么时候真的需要改 schema

优先判断是否真的需要数据库结构变更。

通常以下情况需要改 schema：
- 新增一个持久化实体
- 现有实体需要新增字段且无法由现有结构表达
- 需要新增关联关系或索引
- 需要支持新的公开能力、后台能力或运维流程

以下情况不一定要改 schema：
- 只是表单展示变化
- 只是现有字段的组合逻辑变化
- 只是把某个值做成 DB-backed setting

如果只是新增站点级配置，优先看：`docs/settings-system.md`

## 2. 当前 schema 组织方式

Inkwell 当前采用：
- 每张表一个 schema 文件：`lib/db/schema/**`
- 聚合导出与 relations：`lib/db/schema/index.ts`
- 迁移配置：`drizzle.config.ts`
- 自动生成迁移：`lib/db/migrations/**`

关键规则：
- 只修改 schema 源文件
- 使用 `npm run db:generate` 生成迁移
- 不手改自动生成的 migration 文件

## 3. 标准变更流程

推荐顺序：

1. 修改 `lib/db/schema/**`
2. 如果需要，更新 `lib/db/schema/index.ts` 的 export / relations
3. 运行 `npm run db:generate`
4. 检查生成的迁移是否符合预期
5. 运行 `npm run db:migrate`
6. 补代码、测试与文档

## 4. 不要低估 schema 变更的 blast radius

在 Inkwell 中，schema 改动通常不只影响数据库层。

### 4.1 服务层
先检查相关读写逻辑是否也要跟着改：
- `lib/admin/**`
- `lib/blog/**`
- `lib/search/**`
- `lib/backup/**`

### 4.2 页面层
如果字段会出现在：
- 后台表单
- 前台详情页
- SEO / metadata
- 列表页筛选 / 排序

则对应 `app/**` 和 `components/**` 也要同步。

### 4.3 备份恢复
如果新增了业务表，通常还要检查：
- `lib/backup/export.ts`
- `lib/backup/import.ts`

否则会出现：
- 导出缺表
- 导入缺 restore order
- 新实体数据无法被恢复

### 4.4 搜索 / sitemap / 发布流程
如果 schema 变更影响的是公开发布内容，还要检查：
- 搜索索引结构
- `sitemap_entries`
- 定时发布流程
- slug / alias / SEO 数据

### 4.5 测试清理逻辑
Integration 测试当前有显式 cleanup 逻辑：
- `tests/integration/setup.ts`

新增实体后，若 integration 测试会创建这类数据，要检查是否也需要清理逻辑。

## 5. 新增一个表时建议检查的文件

以新增业务实体为例，常见需要检查：

### 核心数据库层
- `lib/db/schema/<entity>.ts`
- `lib/db/schema/index.ts`
- `drizzle.config.ts`
- `lib/db/migrations/**`

### 默认数据 / 初始化
- `scripts/seed.ts`

### 业务服务层
- `lib/admin/**`
- `lib/blog/**`
- `lib/search/**`
- `lib/backup/**`

### 页面与组件层
- `app/(admin)/**`
- `components/admin/**`
- `app/(blog)/**`
- `components/blog/**`

### 运维链路
- `scripts/**`
- `docs/deployment.md`
- `docs/release-checklist.md`

### 测试
- `tests/integration/**`
- `tests/browser/**`
- `tests/integration/setup.ts`

## 6. 典型影响面示例

### 6.1 如果新增公开内容实体
例如未来新增一种可公开展示的内容类型，要考虑：
- 后台 CRUD
- 公开路由
- sitemap
- 搜索索引
- 备份导出/恢复
- 浏览器测试
- 文档

### 6.2 如果只是给文章加字段
要考虑：
- 后台创建/编辑表单
- 更新服务层校验
- 前台显示
- SEO / 摘要 / search document 是否要携带该字段
- 旧数据默认值如何处理

### 6.3 如果新增一张管理型表
例如仅后台使用的管理实体，也要至少考虑：
- 后台模块
- 备份恢复
- integration cleanup
- release checklist

## 7. Migration 生成后的检查点

运行 `npm run db:generate` 后，不要立刻认为完成了。

至少检查：
- 新增/删除/修改的列是否符合预期
- 是否意外删除了已有结构
- 默认值是否合理
- 是否缺少应该存在的约束或索引

然后再执行：

```bash
npm run db:migrate
```

## 8. 本地验证建议

### 最低验证
```bash
npm run db:generate
npm run db:migrate
npm run type-check
npm run lint
npm run test
```

### 高风险 schema 变更建议追加
```bash
npm run test:integration
npm run test:browser
```

适用场景：
- 后台表单结构变更
- 公开页面数据结构变更
- 搜索 / 备份 / 恢复 / 发布链路变更

## 9. 回滚与恢复思路

当前仓库默认不鼓励手改 migration，因此出现问题时优先：
- 回到 schema 源定义修正
- 重新生成 migration
- 在本地重新验证

如果问题已经进入部署阶段，还要结合：
- 当前已执行的 migration
- 备份快照
- 数据兼容性
- 搜索索引是否需要重建

相关文档：
- `docs/deployment.md`
- `docs/release-checklist.md`

## 10. 文档同步要求

schema 变更后，至少检查：
- `docs/development.md`
- `docs/architecture.md`
- `docs/release-checklist.md`

若影响公开能力或运维链路，还要检查：
- `README.md`
- `docs/deployment.md`
- `docs/troubleshooting.md`
- `docs/faq.md`

## 11. 常见错误

- 只改 schema，不看 backup/export/import
- 忘记更新 `schema/index.ts`
- 忘记更新 seed
- 忘记更新 integration cleanup
- 忘记考虑公开页面、搜索或 sitemap 影响
- 以为 migration 生成成功就代表整个功能已经闭环

## 12. 推荐阅读顺序

如果你接下来要改 schema，建议按顺序读：

1. `docs/development.md`
2. 本文档 `docs/schema-and-migrations.md`
3. `docs/execution-boundaries.md`
4. `docs/testing-strategy.md`
5. `docs/release-checklist.md`

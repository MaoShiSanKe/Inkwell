# Inkwell 测试策略

本文档面向未来维护者与贡献者，说明 Inkwell 当前有哪些测试层，以及在不同类型改动下，最低应该跑哪些测试、优先补哪些测试。

## 1. 当前测试命令

仓库当前可用命令：

```bash
npm run test
npm run test:integration
npm run test:browser
```

对应关系：
- `npm run test`：Vitest 非 integration 测试
- `npm run test:integration`：数据库相关 integration 测试
- `npm run test:browser`：Playwright 浏览器回归

## 2. 测试层怎么分

### 2.1 单元 / 普通 Vitest
适合：
- 纯函数
- 工具逻辑
- 不依赖真实数据库的局部规则
- 快速回归

运行：
```bash
npm run test
```

### 2.2 Integration 测试
适合：
- 后台服务层写操作
- schema 变更后的真实数据库行为
- backup / restore / search / settings / admin 流程
- 需要验证真实表结构与数据一致性

运行：
```bash
npm run test:integration
```

### 2.3 Browser 测试
适合：
- 后台表单交互
- 登录流程
- 公开页面展示链路
- 自定义页面、设置变化、内容发布后的真实浏览器行为

运行：
```bash
npm run test:browser
```

## 3. 按改动类型选测试

### 3.1 文档改动
最低：
```bash
npm run docs:build
```

通常不需要跑应用测试，除非文档同时描述了你刚改过的真实行为，且你需要顺手验证代码链路。

### 3.2 README / 展示层小改动
最低：
```bash
npm run docs:build
```

### 3.3 前台页面或公开交互改动
至少：
```bash
npm run test
```

建议追加：
```bash
npm run test:browser
```

适用：
- 首页
- 文章页
- 搜索页
- 评论交互
- 点赞/浏览量
- 公开布局
- Theme Framework v1（品牌、首页 Hero、首页精选入口、首页列表变体、默认主题模式）

如果改动属于 Theme Framework v1，建议最少覆盖：
- 单元 / Vitest：`app/(blog)/page.test.tsx`、`app/(blog)/layout.test.tsx`、`app/(admin)/[adminPath]/layout.test.tsx`、`lib/theme.test.ts`
- Browser：`tests/browser/settings.spec.ts`、`tests/browser/theme-toggle.spec.ts`

因为这类改动往往同时影响：
- 后台 settings 表单
- 公开首页渲染
- 公开布局壳层
- localStorage 与 backend default 的主题优先级

### 3.4 后台页面 / 后台表单 / server action 改动
至少：
```bash
npm run test
npm run test:integration
```

如涉及真实交互流程，再追加：
```bash
npm run test:browser
```

### 3.5 设置系统改动
建议：
```bash
npm run test
npm run test:integration
npm run test:browser
```

因为设置可能同时影响：
- 后台 UI
- 公开页面
- 分析脚本
- 后台路径

### 3.6 schema / migration 改动
至少：
```bash
npm run test
npm run test:integration
```

如果影响公开或后台交互，再补：
```bash
npm run test:browser
```

### 3.7 搜索 / 备份恢复 / 定时发布 / 运维脚本改动
至少：
```bash
npm run test
npm run test:integration
```

适用：
- `lib/search/**`
- `lib/backup/**`
- `scripts/**`
- internal API

### 3.8 登录 / 鉴权 / 后台路径 / 部署行为改动
建议：
```bash
npm run test
npm run test:integration
npm run test:browser
```

因为这类改动通常是跨层风险。

## 4. Integration 测试的安全模型

当前 integration 测试有明确的安全保护，入口见：
- `tests/integration/setup.ts`

关键规则：
- 优先读取 `.env.test.local`
- 如果使用 `.env.test.local`，数据库名必须包含 `_test`
- 如果退回使用 `.env.local`，则只允许连接本地数据库 host
- cleanup 使用 `integration-test-` 前缀清理测试数据

这意味着：
- 不要随便拿生产/远端数据库跑 integration
- 新增 integration fixture 时，优先沿用 `integration-test-` 前缀策略

## 5. Browser 测试适合覆盖什么

优先补 browser 测试的场景：
- 登录或后台鉴权
- 后台 settings 表单
- 公开页面受后台内容影响的完整链路
- custom pages / friend links / media 等真实用户交互

可参考：
- `tests/browser/settings.spec.ts`
- `tests/browser/custom-pages.spec.ts`

## 6. 优先参考哪些现有测试

### 后台与服务层
- `tests/integration/admin/posts.integration.test.ts`
- `tests/integration/admin/settings.integration.test.ts`

### 搜索与运维链路
- `tests/integration/search/reindex.integration.test.ts`
- `tests/integration/backup/export.integration.test.ts`
- `tests/integration/backup/import.integration.test.ts`

### 浏览器回归
- `tests/browser/settings.spec.ts`
- `tests/browser/custom-pages.spec.ts`

## 7. 推荐验证等级

### Level 1：低风险
适用：
- 文档
- 小型只读页面改动
- 非关键文案调整

建议：
```bash
npm run test
```
或文档只跑：
```bash
npm run docs:build
```

### Level 2：标准功能改动
适用：
- 后台模块
- 服务层逻辑
- schema 轻量变更
- 搜索/备份逻辑变更

建议：
```bash
npm run test
npm run test:integration
```

### Level 3：高风险跨层改动
适用：
- 鉴权
- settings
- 后台路径
- 公开渲染链路
- 部署行为

建议：
```bash
npm run test
npm run test:integration
npm run test:browser
```

## 8. 新增测试时的建议

新增功能时，优先考虑：
- 业务规则放在哪一层，就从哪一层开始补测试
- 如果会影响真实数据库状态，补 integration
- 如果会影响真实浏览器交互，补 browser

不要只补最容易写的一层测试，而忽略真正有风险的层。

## 9. 改动后除了测试还要验证什么

视改动内容，还要同步检查：
- `npm run type-check`
- `npm run lint`
- `npm run docs:build`
- 文档是否同步更新

发布前检查可参考：
- `docs/release-checklist.md`

## 10. 常见错误

- 只跑 `npm run test` 就认为后台写操作没问题
- schema 变更后不跑 integration
- settings / 登录 / 公开交互改动后不跑 browser
- 在不安全的数据库连接上执行 integration
- 写了新功能但没有更新文档中的验证建议

## 11. 推荐阅读顺序

如果你在做功能改动并且不确定该跑什么测试，建议按顺序看：

1. `docs/development.md`
2. 本文档 `docs/testing-strategy.md`
3. `docs/release-checklist.md`
4. 相关功能的现有 integration/browser tests

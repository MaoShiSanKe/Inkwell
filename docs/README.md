# Inkwell 文档索引

本目录存放 **仓库内一手文档**。

当前仓库已经有独立文档站：
- 文档站：`https://maoshisanke.github.io/Inkwell/`
- 展示层：`VitePress + GitHub Pages`
- 事实来源：仓库中的 Markdown

因此这里的目标不是再维护第二份说明，而是让你在仓库内也能快速找到：
- 该先读哪份文档
- 改某类能力时该看哪里
- 改完后至少要验证什么
- 哪些改动必须同步文档

## 1. 建议怎么使用这份索引

如果你只是第一次来到仓库，先从：
1. [`../README.md`](../README.md)
2. [`deployment.md`](deployment.md)
3. 本文档 `docs/README.md`

如果你是未来的维护者、贡献者或很久之后回来的自己，建议把这里当作：
- 文档导航页
- 维护入口页
- change type → 文档入口 的跳转表

## 2. 按目标选择阅读路径

### 2.1 第一次了解 Inkwell
1. [`../README.md`](../README.md)
2. [`faq.md`](faq.md)
3. [`deployment.md`](deployment.md)

### 2.2 准备本地开发
1. [`development.md`](development.md)
2. [`environment.md`](environment.md)
3. [`architecture.md`](architecture.md)

### 2.3 长时间搁置后重新接手
1. [`../README.md`](../README.md)
2. [`deployment.md`](deployment.md)
3. [`troubleshooting.md`](troubleshooting.md)
4. [`architecture.md`](architecture.md)
5. [`development.md`](development.md)
6. [`release-checklist.md`](release-checklist.md)

### 2.4 准备扩展功能或提交 PR
1. [`development.md`](development.md)
2. [`architecture.md`](architecture.md)
3. [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
4. 再按改动类型进入下方对应详细手册

## 3. 当前文档地图

### 3.1 项目与部署
- [`../README.md`](../README.md)
  - 项目定位、能力边界、快速开始、常用命令
- [`deployment.md`](deployment.md)
  - VPS / Docker 部署、HTTPS、运维命令、生产注意事项
- [`upgrade-and-rollback.md`](upgrade-and-rollback.md)
  - 版本升级、失败回滚、恢复顺序与 smoke 建议
- [`operations-reference.md`](operations-reference.md)
  - CLI、internal API、恢复命令与高频运维索引
- [`troubleshooting.md`](troubleshooting.md)
  - 构建失败、登录异常、搜索与恢复问题排查
- [`faq.md`](faq.md)
  - 项目定位、部署方式、成熟度、文档站现状

### 3.2 开发与维护总览
- [`architecture.md`](architecture.md)
  - 系统分层、执行边界、核心链路、source of truth
- [`development.md`](development.md)
  - 本地开发流程、change type 入口、最低验证建议
- [`environment.md`](environment.md)
  - `.env` 与 `settings` 边界、secret 维护规则、配置排查
- [`release-checklist.md`](release-checklist.md)
  - 发布前检查、专项变更检查、上线后 smoke
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
  - 贡献流程、最小验证、文档同步与敏感信息规则

### 3.3 扩展指南
- [`admin-extension-workflow.md`](admin-extension-workflow.md)
  - 如何新增/改造后台模块
- [`settings-system.md`](settings-system.md)
  - 如何新增 DB-backed setting，哪些配置不该进 `settings`
- [`schema-and-migrations.md`](schema-and-migrations.md)
  - schema 改动的 blast radius、迁移流程、连带影响
- [`execution-boundaries.md`](execution-boundaries.md)
  - server action / route handler / CLI / service layer 如何分工
- [`testing-strategy.md`](testing-strategy.md)
  - 改完后至少该跑哪些测试、什么时候补 integration/browser

### 3.4 文档体系
- [`ROADMAP.md`](ROADMAP.md)
  - 文档体系演进方向与 docs site 定位

## 4. 如果你要改 X，从哪里开始看

| 你的改动 | 先看哪份总览 | 再看哪份详细手册 | 最低还要检查什么 |
| --- | --- | --- | --- |
| 新增后台模块、扩展后台 CRUD | [`development.md`](development.md) | [`admin-extension-workflow.md`](admin-extension-workflow.md) | [`testing-strategy.md`](testing-strategy.md)、[`release-checklist.md`](release-checklist.md) |
| 新增站点设置、调整后台设置页 | [`environment.md`](environment.md) | [`settings-system.md`](settings-system.md) | [`testing-strategy.md`](testing-strategy.md)、[`release-checklist.md`](release-checklist.md) |
| 改 schema / relation / migration | [`development.md`](development.md) | [`schema-and-migrations.md`](schema-and-migrations.md) | [`testing-strategy.md`](testing-strategy.md)、[`release-checklist.md`](release-checklist.md) |
| 判断该用 server action、API 还是 CLI | [`architecture.md`](architecture.md) | [`execution-boundaries.md`](execution-boundaries.md) | 对应入口层文档与测试 |
| 不确定该跑什么测试 | [`development.md`](development.md) | [`testing-strategy.md`](testing-strategy.md) | [`release-checklist.md`](release-checklist.md) |
| 改部署、HTTPS、systemd、反向代理 | [`deployment.md`](deployment.md) | [`troubleshooting.md`](troubleshooting.md) | [`release-checklist.md`](release-checklist.md) |
| 做版本升级、失败回滚、恢复站点 | [`deployment.md`](deployment.md) | [`upgrade-and-rollback.md`](upgrade-and-rollback.md) | [`release-checklist.md`](release-checklist.md)、[`troubleshooting.md`](troubleshooting.md) |
| 查 CLI、internal API、恢复命令 | [`deployment.md`](deployment.md) | [`operations-reference.md`](operations-reference.md) | [`release-checklist.md`](release-checklist.md) |
| 改搜索、备份恢复、定时发布 | [`architecture.md`](architecture.md) | [`execution-boundaries.md`](execution-boundaries.md) | [`testing-strategy.md`](testing-strategy.md)、[`deployment.md`](deployment.md) |
| 改文档站导航或仓库文档结构 | 本文档 | [`ROADMAP.md`](ROADMAP.md) | `npm run docs:build` |

## 5. 维护时的最小原则

### 5.1 先看总览，再看专项手册
高层文档负责告诉你“去哪改、影响到哪里”；详细手册负责告诉你“具体怎么改”。

### 5.2 仓库 Markdown 是 source of truth
不要在 docs site 再维护第二份正文。

### 5.3 改代码时同步改文档
只要行为、入口、配置、验证方式发生变化，就应该同步更新对应文档。

### 5.4 不确定验证范围时，先看测试策略与发布检查
优先参考：
- [`testing-strategy.md`](testing-strategy.md)
- [`release-checklist.md`](release-checklist.md)

## 6. 文档站与仓库文档的分工

当前采用两层结构：

### 第 1 层：仓库内文档
适合：
- 与代码版本强绑定的说明
- 开发者与维护者必须了解的规则
- PR 必须同步更新的一手事实

### 第 2 层：独立文档站
适合：
- 展示、导航、搜索
- 更舒服的阅读体验
- 面向公开访客的入口聚合

结论：
> **先更新仓库 Markdown，再让 docs site 展示它。**

## 7. 当前推荐阅读顺序

如果你现在就要继续维护 Inkwell，推荐按顺序读：

1. [`../README.md`](../README.md)
2. [`deployment.md`](deployment.md)
3. [`architecture.md`](architecture.md)
4. [`development.md`](development.md)
5. 按改动类型进入对应详细手册
6. 发版前回到 [`release-checklist.md`](release-checklist.md)

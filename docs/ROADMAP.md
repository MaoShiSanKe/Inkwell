# Inkwell 文档体系路线图

本文档用于说明：
- 为什么当前需要升级文档体系
- 为什么建议建设独立文档站
- 当前已经完成到什么阶段
- 接下来还值得继续补哪些文档

## 1. 当前文档现状判断

当前仓库已经具备：
- 一个可用的 `README.md`
- 一份较完整的 `docs/deployment.md`
- 已实测验证过的部署、HTTPS、备份恢复、搜索重建链路
- 独立文档站（GitHub Pages + VitePress）
- 面向未来维护者的高层开发文档
- 面向扩展工作的专项维护手册

这意味着当前的主要问题，已经不再是“有没有文档”，而是：
> **哪些文档还不够细，哪些维护/扩展场景还缺少可执行说明。**

## 2. 为什么仍然需要独立文档站

当项目开始面向公众开放时，文档通常会承担三类角色：

1. **项目介绍页**
   - 让访客快速理解项目是什么、适合谁、为什么存在

2. **操作手册**
   - 安装、配置、部署、升级、迁移、恢复

3. **知识门户**
   - FAQ、Troubleshooting、架构说明、最佳实践、维护入口

如果这些内容继续全部塞在单个 README 或少量 Markdown 中，会遇到问题：
- 导航困难
- 搜索体验差
- 页面层级不清晰
- 面向陌生读者的可读性不足
- 后续文档持续演进时难以维护

因此，**独立文档站仍然是合理且必要的展示层**。

## 3. 当前方案为什么仍然是 VitePress

### 推荐结论：继续使用 `VitePress`

原因：
1. **与当前技术栈契合**
   - 项目主栈是 Node.js / Next.js / 前端工程生态
   - VitePress 同属现代前端文档工具链，维护成本低

2. **Markdown-first，迁移成本低**
   - 当前仓库文档本身就是 Markdown
   - 从 `README.md` / `docs/*.md` 接入展示层非常自然

3. **足够支持当前文档需求**
   - 本地搜索
   - 清晰导航
   - 静态部署简单
   - 适合项目介绍、开发文档、部署文档、维护文档

4. **当前阶段无需更重平台**
   - 现在更重要的是继续补内容，而不是迁移到更重的文档系统

### 为什么现在不优先换 Docusaurus
- 多版本文档需求还不强
- 社区规模与插件需求还没有大到必须上更重平台
- 当前瓶颈在内容密度与维护质量，而不是框架能力

## 4. 当前信息架构现状

当前 docs site / 仓库文档已经基本形成以下结构：

### 项目入口
- `README.md`
- `docs/README.md`

### 部署与运维
- `docs/deployment.md`
- `docs/troubleshooting.md`
- `docs/faq.md`
- `docs/release-checklist.md`

### 开发与维护总览
- `docs/architecture.md`
- `docs/development.md`
- `docs/environment.md`
- `CONTRIBUTING.md`

### 扩展指南
- `docs/admin-extension-workflow.md`
- `docs/settings-system.md`
- `docs/schema-and-migrations.md`
- `docs/execution-boundaries.md`
- `docs/testing-strategy.md`

这说明文档结构已经从“零散 Markdown”进入了“可导航的维护手册体系”。

## 5. 仓库文档与 docs site 的分工

### 保留在仓库中的内容
这些内容应始终留在仓库内：
- `README.md`
- `docs/deployment.md`
- `docs/README.md`
- `docs/ROADMAP.md`
- 与代码版本强绑定的说明
- PR 必须同步更新的一手事实
- 面向维护者的操作型手册

### docs site 负责的内容
- 展示
- 导航
- 搜索
- 对外阅读体验

原则仍然是：
> **仓库文档负责“可信的一手事实”，文档站负责“对外可读的完整体验”。**

## 6. 已完成的阶段

### 阶段 1：整理仓库内文档
已完成：
- README 已作为对外首页入口
- `docs/` 目录已具备索引
- 部署与运维文档已可直接指导工程师部署

### 阶段 2：建立 VitePress 文档站展示层
已完成：
- 使用 `VitePress`
- 使用 `GitHub Pages`
- 仓库 Markdown 继续作为 source of truth
- 文档站负责导航、搜索与展示

### 阶段 3：补齐开发接手与维护入口
已完成：
- `docs/architecture.md`
- `docs/development.md`
- `docs/environment.md`
- `docs/release-checklist.md`
- `CONTRIBUTING.md`
- `docs/README.md` 的维护者导航能力增强

### 阶段 4：补齐扩展工作流专项手册
已完成：
- 后台模块扩展：`docs/admin-extension-workflow.md`
- 设置系统：`docs/settings-system.md`
- Schema 与迁移：`docs/schema-and-migrations.md`
- 执行边界：`docs/execution-boundaries.md`
- 测试策略：`docs/testing-strategy.md`
- docs site 导航已同步暴露这些手册

## 7. 当前优先事项

当前更值得继续补的内容是：

### 7.1 部署与运维继续下沉
- Nginx / Caddy 更完整示例
- 更细的运维排障案例

说明：
- `升级与回滚流程` 已补到 `docs/upgrade-and-rollback.md`
- `参考命令与日常维护索引` 已补到 `docs/operations-reference.md`

当前这条线更适合继续补：
- 更细的巡检/排障案例
- 反向代理示例
- 更系统的监控与日志说明

### 7.2 公开入口继续打磨
- 文档首页与上手路径继续打磨
- README 与 docs 首页继续减少“知道文档存在”和“找到合适文档”之间的摩擦

### 7.3 长期维护参考继续补齐
优先考虑未来仍可能缺的参考型文档，例如：
- 参考命令清单
- internal API / CLI 能力索引
- 常见维护决策记录

## 8. 不再优先做什么

当前阶段不优先：
- 迁移到更重的 docs framework
- 建版本化文档体系
- 为文档站再维护一套独立正文
- 只做展示层 polish 而不补事实型文档

## 9. 最终建议

如果目标是：
> 把 Inkwell 做成一个既能公开展示、又能在未来继续维护的成熟仓库

最合理的路线是：
- **现在**：继续以仓库 Markdown 为 source of truth，补最缺的维护/部署文档
- **下一阶段**：继续补部署升级、回滚、排障与参考索引
- **之后**：再根据社区规模决定是否要版本化文档或引入更重的文档平台

这条路线能兼顾：
- 当前交付效率
- 长期维护成本
- 面向外部读者的文档体验

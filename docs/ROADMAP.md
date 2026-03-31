# Inkwell 文档体系路线图

本文档用于说明：

- 为什么当前需要升级文档体系
- 为什么建议建设独立文档站
- 推荐使用什么框架
- 仓库内文档与未来 docs site 如何分工

## 1. 当前文档现状判断

当前仓库已经具备：

- 一个可用的 `README.md`
- 一份较完整的 `docs/deployment.md`
- 已实测验证过的部署、HTTPS、备份恢复、搜索重建链路

但如果目标是：

> 面向大众开放、支持陌生开发者独立部署和理解项目

当前文档仍然存在明显不足：

- README 不够像公开项目首页
- 文档入口不集中
- 缺少 FAQ / Troubleshooting / Upgrade Guide
- 缺少“文档站级别”的导航、搜索、层级化信息架构
- 还没有版本化文档策略

## 2. 为什么建议做独立文档站

当项目开始面向公众开放时，文档通常会承担三类角色：

1. **项目介绍页**
   - 让访客快速理解项目是什么、适合谁、为什么存在

2. **操作手册**
   - 安装、配置、部署、升级、迁移、恢复

3. **知识门户**
   - FAQ、Troubleshooting、架构说明、版本差异、最佳实践

这些内容继续全部塞在单个 README 或少量 markdown 文件中，会遇到问题：

- 导航困难
- 搜索体验差
- 页面层级不清晰
- 面向大众的可读性不够
- 后续版本演进时难以维护

因此，**独立文档站是合理且必要的下一阶段建设目标**。

## 3. 推荐框架

### 推荐结论：优先选择 `VitePress`

原因：

1. **与当前技术栈契合**
   - 项目主栈是 Node.js / Next.js / 前端工程生态
   - VitePress 同属现代前端文档工具链，维护成本低

2. **Markdown-first，迁移成本低**
   - 当前仓库文档本身就是 Markdown
   - 从 `README.md` / `docs/*.md` 迁移过去非常自然

3. **足够支持公开文档站需求**
   - 本地搜索
   - 国际化配置
   - 自定义主题
   - 静态部署简单
   - 适合产品文档、开发文档、部署文档

4. **风格偏轻量，适合当前阶段**
   - 当前项目更需要“快速形成一套优秀文档门户”
   - 而不是先投入大量精力建设一套重型文档系统

### 为什么不是优先 Docusaurus

Docusaurus 也很强，尤其适合：

- 多版本文档
- 大规模社区型项目
- Blog + Docs 一体化门户
- React / MDX 深度定制

但对 Inkwell 当前阶段来说：

- 维护成本更高
- 工程复杂度更高
- 当前文档规模还没有大到必须先上更重的平台

所以建议：

- **当前阶段：VitePress 优先**
- **若未来出现多版本文档、插件生态、社区协作需求显著增长，再评估 Docusaurus**

## 4. 推荐的信息架构

未来 docs site 建议采用如下结构：

### Getting Started
- What is Inkwell?
- Quick Start
- Self-Hosting Overview
- Project Status

### Guides
- Local Development
- Content Management Workflow
- Search Setup
- Backup and Restore
- Scheduled Publishing
- Media Management

### Deployment
- Linux VPS Deployment
- Docker / Compose Deployment
- Reverse Proxy
- HTTPS / Certificates
- Environment Variables
- Upgrade Guide

### Operations
- Search Reindex
- Backup Export / Import
- Health Check
- Troubleshooting
- FAQ

### Reference
- Environment Variables
- CLI Commands
- Internal API Endpoints
- Data / Storage Notes

## 5. 仓库文档与未来 docs site 的分工

### 保留在仓库中的内容
这些内容应始终留在仓库内：

- `README.md`
- `docs/deployment.md`
- `docs/README.md`
- `docs/ROADMAP.md`
- 与代码版本强绑定的说明
- PR 必须同步更新的一手说明

### 更适合迁移到独立文档站的内容
- 多步骤教程
- 面向最终用户的完整使用文档
- FAQ
- 故障排查
- 最佳实践
- 升级指南
- 多场景部署示例

原则是：

> **仓库文档负责“可信的一手事实”，文档站负责“对外可读的完整体验”。**

## 6. 推荐迁移策略

建议按三阶段推进：

### 阶段 1：先把仓库内文档整理好
目标：

- README 成为对外首页
- docs 目录具备清晰索引
- 部署与运维文档可直接指导工程师部署

当前已经在做这一阶段。

### 阶段 2：建立 VitePress 文档站骨架
建议未来单独建一个文档站目录或独立仓库，例如：

- `docs-site/`（同仓库）
- 或独立仓库 `inkwell-docs`

首批迁移内容：

- Quick Start
- Deployment
- Backup / Restore
- Search
- FAQ

### 阶段 3：形成正式公开文档门户
目标：

- 搜索
- 导航
- SEO
- 多页教程
- 版本演进策略
- 对外公开部署说明

## 7. 现在仓库里应优先补的文档项

在真正开建 docs site 之前，仓库内建议优先继续补：

1. `docs/deployment.md`
   - Nginx 示例
   - certbot / HTTPS 示例
   - 故障排查

2. `README.md`
   - 更完整的功能概览
   - 快速开始
   - 文档导航

3. 新增 FAQ / Troubleshooting
   - 后台登录问题
   - standalone 静态资源 404
   - 低内存构建 OOM
   - 搜索重建问题
   - 备份导入常见报错

## 8. 最终建议

如果你的目标是：

> 把 Inkwell 做成一个像成熟项目那样“看起来就能用、文档也像产品”的公开仓库

最合理的路线是：

- **现在**：先把仓库内文档做扎实
- **下一阶段**：采用 **VitePress** 建独立文档站
- **之后**：将部署、使用、运维与 FAQ 正式迁移为公开门户

这条路线能兼顾：

- 当前交付效率
- 长期维护成本
- 面向大众的文档体验

# Inkwell 文档索引

本目录用于存放 **仓库内一手文档**。

目标不是替代未来的独立文档站，而是保证：

- 仓库访客可以直接获得必要信息
- 开发者在本仓库内即可完成开发与部署
- 后续迁移到独立文档站时，有清晰的内容来源与结构基础

## 当前文档结构

### 面向仓库首页访客
- [`../README.md`](../README.md)
  - 项目定位
  - 核心能力
  - 快速开始
  - 常用命令
  - 部署入口

### 面向部署与运维
- [`deployment.md`](deployment.md)
  - Linux VPS 宿主机部署
  - Docker / Compose 单机部署
  - HTTPS / certbot / Nginx 说明
  - 搜索重建、备份恢复、定时发布运维流程

### 面向故障排查
- [`troubleshooting.md`](troubleshooting.md)
  - standalone 静态资源 404
  - HTTPS / Secure cookie 登录问题
  - 低内存构建 OOM
  - 搜索重建与备份恢复常见问题

### 面向常见问题
- [`faq.md`](faq.md)
  - 项目定位
  - Docker / VPS 选择
  - HTTPS 与证书责任边界
  - 当前上线成熟度判断

### 面向贡献者
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
  - 开发环境
  - 提交前检查
  - 文档同步规则
  - 敏感信息与部署改动注意事项

### 面向未来文档站规划
- [`ROADMAP.md`](ROADMAP.md)
  - 独立文档站目标
  - 推荐框架
  - 信息架构建议
  - 仓库文档与 docs site 的分工

## 推荐阅读顺序

### 如果你是第一次接触 Inkwell
1. 先看 [`../README.md`](../README.md)
2. 再看 [`deployment.md`](deployment.md)
3. 最后看 [`ROADMAP.md`](ROADMAP.md)

### 如果你要自己部署博客
1. [`../README.md`](../README.md)
2. [`deployment.md`](deployment.md)

### 如果你要参与文档体系建设
1. [`ROADMAP.md`](ROADMAP.md)
2. [`deployment.md`](deployment.md)
3. 回到 [`../README.md`](../README.md) 做首页导航对齐

## 当前文档策略

当前采用“两层结构”：

### 第 1 层：仓库内文档
适合：

- 项目首页介绍
- 安装与快速开始
- 部署与运维一手说明
- 开发者必需信息

特点：

- 和代码一起版本化
- PR 同步更新
- 适合做事实来源与最小完备说明

### 第 2 层：未来独立文档站
适合：

- 面向大众的完整使用手册
- 多页教程 / FAQ / 故障排查
- 版本化文档
- 搜索、导航、SEO、国际化

当前仓库尚未引入文档站框架代码；先完成仓库内内容结构，再迁移到独立站点更稳妥。

## 当前主要缺口

虽然现在的文档已经足以支撑工程师部署和验证，但如果目标是面向大众公开发布，仍建议优先补齐：

- 更细的部署步骤拆解
- Nginx / Caddy 反向代理示例
- HTTPS / 证书续期章节
- 常见故障排查
- 首次初始化与升级流程
- FAQ

这些内容将优先沉淀在仓库文档中，再迁移到未来 docs site。

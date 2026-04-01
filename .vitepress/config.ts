import { defineConfig } from "vitepress";

const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  lang: "zh-CN",
  title: "Inkwell",
  description: "面向自托管场景的博客 CMS / Publishing System 文档站。",
  base: isGitHubActions ? "/Inkwell/" : "/",
  srcExclude: [
    "**/node_modules/**",
    "**/.git/**",
    "**/.claude/**",
    "**/.ace-tool/**",
    "CLAUDE.md",
  ],
  cleanUrls: true,
  sitemap: {
    hostname: "https://maoshisanke.github.io/Inkwell/",
  },
  rewrites: {
    "README.md": "index.md",
    "docs/README.md": "docs/index.md",
    "CONTRIBUTING.md": "community/contributing.md",
  },
  themeConfig: {
    search: {
      provider: "local",
    },
    nav: [
      { text: "首页", link: "/" },
      { text: "文档", link: "/docs/" },
      { text: "部署", link: "/docs/deployment" },
      { text: "开发", link: "/docs/architecture" },
      { text: "扩展", link: "/docs/admin-extension-workflow" },
      { text: "贡献", link: "/community/contributing" },
      { text: "GitHub", link: "https://github.com/MaoShiSanKe/Inkwell" },
    ],
    sidebar: [
      {
        text: "开始",
        items: [
          { text: "项目首页", link: "/" },
          { text: "文档索引", link: "/docs/" },
          { text: "路线图", link: "/docs/ROADMAP" },
        ],
      },
      {
        text: "部署与运维",
        items: [
          { text: "部署说明", link: "/docs/deployment" },
          { text: "升级与回滚", link: "/docs/upgrade-and-rollback" },
          { text: "运维参考", link: "/docs/operations-reference" },
          { text: "反向代理示例", link: "/docs/reverse-proxy-examples" },
          { text: "监控与日志", link: "/docs/monitoring-and-logs" },
          { text: "长期维护参考", link: "/docs/long-term-maintenance" },
          { text: "首次部署验收", link: "/docs/first-deployment-checklist" },
          { text: "故障排查", link: "/docs/troubleshooting" },
          { text: "FAQ", link: "/docs/faq" },
        ],
      },
      {
        text: "开发与维护",
        items: [
          { text: "架构总览", link: "/docs/architecture" },
          { text: "开发指南", link: "/docs/development" },
          { text: "环境配置", link: "/docs/environment" },
          { text: "测试策略", link: "/docs/testing-strategy" },
          { text: "发布检查", link: "/docs/release-checklist" },
          { text: "维护决策参考", link: "/docs/maintenance-decisions" },
          { text: "现场信息模板", link: "/docs/maintenance-field-template" },
          { text: "贡献指南", link: "/community/contributing" },
        ],
      },
      {
        text: "扩展指南",
        items: [
          { text: "后台模块扩展", link: "/docs/admin-extension-workflow" },
          { text: "设置系统", link: "/docs/settings-system" },
          { text: "Schema 与迁移", link: "/docs/schema-and-migrations" },
          { text: "执行边界", link: "/docs/execution-boundaries" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/MaoShiSanKe/Inkwell" }],
    editLink: {
      pattern: "https://github.com/MaoShiSanKe/Inkwell/edit/master/:path",
      text: "在 GitHub 上编辑此页",
    },
    docFooter: {
      prev: "上一页",
      next: "下一页",
    },
    outline: {
      label: "本页目录",
    },
    lastUpdated: {
      text: "最后更新",
    },
  },
});

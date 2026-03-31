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
          { text: "故障排查", link: "/docs/troubleshooting" },
          { text: "FAQ", link: "/docs/faq" },
        ],
      },
      {
        text: "开发与贡献",
        items: [
          { text: "架构总览", link: "/docs/architecture" },
          { text: "开发指南", link: "/docs/development" },
          { text: "环境配置", link: "/docs/environment" },
          { text: "发布检查", link: "/docs/release-checklist" },
          { text: "贡献指南", link: "/community/contributing" },
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

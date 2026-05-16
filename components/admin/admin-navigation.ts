export type AdminNavigationSection = "content" | "taxonomy" | "engagement" | "system";

export type AdminNavigationItem = {
  key: string;
  label: string;
  description: string;
  href: (adminPath: string) => string;
  section: AdminNavigationSection;
  dashboard?: boolean;
};

const adminHref = (adminPath: string, path = "") => `/${adminPath}${path}`;

export const adminNavigationItems: AdminNavigationItem[] = [
  {
    key: "posts",
    label: "文章管理",
    description: "查看当前文章列表，并继续进入创建、编辑等内容管理流程。",
    href: (adminPath) => adminHref(adminPath, "/posts"),
    section: "content",
    dashboard: true,
  },
  {
    key: "posts-new",
    label: "新建文章",
    description: "创建新的草稿或直接发布文章，并自动写入初始修订记录。",
    href: (adminPath) => adminHref(adminPath, "/posts/new"),
    section: "content",
    dashboard: true,
  },
  {
    key: "pages",
    label: "页面管理",
    description: "管理关于页、联系页等独立页面，补齐站点固定内容。",
    href: (adminPath) => adminHref(adminPath, "/pages"),
    section: "content",
    dashboard: true,
  },
  {
    key: "friend-links",
    label: "友链管理",
    description: "维护结构化友链列表，控制公开友链页的展示顺序、描述与 Logo。",
    href: (adminPath) => adminHref(adminPath, "/friend-links"),
    section: "content",
    dashboard: true,
  },
  {
    key: "media",
    label: "媒体库",
    description: "上传本地图片或登记外链图片，并为文章 SEO 分享图提供统一选择入口。",
    href: (adminPath) => adminHref(adminPath, "/media"),
    section: "content",
    dashboard: true,
  },
  {
    key: "comments",
    label: "评论管理",
    description: "查看前台评论审核队列，完成批准、垃圾标记与回收站恢复操作。",
    href: (adminPath) => adminHref(adminPath, "/comments"),
    section: "engagement",
    dashboard: true,
  },
  {
    key: "categories",
    label: "分类管理",
    description: "管理文章分类与两级层级结构，支撑前台分类归档和文章归类。",
    href: (adminPath) => adminHref(adminPath, "/categories"),
    section: "taxonomy",
    dashboard: true,
  },
  {
    key: "tags",
    label: "标签管理",
    description: "管理文章标签，供标签归档页和文章编辑表单统一复用。",
    href: (adminPath) => adminHref(adminPath, "/tags"),
    section: "taxonomy",
    dashboard: true,
  },
  {
    key: "series",
    label: "系列管理",
    description: "管理系列信息，先补齐后台内容组织能力与文章关联入口。",
    href: (adminPath) => adminHref(adminPath, "/series"),
    section: "taxonomy",
    dashboard: true,
  },
  {
    key: "site-navigation",
    label: "站点导航",
    description: "管理公开页头导航入口，控制文案、顺序、是否显示与打开方式。",
    href: (adminPath) => adminHref(adminPath, "/site-navigation"),
    section: "system",
    dashboard: true,
  },
  {
    key: "settings",
    label: "后台设置",
    description: "配置后台路径、修订保留策略、自动摘要长度和评论默认审核模式。",
    href: (adminPath) => adminHref(adminPath, "/settings"),
    section: "system",
    dashboard: true,
  },
  {
    key: "subscribers",
    label: "订阅者管理",
    description: "查看公开邮件订阅列表，并在需要时移除订阅者。",
    href: (adminPath) => adminHref(adminPath, "/subscribers"),
    section: "engagement",
    dashboard: true,
  },
  {
    key: "ip-blacklist",
    label: "IP 黑名单",
    description: "管理被应用层直接拦截的 IP 与 CIDR 网段，快速阻断恶意访问来源。",
    href: (adminPath) => adminHref(adminPath, "/ip-blacklist"),
    section: "system",
    dashboard: true,
  },
];

export const dashboardNavigationItems = adminNavigationItems.filter((item) => item.dashboard);

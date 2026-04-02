# Inkwell Theme Framework v1

本文档说明 Inkwell 当前的 Theme Framework v1 已经覆盖哪些能力、为什么这样设计，以及未来维护时应该如何扩展。

## 1. 当前定义

Theme Framework v1 不是多主题市场、也不是页面搭建器。

当前它的定义是：

> **一套由后台 DB-backed settings 驱动的公开站点展示配置层。**

它解决的是：
- 站点品牌展示
- 首页 Hero 与主 CTA
- 首页文章列表展示变体
- 公开布局宽度 / 表面风格 / 强调色
- 默认主题模式
- 页头 / 页脚的结构化展示

它不解决的是：
- 多主题安装 / 激活系统
- 页面 section builder
- 导航菜单管理器
- 任意设计 token 编辑器
- 插件式主题扩展生态

## 2. 当前能力范围

### 2.1 品牌与首页 Hero
由以下 settings 驱动：
- `site_brand_name`
- `site_tagline`
- `home_hero_title`
- `home_hero_description`
- `home_primary_cta_label`
- `home_primary_cta_url`
- `home_featured_links_title`
- `home_featured_links_description`
- `home_featured_link_1_label`
- `home_featured_link_1_url`
- `home_featured_link_1_description`
- `home_featured_link_2_label`
- `home_featured_link_2_url`
- `home_featured_link_2_description`
- `home_featured_link_3_label`
- `home_featured_link_3_url`
- `home_featured_link_3_description`

当前行为补充：
- 首页 Hero 下方可渲染一个固定的精选入口区块
- 三张入口卡片仅在同时配置了文案与链接时渲染
- 入口卡片继续复用公开站点的表面样式与强调色映射

当前生效位置：
- `app/(blog)/page.tsx`
- `app/(blog)/layout.tsx`
- `app/(admin)/[adminPath]/layout.tsx`
- `app/layout.tsx`

### 2.2 首页文章列表展示
由以下 settings 驱动：
- `home_posts_variant` → `comfortable | compact`
- `home_show_post_excerpt`
- `home_show_post_author`
- `home_show_post_category`
- `home_show_post_date`

当前行为：
- `comfortable` 使用更宽松的卡片 padding、元信息字号与摘要节奏
- `compact` 使用更紧凑的卡片布局
- 各展示开关直接控制首页文章卡片中的摘要 / 作者 / 分类 / 发布时间是否渲染

### 2.3 公开布局壳层
由以下 settings 驱动：
- `public_layout_width`
- `public_surface_variant`
- `public_accent_theme`
- `public_header_show_tagline`
- `public_footer_blurb`
- `public_footer_copyright`

当前行为：
- 页头品牌区与页脚说明区已结构化
- 首页与公开布局共享宽度 / 表面 / 强调色映射
- `public_custom_css` 仍保留为 escape hatch

### 2.4 默认主题模式
由以下 setting 驱动：
- `public_theme_default_mode` → `system | light | dark`

优先级规则：
1. 访客浏览器 `localStorage`
2. 后台 `public_theme_default_mode`
3. 系统 `prefers-color-scheme`

当前行为：
- `ThemeScript` 在根布局应用初始主题
- `ThemeToggle` 在 public/admin 布局中遵循同一优先级
- 用户手动切换后会把结果写入 `localStorage`

## 3. 当前实现位置

主题框架 v1 的核心实现分布在：
- `lib/settings-config.ts` — 主题 settings 定义与默认值
- `lib/settings.ts` — `getThemeFrameworkSettings()`
- `lib/theme.ts` — 主题辅助函数与主题模式优先级解析
- `components/admin/settings-form.tsx` — 后台配置 UI
- `components/theme-script.tsx` — 根布局主题初始化
- `components/theme-toggle.tsx` — 浏览器主题切换
- `components/blog/site-header.tsx` — 结构化页头
- `components/blog/site-footer.tsx` — 结构化页脚
- `app/(blog)/layout.tsx` — 公开布局壳层接线
- `app/(blog)/page.tsx` — 首页主题化

## 4. 为什么当前只做到 v1

当前项目方向仍然是：
- 前端静态、后端动态的 CMS 博客
- 单主题、多变体
- 借鉴 WordPress 的“主题设置页”思路
- 优先后台可配置，而不是平台化

如果现在直接做多主题系统，会立刻引入：
- 主题生命周期
- 主题兼容矩阵
- 更复杂的资源组织
- 更重的测试与文档负担

因此 v1 的正确边界是：

> **先把首页与公开外壳做成结构化、可配置、可维护的主题层。**

## 5. 测试与验证要求

Theme Framework v1 涉及公开渲染链路与 settings，因此默认按高风险跨层改动处理。

建议最少验证：
```bash
npm run type-check
npm run test
npm run test:integration
npm run test:browser
```

当前已覆盖的代表性测试：
- `app/(blog)/layout.test.tsx`
- `app/(blog)/page.test.tsx`
- `app/(admin)/[adminPath]/layout.test.tsx`
- `lib/theme.test.ts`
- `tests/integration/admin/settings.integration.test.ts`
- `tests/browser/theme-toggle.spec.ts`
- `tests/browser/settings.spec.ts`

## 6. 后续扩展建议

如果后续继续做 Theme Framework v2，优先考虑：
- 首页更多固定区块的结构化配置
- 列表页 / 归档页的有限展示变体
- 更清晰的公共容器与卡片样式映射
- 文档中补更明确的“主题配置 → 页面效果”示例

当前不建议优先做：
- 多主题注册系统
- 页面拖拽 builder
- 主题插件接口
- 导航菜单树系统

## 7. 维护结论

对当前项目阶段而言，Theme Framework v1 已经让 Inkwell 从“带一点设置项的博客”进入到：

> **具备结构化公开主题配置能力的单主题 CMS 博客。**

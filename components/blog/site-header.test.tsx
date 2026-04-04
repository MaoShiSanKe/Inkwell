import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "./site-header";

describe("site header", () => {
  it("renders navigation links when provided", () => {
    const markup = renderToStaticMarkup(
      <SiteHeader
        settings={{
          site_brand_name: "Inkwell Daily",
          site_tagline: "A configurable publishing shell.",
          home_hero_title: "最新文章",
          home_hero_description: "desc",
          home_primary_cta_label: "订阅",
          home_primary_cta_url: "/subscribe",
          home_featured_links_title: "精选入口",
          home_featured_links_description: "desc",
          home_featured_link_1_label: "分类",
          home_featured_link_1_url: "/category",
          home_featured_link_1_description: "desc",
          home_featured_link_2_label: "标签",
          home_featured_link_2_url: "/tag",
          home_featured_link_2_description: "desc",
          home_featured_link_3_label: "友链",
          home_featured_link_3_url: "/friend-links",
          home_featured_link_3_description: "desc",
          home_posts_variant: "comfortable",
          home_featured_links_variant: "comfortable",
          home_show_post_excerpt: true,
          home_show_post_author: true,
          home_show_post_category: true,
          home_show_post_date: true,
          public_archive_posts_variant: "comfortable",
          public_longform_variant: "comfortable",
          public_layout_width: "wide",
          public_surface_variant: "solid",
          public_accent_theme: "blue",
          public_header_show_tagline: true,
          public_footer_blurb: "",
          public_footer_copyright: "",
          public_theme_default_mode: "dark",
        }}
        navigationItems={[
          { id: 1, label: "关于", url: "/about", openInNewTab: false },
          { id: 2, label: "外链", url: "https://example.com", openInNewTab: true },
        ]}
      />,
    );

    expect(markup).toContain('aria-label="站点导航"');
    expect(markup).toContain('href="/about"');
    expect(markup).toContain('href="https://example.com"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer noopener"');
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

class NotFoundSignal extends Error {
  constructor() {
    super("not-found");
  }
}

const { getAdminPathMock, getThemeFrameworkSettingsMock, notFoundMock } = vi.hoisted(() => ({
  getAdminPathMock: vi.fn(),
  getThemeFrameworkSettingsMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new NotFoundSignal();
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/lib/settings", () => ({
  getAdminPath: getAdminPathMock,
  getThemeFrameworkSettings: getThemeFrameworkSettingsMock,
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: ({ defaultMode }: { defaultMode?: string }) => <div>{`theme-toggle:${defaultMode ?? "system"}`}</div>,
}));

describe("admin layout", () => {
  beforeEach(() => {
    getAdminPathMock.mockReset();
    getThemeFrameworkSettingsMock.mockReset();
    getThemeFrameworkSettingsMock.mockResolvedValue({
      site_brand_name: "Inkwell",
      site_tagline: "",
      home_hero_title: "最新文章",
      home_hero_description: "浏览站点中已经发布的文章与公开归档。",
      home_primary_cta_label: "订阅新文章",
      home_primary_cta_url: "/subscribe",
      home_posts_variant: "comfortable",
      home_show_post_excerpt: true,
      home_show_post_author: true,
      home_show_post_category: true,
      home_show_post_date: true,
      public_layout_width: "default",
      public_surface_variant: "soft",
      public_accent_theme: "slate",
      public_header_show_tagline: true,
      public_footer_blurb: "",
      public_footer_copyright: "",
      public_theme_default_mode: "dark",
    });
    notFoundMock.mockClear();
  });

  it("calls notFound when the route admin path does not match settings", async () => {
    getAdminPathMock.mockResolvedValue("admin");

    const { default: AdminLayout } = await import("./layout");

    await expect(
      AdminLayout({
        children: <div>Hidden admin content</div>,
        params: Promise.resolve({ adminPath: "dashboard" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSignal);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders children and theme toggle when the route admin path matches settings", async () => {
    getAdminPathMock.mockResolvedValue("admin");

    const { default: AdminLayout } = await import("./layout");
    const element = await AdminLayout({
      children: <div>Visible admin content</div>,
      params: Promise.resolve({ adminPath: "admin" }),
    });

    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("theme-toggle:dark");
    expect(markup).toContain("Visible admin content");
  });
});

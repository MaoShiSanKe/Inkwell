import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getPublicCodeSettingsMock,
  getPublicNoticeSettingsMock,
  getUmamiSettingsMock,
  useServerInsertedHTMLMock,
} = vi.hoisted(() => ({
  getPublicCodeSettingsMock: vi.fn(),
  getPublicNoticeSettingsMock: vi.fn(),
  getUmamiSettingsMock: vi.fn(),
  useServerInsertedHTMLMock: vi.fn(),
}));

vi.mock("@/lib/settings", () => ({
  getPublicCodeSettings: getPublicCodeSettingsMock,
  getPublicNoticeSettings: getPublicNoticeSettingsMock,
  getUmamiSettings: getUmamiSettingsMock,
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <div>theme-toggle</div>,
}));

vi.mock("next/script", () => ({
  default: ({ children, ...props }: React.ComponentPropsWithoutRef<"script">) => (
    <script {...props}>{children}</script>
  ),
}));

vi.mock("next/navigation", () => ({
  useServerInsertedHTML: useServerInsertedHTMLMock,
}));

vi.mock("@/components/blog/umami-pageview-tracker", () => ({
  UmamiPageviewTracker: () => <div>umami-pageview-tracker</div>,
}));

describe("blog layout", () => {
  beforeEach(() => {
    useServerInsertedHTMLMock.mockReset();
    useServerInsertedHTMLMock.mockImplementation((callback: () => React.ReactNode) => callback());
    getPublicCodeSettingsMock.mockResolvedValue({
      public_head_html: "",
      public_footer_html: "",
      public_custom_css: "",
    });
    getPublicNoticeSettingsMock.mockResolvedValue({
      public_notice_enabled: false,
      public_notice_variant: "info",
      public_notice_dismissible: false,
      public_notice_version: "",
      public_notice_start_at: "",
      public_notice_end_at: "",
      public_notice_title: "",
      public_notice_body: "",
      public_notice_link_label: "",
      public_notice_link_url: "",
    });
    getUmamiSettingsMock.mockResolvedValue({
      umami_enabled: false,
      umami_website_id: "",
      umami_script_url: "",
    });
  });

  it("renders public notice content when notice is enabled inside the active window", async () => {
    getPublicNoticeSettingsMock.mockResolvedValue({
      public_notice_enabled: true,
      public_notice_variant: "warning",
      public_notice_dismissible: true,
      public_notice_version: "2026-04-maintenance",
      public_notice_start_at: "2000-01-01T00:00:00.000Z",
      public_notice_end_at: "2999-01-01T00:00:00.000Z",
      public_notice_title: "系统维护通知",
      public_notice_body: "今晚 23:00-23:30 将进行短暂维护。",
      public_notice_link_label: "查看详情",
      public_notice_link_url: "/docs/deployment",
    });

    const { default: BlogLayout } = await import("./layout");
    const element = await BlogLayout({ children: <div>Visible public content</div> });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("系统维护通知");
    expect(markup).toContain("今晚 23:00-23:30 将进行短暂维护。");
    expect(markup).toContain("查看详情");
    expect(markup).toContain('href="/docs/deployment"');
  });

  it("renders public notice when only the start boundary has passed", async () => {
    getPublicNoticeSettingsMock.mockResolvedValue({
      public_notice_enabled: true,
      public_notice_variant: "info",
      public_notice_dismissible: false,
      public_notice_version: "",
      public_notice_start_at: "2000-01-01T00:00:00.000Z",
      public_notice_end_at: "",
      public_notice_title: "长期公告",
      public_notice_body: "开始时间已到，结束时间不限。",
      public_notice_link_label: "",
      public_notice_link_url: "",
    });

    const { default: BlogLayout } = await import("./layout");
    const element = await BlogLayout({ children: <div>Visible public content</div> });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("长期公告");
    expect(markup).toContain("开始时间已到，结束时间不限。");
  });

  it("does not render public notice after the end boundary has passed", async () => {
    getPublicNoticeSettingsMock.mockResolvedValue({
      public_notice_enabled: true,
      public_notice_variant: "info",
      public_notice_dismissible: false,
      public_notice_version: "",
      public_notice_start_at: "",
      public_notice_end_at: "2000-01-01T00:00:00.000Z",
      public_notice_title: "过期公告",
      public_notice_body: "结束时间已过。",
      public_notice_link_label: "",
      public_notice_link_url: "",
    });

    const { default: BlogLayout } = await import("./layout");
    const element = await BlogLayout({ children: <div>Visible public content</div> });
    const markup = renderToStaticMarkup(element);

    expect(markup).not.toContain("过期公告");
    expect(markup).not.toContain("结束时间已过。");
  });
});

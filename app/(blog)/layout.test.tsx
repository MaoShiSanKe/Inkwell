import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUmamiSettingsMock } = vi.hoisted(() => ({
  getUmamiSettingsMock: vi.fn(),
}));

vi.mock("@/lib/settings", () => ({
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

vi.mock("@/components/blog/umami-pageview-tracker", () => ({
  UmamiPageviewTracker: () => <div>umami-pageview-tracker</div>,
}));

describe("blog layout", () => {
  beforeEach(() => {
    getUmamiSettingsMock.mockReset();
    getUmamiSettingsMock.mockResolvedValue({
      umami_enabled: false,
      umami_website_id: "",
      umami_script_url: "",
    });
  });

  it("renders children and theme toggle without Umami when analytics are disabled", async () => {
    const { default: BlogLayout } = await import("./layout");
    const element = await BlogLayout({
      children: <div>Visible public content</div>,
    });

    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Visible public content");
    expect(markup).toContain("theme-toggle");
    expect(markup).not.toContain("umami-script");
    expect(markup).not.toContain("umami-pageview-tracker");
  });

  it("renders Umami script and tracker when analytics are enabled", async () => {
    getUmamiSettingsMock.mockResolvedValue({
      umami_enabled: true,
      umami_website_id: "550e8400-e29b-41d4-a716-446655440000",
      umami_script_url: "https://umami.example.com/script.js",
    });

    const { default: BlogLayout } = await import("./layout");
    const element = await BlogLayout({
      children: <div>Visible public content</div>,
    });

    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Visible public content");
    expect(markup).toContain("theme-toggle");
    expect(markup).toContain('id="umami-script"');
    expect(markup).toContain('src="https://umami.example.com/script.js"');
    expect(markup).toContain('data-website-id="550e8400-e29b-41d4-a716-446655440000"');
    expect(markup).toContain('data-auto-track="false"');
    expect(markup).toContain('data-do-not-track="true"');
    expect(markup).toContain("umami-pageview-tracker");
  });
});


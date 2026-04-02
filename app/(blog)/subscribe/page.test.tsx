import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteBrandNameMock, getSiteOriginMock, getThemeFrameworkSettingsMock } = vi.hoisted(() => ({
  getSiteBrandNameMock: vi.fn(),
  getSiteOriginMock: vi.fn(),
  getThemeFrameworkSettingsMock: vi.fn(),
}));

vi.mock("@/lib/settings", () => ({
  getSiteBrandName: getSiteBrandNameMock,
  getSiteOrigin: getSiteOriginMock,
  getThemeFrameworkSettings: getThemeFrameworkSettingsMock,
}));

vi.mock("@/components/blog/subscribe-form", () => ({
  SubscribeForm: ({
    initialEmail,
    accentTheme,
    surfaceVariant,
  }: {
    initialEmail?: string;
    accentTheme?: string;
    surfaceVariant?: string;
  }) => <div>{`subscribe-form:${initialEmail ?? ""}:${accentTheme ?? ""}:${surfaceVariant ?? ""}`}</div>,
}));

describe("subscribe page", () => {
  beforeEach(() => {
    getSiteBrandNameMock.mockReset();
    getSiteBrandNameMock.mockResolvedValue("Inkwell Daily");
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    getThemeFrameworkSettingsMock.mockReset();
    getThemeFrameworkSettingsMock.mockResolvedValue(createThemeFrameworkSettings());
  });

  it("returns metadata for the subscribe page", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata();

    expect(metadata).toMatchObject({
      title: "订阅",
      alternates: {
        canonical: "https://example.com/subscribe",
      },
      openGraph: {
        title: "Inkwell Daily 订阅",
        url: "https://example.com/subscribe",
        siteName: "Inkwell Daily",
      },
      twitter: {
        title: "Inkwell Daily 订阅",
      },
    });
  });

  it("renders themed subscribe classes with the initial email", async () => {
    const { default: SubscribePage } = await import("./page");
    const element = await SubscribePage({
      searchParams: Promise.resolve({ email: "reader@example.com" }),
    });
    const markup = await import("react-dom/server").then(({ renderToStaticMarkup }) =>
      renderToStaticMarkup(element),
    );

    expect(markup).toContain("订阅新文章通知");
    expect(markup).toContain("subscribe-form:reader@example.com:blue:solid");
    expect(markup).toContain("max-w-6xl");
    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
  });
});

function createThemeFrameworkSettings(overrides: Record<string, unknown> = {}) {
  return {
    public_layout_width: "wide",
    public_surface_variant: "solid",
    public_accent_theme: "blue",
    ...overrides,
  };
}

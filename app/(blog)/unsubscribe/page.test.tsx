import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteBrandNameMock, getSiteOriginMock, getThemeFrameworkSettingsMock, getSubscriberUnsubscribePreviewMock } = vi.hoisted(() => ({
  getSiteBrandNameMock: vi.fn(),
  getSiteOriginMock: vi.fn(),
  getThemeFrameworkSettingsMock: vi.fn(),
  getSubscriberUnsubscribePreviewMock: vi.fn(),
}));
vi.mock("@/lib/settings", () => ({
  getSiteBrandName: getSiteBrandNameMock,
  getSiteOrigin: getSiteOriginMock,
  getThemeFrameworkSettings: getThemeFrameworkSettingsMock,
}));

vi.mock("@/lib/blog/subscribers", () => ({
  getSubscriberUnsubscribePreview: getSubscriberUnsubscribePreviewMock,
}));

vi.mock("@/app/(blog)/subscribe/actions", () => ({
  unsubscribeAction: vi.fn(),
}));

describe("unsubscribe page", () => {
  beforeEach(() => {
    getSiteBrandNameMock.mockReset();
    getSiteBrandNameMock.mockResolvedValue("Inkwell Daily");
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    getThemeFrameworkSettingsMock.mockReset();
    getThemeFrameworkSettingsMock.mockResolvedValue(createThemeFrameworkSettings());
    getSubscriberUnsubscribePreviewMock.mockReset();
  });

  it("returns metadata for the unsubscribe page", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata();

    expect(metadata).toMatchObject({
      title: "退订",
      alternates: {
        canonical: "https://example.com/unsubscribe",
      },
      robots: {
        index: false,
        follow: false,
      },
      openGraph: {
        title: "Inkwell Daily 退订",
        url: "https://example.com/unsubscribe",
        siteName: "Inkwell Daily",
      },
      twitter: {
        title: "Inkwell Daily 退订",
      },
    });
  });

  it("renders themed confirmation form for a valid unsubscribe token", async () => {
    getSubscriberUnsubscribePreviewMock.mockResolvedValue({
      isValid: true,
      token: "token-value",
      email: "reader@example.com",
      displayName: "Reader",
    });

    const { default: UnsubscribePage } = await import("./page");
    const element = await UnsubscribePage({
      searchParams: Promise.resolve({ token: "token-value" }),
    });
    const markup = await import("react-dom/server").then(({ renderToStaticMarkup }) =>
      renderToStaticMarkup(element),
    );

    expect(markup).toContain("确认退订");
    expect(markup).toContain("reader@example.com");
    expect(markup).toContain("Reader");
    expect(markup).toContain("max-w-6xl");
    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("text-blue-700 dark:text-blue-300");
  });

  it("renders an error state for an invalid unsubscribe token", async () => {
    getSubscriberUnsubscribePreviewMock.mockResolvedValue({
      isValid: false,
    });

    const { default: UnsubscribePage } = await import("./page");
    const element = await UnsubscribePage({
      searchParams: Promise.resolve({ token: "bad-token" }),
    });
    const markup = await import("react-dom/server").then(({ renderToStaticMarkup }) =>
      renderToStaticMarkup(element),
    );

    expect(markup).toContain("退订链接无效或已失效。");
    expect(markup).not.toContain("确认退订");
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

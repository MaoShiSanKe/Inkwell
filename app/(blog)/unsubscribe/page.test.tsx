import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteBrandNameMock, getSiteOriginMock, getSubscriberUnsubscribePreviewMock } = vi.hoisted(() => ({
  getSiteBrandNameMock: vi.fn(),
  getSiteOriginMock: vi.fn(),
  getSubscriberUnsubscribePreviewMock: vi.fn(),
}));
vi.mock("@/lib/settings", () => ({
  getSiteBrandName: getSiteBrandNameMock,
  getSiteOrigin: getSiteOriginMock,
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

  it("renders a confirmation form for a valid unsubscribe token", async () => {
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

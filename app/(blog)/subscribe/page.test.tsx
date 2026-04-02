import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteBrandNameMock, getSiteOriginMock } = vi.hoisted(() => ({
  getSiteBrandNameMock: vi.fn(),
  getSiteOriginMock: vi.fn(),
}));

vi.mock("@/lib/settings", () => ({
  getSiteBrandName: getSiteBrandNameMock,
  getSiteOrigin: getSiteOriginMock,
}));

vi.mock("@/components/blog/subscribe-form", () => ({
  SubscribeForm: ({ initialEmail }: { initialEmail?: string }) => (
    <div>{`subscribe-form:${initialEmail ?? ""}`}</div>
  ),
}));

describe("subscribe page", () => {
  beforeEach(() => {
    getSiteBrandNameMock.mockReset();
    getSiteBrandNameMock.mockResolvedValue("Inkwell Daily");
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
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

  it("renders the subscribe form with the initial email", async () => {
    const { default: SubscribePage } = await import("./page");
    const element = await SubscribePage({
      searchParams: Promise.resolve({ email: "reader@example.com" }),
    });
    const markup = await import("react-dom/server").then(({ renderToStaticMarkup }) =>
      renderToStaticMarkup(element),
    );

    expect(markup).toContain("订阅新文章通知");
    expect(markup).toContain("subscribe-form:reader@example.com");
  });
});

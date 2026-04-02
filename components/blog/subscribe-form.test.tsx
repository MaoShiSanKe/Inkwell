import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(blog)/subscribe/actions", () => ({
  subscribeAction: vi.fn(),
}));

import { SubscribeForm } from "./subscribe-form";

describe("SubscribeForm", () => {
  it("renders theme-aware surface and button classes", () => {
    const markup = renderToStaticMarkup(
      <SubscribeForm initialEmail="reader@example.com" accentTheme="blue" surfaceVariant="solid" />,
    );

    expect(markup).toContain("bg-slate-100/90");
    expect(markup).toContain("focus:border-blue-500");
    expect(markup).toContain("focus-visible:ring-blue-500/40");
    expect(markup).toContain("text-white");
    expect(markup).toContain("dark:text-slate-900");
    expect(markup).toContain("reader@example.com");
  });

  it("falls back to slate button ring classes by default", () => {
    const markup = renderToStaticMarkup(<SubscribeForm />);

    expect(markup).toContain("focus-visible:ring-slate-500/40");
    expect(markup).toContain("text-white");
    expect(markup).toContain("dark:text-slate-900");
  });
});

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const {
  publishScheduledPostsMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  publishScheduledPostsMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/admin/posts", () => ({
  publishScheduledPosts: publishScheduledPostsMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

describe("internal publish scheduled route", () => {
  const originalSecret = process.env.INTERNAL_CRON_SECRET;

  beforeEach(() => {
    publishScheduledPostsMock.mockReset();
    revalidatePathMock.mockReset();
    process.env.INTERNAL_CRON_SECRET = "test-secret";
  });

  it("returns 503 when INTERNAL_CRON_SECRET is missing", async () => {
    delete process.env.INTERNAL_CRON_SECRET;

    const { POST } = await import("./route");
    const response = await POST(new Request("https://example.com/api/internal/posts/publish-scheduled", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      data: null,
      error: "INTERNAL_CRON_SECRET is not configured.",
    });
  });

  it("returns 401 when authorization is missing", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("https://example.com/api/internal/posts/publish-scheduled", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      data: null,
      error: "Unauthorized.",
    });
  });

  it("returns 401 when authorization is invalid", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/internal/posts/publish-scheduled", {
        method: "POST",
        headers: {
          authorization: "Bearer wrong-secret",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      data: null,
      error: "Unauthorized.",
    });
  });

  it("returns publish results and revalidates affected paths", async () => {
    publishScheduledPostsMock.mockResolvedValue({
      publishedCount: 2,
      publishedPostIds: [1, 2],
      affectedSlugs: ["hello-world", " hello-world ", "second-post"],
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/internal/posts/publish-scheduled", {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      publishedCount: 2,
      publishedPostIds: [1, 2],
      affectedSlugs: ["hello-world", " hello-world ", "second-post"],
    });
    expect(body.error).toBeNull();
    expect(typeof body.data.triggeredAt).toBe("string");

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/post/hello-world");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/post/second-post");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/sitemap.xml");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(4, "/rss.xml");
  });

  it("returns zero publish results without post revalidation when nothing is due", async () => {
    publishScheduledPostsMock.mockResolvedValue({
      publishedCount: 0,
      publishedPostIds: [],
      affectedSlugs: [],
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/internal/posts/publish-scheduled", {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: {
        publishedCount: 0,
        publishedPostIds: [],
        affectedSlugs: [],
      },
      error: null,
    });
    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/sitemap.xml");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/rss.xml");
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.INTERNAL_CRON_SECRET;
      return;
    }

    process.env.INTERNAL_CRON_SECRET = originalSecret;
  });
});

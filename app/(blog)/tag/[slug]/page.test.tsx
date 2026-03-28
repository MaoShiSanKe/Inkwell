import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteOriginMock, resolvePublishedTagArchiveBySlugMock } = vi.hoisted(() => ({
  getSiteOriginMock: vi.fn(),
  resolvePublishedTagArchiveBySlugMock: vi.fn(),
}));

class NotFoundSignal extends Error {
  constructor() {
    super("not-found");
  }
}

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new NotFoundSignal();
  }),
}));

type LinkStubProps = Omit<ComponentPropsWithoutRef<"a">, "href" | "children"> & {
  href: string;
  children: ReactNode;
};

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: LinkStubProps) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/lib/settings", () => ({
  getSiteOrigin: getSiteOriginMock,
}));

vi.mock("@/lib/blog/posts", () => ({
  resolvePublishedTagArchiveBySlug: resolvePublishedTagArchiveBySlugMock,
}));

describe("blog tag page", () => {
  beforeEach(() => {
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    resolvePublishedTagArchiveBySlugMock.mockReset();
    notFoundMock.mockClear();
  });

  it("renders the tag archive list", async () => {
    resolvePublishedTagArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      tag: {
        id: 1,
        name: "Next.js",
        slug: "nextjs",
        description: "Tagged posts",
      },
      posts: [createPostListItem()],
    });

    const { default: TagPage } = await import("./page");
    const element = await TagPage({
      params: Promise.resolve({ slug: "nextjs" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Next.js");
    expect(markup).toContain("Tagged posts");
    expect(markup).toContain("Published title");
    expect(markup).toContain("作者：Author Name");
    expect(markup).toContain('href="/author/author-name"');
    expect(markup).toContain("/post/published-slug");
    expect(markup).toContain("/category/frontend");
  });

  it("calls notFound when the tag slug does not exist", async () => {
    resolvePublishedTagArchiveBySlugMock.mockResolvedValue({
      kind: "not-found",
    });

    const { default: TagPage } = await import("./page");

    await expect(
      TagPage({
        params: Promise.resolve({ slug: "missing-tag" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSignal);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state when the tag exists without published posts", async () => {
    resolvePublishedTagArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      tag: {
        id: 1,
        name: "Next.js",
        slug: "nextjs",
        description: null,
      },
      posts: [],
    });

    const { default: TagPage } = await import("./page");
    const element = await TagPage({
      params: Promise.resolve({ slug: "nextjs" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("这个标签下还没有已发布文章");
    expect(markup).toContain("文章发布并关联这个标签后，会自动出现在这里。");
  });
});

function createPostListItem() {
  return {
    id: 1,
    title: "Published title",
    slug: "published-slug",
    excerpt: "Published excerpt",
    publishedAt: new Date("2026-03-26T12:00:00.000Z"),
    author: {
      displayName: "Author Name",
      slug: "author-name",
    },
    category: {
      name: "Frontend",
      slug: "frontend",
    },
  };
}

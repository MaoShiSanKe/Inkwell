import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteBrandNameMock, getSiteOriginMock, resolvePublishedAuthorArchiveBySlugMock } = vi.hoisted(() => ({
  getSiteBrandNameMock: vi.fn(),
  getSiteOriginMock: vi.fn(),
  resolvePublishedAuthorArchiveBySlugMock: vi.fn(),
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
  getSiteBrandName: getSiteBrandNameMock,
  getSiteOrigin: getSiteOriginMock,
}));
vi.mock("@/lib/blog/posts", () => ({
  resolvePublishedAuthorArchiveBySlug: resolvePublishedAuthorArchiveBySlugMock,
}));

describe("blog author page", () => {
  beforeEach(() => {
    getSiteBrandNameMock.mockReset();
    getSiteBrandNameMock.mockResolvedValue("Inkwell Daily");
    getSiteOriginMock.mockReset();
    getSiteOriginMock.mockReturnValue("https://example.com");
    resolvePublishedAuthorArchiveBySlugMock.mockReset();
    notFoundMock.mockClear();
  });

  it("returns empty metadata when the author slug does not exist", async () => {
    resolvePublishedAuthorArchiveBySlugMock.mockResolvedValue({
      kind: "not-found",
    });

    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "missing-author" }),
    });

    expect(metadata).toEqual({});
  });

  it("returns metadata for the published author archive", async () => {
    resolvePublishedAuthorArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      author: {
        id: 1,
        displayName: "Author Name",
        slug: "author-name",
      },
      posts: [],
    });

    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "author-name" }),
    });

    expect(metadata).toMatchObject({
      title: "Author Name 的文章",
      description: "查看作者“Author Name”下已经发布的文章。",
      alternates: {
        canonical: "https://example.com/author/author-name",
      },
      openGraph: {
        type: "website",
        title: "Author Name 的文章",
        description: "查看作者“Author Name”下已经发布的文章。",
        url: "https://example.com/author/author-name",
        siteName: "Inkwell Daily",
      },
      twitter: {
        card: "summary",
        title: "Author Name 的文章",
        description: "查看作者“Author Name”下已经发布的文章。",
      },
    });
  });

  it("renders the author archive list", async () => {
    resolvePublishedAuthorArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      author: {
        id: 1,
        displayName: "Author Name",
        slug: "author-name",
      },
      posts: [createPostListItem()],
    });

    const { default: AuthorPage } = await import("./page");
    const element = await AuthorPage({
      params: Promise.resolve({ slug: "author-name" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Author Name");
    expect(markup).toContain("Published title");
    expect(markup).toContain("Published excerpt");
    expect(markup).toContain("/post/published-slug");
    expect(markup).toContain("/category/frontend");
    expect(markup).toContain("分类：Frontend");
  });

  it("calls notFound when the author slug does not exist", async () => {
    resolvePublishedAuthorArchiveBySlugMock.mockResolvedValue({
      kind: "not-found",
    });

    const { default: AuthorPage } = await import("./page");

    await expect(
      AuthorPage({
        params: Promise.resolve({ slug: "missing-author" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSignal);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state when the author exists without published posts", async () => {
    resolvePublishedAuthorArchiveBySlugMock.mockResolvedValue({
      kind: "archive",
      author: {
        id: 1,
        displayName: "Author Name",
        slug: "author-name",
      },
      posts: [],
    });

    const { default: AuthorPage } = await import("./page");
    const element = await AuthorPage({
      params: Promise.resolve({ slug: "author-name" }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("这个作者下还没有已发布文章");
    expect(markup).toContain("该作者发布文章后，会自动出现在这个作者归档页。");
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

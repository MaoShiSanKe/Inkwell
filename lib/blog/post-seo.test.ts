import { describe, expect, it } from "vitest";

import {
  DEFAULT_DESCRIPTION,
  buildArticleJsonLd,
  buildPostUrl,
  resolveCanonicalUrl,
  resolveImageUrl,
  resolvePostDescription,
  stripHtml,
  truncateText,
  type PostSeoInput,
} from "./post-seo";

function createPostSeoInput(overrides: Partial<PostSeoInput> = {}): PostSeoInput {
  return {
    title: "测试文章",
    slug: "test-post",
    excerpt: "这是摘要",
    content: "<p>这是正文内容</p>",
    publishedAt: new Date("2026-03-25T12:00:00.000Z"),
    updatedAt: new Date("2026-03-25T13:00:00.000Z"),
    author: {
      displayName: "管理员",
    },
    seo: {
      metaTitle: null,
      metaDescription: null,
      ogTitle: null,
      ogDescription: null,
      canonicalUrl: null,
      noindex: false,
      nofollow: false,
    },
    ogImage: null,
    ...overrides,
  };
}

describe("stripHtml", () => {
  it("removes HTML tags and normalizes spaces", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>\n<div> again </div>")).toBe(
      "Hello world again",
    );
  });
});

describe("truncateText", () => {
  it("returns original text when within limit", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  it("truncates and appends ellipsis when exceeding limit", () => {
    expect(truncateText("hello world", 6)).toBe("hello…");
  });
});

describe("buildPostUrl", () => {
  it("builds absolute URL when origin exists", () => {
    expect(buildPostUrl("test-post", "https://example.com")).toBe(
      "https://example.com/post/test-post",
    );
  });

  it("falls back to relative path when origin is missing", () => {
    expect(buildPostUrl("test-post", null)).toBe("/post/test-post");
  });
});

describe("resolveImageUrl", () => {
  it("returns external image URL directly", () => {
    expect(
      resolveImageUrl(
        {
          source: "external",
          storagePath: null,
          thumbnailPath: null,
          externalUrl: "https://cdn.example.com/og.png",
          altText: null,
          width: 1200,
          height: 630,
        },
        "https://example.com",
      ),
    ).toBe("https://cdn.example.com/og.png");
  });

  it("builds local image URL from storage path", () => {
    expect(
      resolveImageUrl(
        {
          source: "local",
          storagePath: "uploads/images/2026/03/hero.webp",
          thumbnailPath: null,
          externalUrl: null,
          altText: null,
          width: 1200,
          height: 630,
        },
        "https://example.com",
      ),
    ).toBe("https://example.com/uploads/images/2026/03/hero.webp");
  });

  it("falls back to thumbnail path when storage path is missing", () => {
    expect(
      resolveImageUrl(
        {
          source: "local",
          storagePath: null,
          thumbnailPath: "uploads/images/2026/03/hero-thumb.webp",
          externalUrl: null,
          altText: null,
          width: null,
          height: null,
        },
        "https://example.com",
      ),
    ).toBe("https://example.com/uploads/images/2026/03/hero-thumb.webp");
  });

  it("returns null when local image lacks origin", () => {
    expect(
      resolveImageUrl(
        {
          source: "local",
          storagePath: "uploads/images/2026/03/hero.webp",
          thumbnailPath: null,
          externalUrl: null,
          altText: null,
          width: null,
          height: null,
        },
        null,
      ),
    ).toBeNull();
  });
});

describe("resolvePostDescription", () => {
  it("prefers metaDescription over excerpt and content", () => {
    const post = createPostSeoInput({
      seo: {
        metaTitle: null,
        metaDescription: " Meta Description ",
        ogTitle: null,
        ogDescription: null,
        canonicalUrl: null,
        noindex: false,
        nofollow: false,
      },
    });

    expect(resolvePostDescription(post)).toBe("Meta Description");
  });

  it("falls back to excerpt when metaDescription is missing", () => {
    expect(createPostSeoInput().excerpt).toBe("这是摘要");
    expect(resolvePostDescription(createPostSeoInput())).toBe("这是摘要");
  });

  it("falls back to stripped content when excerpt is empty", () => {
    const post = createPostSeoInput({
      excerpt: "",
      content: "<p>Hello <strong>world</strong></p>",
    });

    expect(resolvePostDescription(post)).toBe("Hello world");
  });

  it("falls back to default description when content is empty after stripping", () => {
    const post = createPostSeoInput({
      excerpt: "",
      content: "<div>   </div>",
    });

    expect(resolvePostDescription(post)).toBe(DEFAULT_DESCRIPTION);
  });
});

describe("resolveCanonicalUrl", () => {
  it("prefers explicit canonical URL", () => {
    const post = createPostSeoInput({
      seo: {
        metaTitle: null,
        metaDescription: null,
        ogTitle: null,
        ogDescription: null,
        canonicalUrl: " https://example.com/custom-canonical ",
        noindex: false,
        nofollow: false,
      },
    });

    expect(resolveCanonicalUrl(post, "https://example.com")).toBe(
      "https://example.com/custom-canonical",
    );
  });

  it("falls back to post path when canonical is missing", () => {
    expect(
      resolveCanonicalUrl(createPostSeoInput(), "https://example.com"),
    ).toBe("https://example.com/post/test-post");
  });
});

describe("buildArticleJsonLd", () => {
  it("builds required article fields", () => {
    const post = createPostSeoInput({
      seo: {
        metaTitle: "SEO 标题",
        metaDescription: null,
        ogTitle: null,
        ogDescription: null,
        canonicalUrl: null,
        noindex: false,
        nofollow: false,
      },
    });

    const result = buildArticleJsonLd(
      post,
      "https://example.com/post/test-post",
      "描述文本",
      null,
    );

    expect(result).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "SEO 标题",
      description: "描述文本",
      url: "https://example.com/post/test-post",
      mainEntityOfPage: "https://example.com/post/test-post",
      author: {
        "@type": "Person",
        name: "管理员",
      },
      publisher: {
        "@type": "Organization",
        name: "Inkwell",
      },
    });
    expect(result).toHaveProperty("datePublished");
    expect(result).not.toHaveProperty("image");
  });

  it("adds image when image URL exists", () => {
    const result = buildArticleJsonLd(
      createPostSeoInput(),
      "https://example.com/post/test-post",
      "描述文本",
      "https://example.com/og.png",
    );

    expect(result).toHaveProperty("image");
    expect(result.image).toEqual(["https://example.com/og.png"]);
  });

  it("omits datePublished when post is not published yet", () => {
    const result = buildArticleJsonLd(
      createPostSeoInput({ publishedAt: null }),
      "https://example.com/post/test-post",
      "描述文本",
      null,
    );

    expect(result).not.toHaveProperty("datePublished");
  });
});

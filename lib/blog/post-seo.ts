export const SITE_NAME = "Inkwell";
export const DEFAULT_DESCRIPTION =
  "一个面向内容管理、评论互动与 SEO 优化的自建博客框架。";

export type PostSeoAuthorInput = {
  displayName: string;
};

export type PostSeoImageInput = {
  source: "local" | "external";
  storagePath: string | null;
  thumbnailPath: string | null;
  externalUrl: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type PostSeoInput = {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  publishedAt: Date | null;
  updatedAt: Date;
  author: PostSeoAuthorInput;
  seo: {
    metaTitle: string | null;
    metaDescription: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    canonicalUrl: string | null;
    noindex: boolean;
    nofollow: boolean;
  };
  ogImage: PostSeoImageInput | null;
};

export function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function truncateText(value: string, length: number) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}

export function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildSiteUrl(path: string, siteOrigin: string | null) {
  if (!siteOrigin) {
    return path;
  }

  return new URL(path, siteOrigin).toString();
}

export function buildPostUrl(slug: string, siteOrigin: string | null) {
  return buildSiteUrl(`/post/${slug}`, siteOrigin);
}

export function buildSitemapUrl(siteOrigin: string | null) {
  return buildSiteUrl("/sitemap.xml", siteOrigin);
}

export function buildRobotsTxt(siteOrigin: string | null) {
  return ["User-agent: *", "Allow: /", `Sitemap: ${buildSitemapUrl(siteOrigin)}`].join("\n");
}

export function resolveImageUrl(
  image: PostSeoImageInput | null,
  siteOrigin: string | null,
) {
  if (!image) {
    return null;
  }

  if (image.source === "external") {
    return image.externalUrl;
  }

  const localPath = image.storagePath ?? image.thumbnailPath;

  if (!localPath || !siteOrigin) {
    return null;
  }

  return new URL(`/${localPath.replace(/^\/+/, "")}`, siteOrigin).toString();
}

export function estimateReadingTimeMinutes(content: string) {
  const plainTextContent = stripHtml(content);

  if (!plainTextContent) {
    return 1;
  }

  const cjkCharacterCount = (plainTextContent.match(/[\u3400-\u9fff]/g) ?? []).length;
  const nonCjkText = plainTextContent.replace(/[\u3400-\u9fff]/g, " ");
  const wordCount = nonCjkText.split(/\s+/).filter(Boolean).length;
  const unitCount = cjkCharacterCount + wordCount;

  return Math.max(1, Math.ceil(unitCount / 250));
}

export function resolvePostDescription(post: PostSeoInput) {
  const metaDescription = post.seo.metaDescription?.trim();

  if (metaDescription) {
    return metaDescription;
  }

  if (post.excerpt?.trim()) {
    return post.excerpt.trim();
  }

  const plainTextContent = stripHtml(post.content);

  if (!plainTextContent) {
    return DEFAULT_DESCRIPTION;
  }

  return truncateText(plainTextContent, 160);
}

export function resolveCanonicalUrl(
  post: PostSeoInput,
  siteOrigin: string | null,
) {
  const explicitCanonical = post.seo.canonicalUrl?.trim();

  if (explicitCanonical) {
    return explicitCanonical;
  }

  return buildPostUrl(post.slug, siteOrigin);
}

export function buildArticleJsonLd(
  post: PostSeoInput,
  canonicalUrl: string,
  description: string,
  imageUrl: string | null,
) {
  const articleJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seo.metaTitle?.trim() || post.title,
    description,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    dateModified: post.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: post.author.displayName,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };

  if (post.publishedAt) {
    articleJsonLd.datePublished = post.publishedAt.toISOString();
  }

  if (imageUrl) {
    articleJsonLd.image = [imageUrl];
  }

  return articleJsonLd;
}

export function buildSitemapXml(
  entries: Array<{ loc: string; lastModifiedAt: Date }>,
  siteOrigin: string | null,
) {
  const body = entries
    .map((entry) => {
      const loc = escapeXml(buildSiteUrl(entry.loc, siteOrigin));
      const lastModifiedAt = escapeXml(entry.lastModifiedAt.toISOString());

      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastModifiedAt}</lastmod>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    "</urlset>",
  ].join("\n");
}

export function buildRssXml(
  input: {
    siteOrigin: string | null;
    channelTitle?: string;
    channelDescription?: string;
    channelPath?: string;
  },
  items: Array<{
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    publishedAt: Date | null;
    updatedAt: Date;
    author: { displayName: string };
  }>,
) {
  const channelTitle = input.channelTitle ?? SITE_NAME;
  const channelDescription = input.channelDescription ?? DEFAULT_DESCRIPTION;
  const channelLink = buildSiteUrl(input.channelPath ?? "/", input.siteOrigin);
  const lastBuildDate = (items[0]?.updatedAt ?? new Date()).toUTCString();
  const body = items
    .map((item) => {
      const link = escapeXml(buildPostUrl(item.slug, input.siteOrigin));
      const title = escapeXml(item.title);
      const description = escapeXml(
        item.excerpt?.trim() || truncateText(stripHtml(item.content), 160) || DEFAULT_DESCRIPTION,
      );
      const pubDate = (item.publishedAt ?? item.updatedAt).toUTCString();
      const author = escapeXml(item.author.displayName);
      const guid = link;

      return [
        "    <item>",
        `      <title>${title}</title>`,
        `      <link>${link}</link>`,
        `      <guid>${guid}</guid>`,
        `      <description>${description}</description>`,
        `      <author>${author}</author>`,
        `      <pubDate>${escapeXml(pubDate)}</pubDate>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    `    <title>${escapeXml(channelTitle)}</title>`,
    `    <link>${escapeXml(channelLink)}</link>`,
    `    <description>${escapeXml(channelDescription)}</description>`,
    `    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>`,
    body,
    "  </channel>",
    "</rss>",
  ].join("\n");
}

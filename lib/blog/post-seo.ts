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

export function buildSiteUrl(path: string, siteOrigin: string | null) {
  if (!siteOrigin) {
    return path;
  }

  return new URL(path, siteOrigin).toString();
}

export function buildPostUrl(slug: string, siteOrigin: string | null) {
  return buildSiteUrl(`/post/${slug}`, siteOrigin);
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

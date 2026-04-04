import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostTableOfContents } from "@/components/blog/post-table-of-contents";
import { resolveImageUrl, buildSiteUrl } from "@/lib/blog/post-seo";
import { resolveStandalonePageDescription, resolveStandalonePageBySlug } from "@/lib/blog/pages";
import { parsePostContentForToc } from "@/lib/blog/post-toc";
import { getSiteOrigin, getThemeFrameworkSettings } from "@/lib/settings";
import {
  resolveAccentClass,
  resolveContentWidthClass,
  resolveSurfaceClass,
} from "@/lib/theme";

type StandalonePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: StandalonePageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await resolveStandalonePageBySlug(slug);

  if (!page) {
    return {};
  }

  const siteOrigin = getSiteOrigin();
  const canonicalUrl = page.seo.canonicalUrl?.trim() || buildSiteUrl(`/${page.slug}`, siteOrigin);
  const title = page.seo.metaTitle?.trim() || page.title;
  const description = resolveStandalonePageDescription({
    metaDescription: page.seo.metaDescription,
    content: page.content,
  });
  const ogTitle = page.seo.ogTitle?.trim() || title;
  const ogDescription = page.seo.ogDescription?.trim() || description;
  const imageUrl = resolveImageUrl(page.ogImage, siteOrigin);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: !page.seo.noindex,
      follow: !page.seo.nofollow,
    },
    openGraph: {
      type: "website",
      title: ogTitle,
      description: ogDescription,
      url: canonicalUrl,
      images: imageUrl ? [{ url: imageUrl, alt: page.ogImage?.altText || ogTitle }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: ogTitle,
      description: ogDescription,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function StandalonePage({ params }: StandalonePageProps) {
  const { slug } = await params;
  const page = await resolveStandalonePageBySlug(slug);

  if (!page) {
    notFound();
  }

  const themeFrameworkSettings = await getThemeFrameworkSettings();
  const widthClass = resolveContentWidthClass(themeFrameworkSettings.public_layout_width);
  const surfaceClass = resolveSurfaceClass(themeFrameworkSettings.public_surface_variant);
  const accentClass = resolveAccentClass(themeFrameworkSettings.public_accent_theme);
  const parsedContent = parsePostContentForToc(page.content);
  const hasTableOfContents = parsedContent.tocItems.length > 0;
  const hasParsedImages = parsedContent.blocks.some((block) => block.type === "image");
  const shouldRenderParsedContent = hasTableOfContents || hasParsedImages;

  return (
    <main className={`mx-auto flex w-full ${widthClass} flex-1 flex-col gap-6 px-6 py-16`}>
      <p className={`text-sm uppercase tracking-[0.2em] ${accentClass}`}>Page</p>
      <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
      {hasTableOfContents ? (
        <PostTableOfContents
          items={parsedContent.tocItems}
          accentTheme={themeFrameworkSettings.public_accent_theme}
          surfaceVariant={themeFrameworkSettings.public_surface_variant}
        />
      ) : null}
      <article className={`flex flex-col gap-4 rounded-2xl border px-6 py-5 text-base leading-7 ${surfaceClass}`}>
        {shouldRenderParsedContent ? (
          parsedContent.blocks.map((block, index) => {
            if (block.type === "heading") {
              if (block.level === 2) {
                return (
                  <h2 id={block.id} key={block.id} className="text-2xl font-semibold tracking-tight">
                    {block.title}
                  </h2>
                );
              }

              return (
                <h3 id={block.id} key={block.id} className="text-xl font-semibold tracking-tight">
                  {block.title}
                </h3>
              );
            }

            if (block.type === "image") {
              return (
                <figure key={`${block.url}-${index}`} className="flex flex-col gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={block.altText} className={`rounded-xl border ${surfaceClass}`} src={block.url} />
                  <figcaption className="text-sm text-slate-500 dark:text-slate-400">{block.altText}</figcaption>
                </figure>
              );
            }

            return (
              <p key={`paragraph-${index}`} className="whitespace-pre-wrap">
                {block.content}
              </p>
            );
          })
        ) : (
          <p className="whitespace-pre-wrap">{page.content}</p>
        )}
      </article>
    </main>
  );
}

import { stripHtml, truncateText } from "@/lib/blog/post-seo";
import {
  listPublishedCustomPageSitemapEntries,
  listPublishedCustomPagesByIds,
  resolvePublishedCustomPageBySlug,
} from "@/lib/admin/pages";

export async function resolveStandalonePageBySlug(slug: string) {
  return resolvePublishedCustomPageBySlug(slug);
}

export async function listStandalonePageSitemapEntries() {
  const rows = await listPublishedCustomPageSitemapEntries();

  return rows.map((row) => ({
    loc: `/${row.loc}`,
    lastModifiedAt: row.lastModifiedAt,
  }));
}

export async function listRecommendedStandalonePages(pageIds: Array<number | null>) {
  const rows = await listPublishedCustomPagesByIds(
    pageIds.filter((value): value is number => value !== null),
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: resolveStandalonePageDescription({
      metaDescription: row.seo.metaDescription,
      content: row.content,
    }),
  }));
}

export function resolveStandalonePageDescription(input: {
  metaDescription: string | null;
  content: string;
}) {
  const explicit = input.metaDescription?.trim();

  if (explicit) {
    return explicit;
  }

  const plainText = stripHtml(input.content);

  if (!plainText) {
    return "";
  }

  return truncateText(plainText, 160);
}

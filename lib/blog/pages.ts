import { stripHtml, truncateText } from "@/lib/blog/post-seo";
import { resolvePublishedCustomPageBySlug, listPublishedCustomPageSitemapEntries } from "@/lib/admin/pages";

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

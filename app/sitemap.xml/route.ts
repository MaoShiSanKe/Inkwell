import { buildSitemapXml } from "@/lib/blog/post-seo";
import { listSitemapEntries } from "@/lib/blog/posts";
import { getSiteOrigin } from "@/lib/settings";

export async function GET() {
  const [entries, siteOrigin] = await Promise.all([listSitemapEntries(), getSiteOrigin()]);
  const xml = buildSitemapXml(entries, siteOrigin);

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "s-maxage=300, stale-while-revalidate=86400",
    },
  });
}

import { buildSitemapXml } from "@/lib/blog/post-seo";
import { listStandalonePageSitemapEntries } from "@/lib/blog/pages";
import { listSitemapEntries } from "@/lib/blog/posts";
import { getSiteOrigin } from "@/lib/settings";

export async function GET() {
  const [postEntries, pageEntries, siteOrigin] = await Promise.all([
    listSitemapEntries(),
    listStandalonePageSitemapEntries(),
    getSiteOrigin(),
  ]);
  const xml = buildSitemapXml([...postEntries, ...pageEntries], siteOrigin);

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "s-maxage=300, stale-while-revalidate=86400",
    },
  });
}

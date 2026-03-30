import { listFriendLinksSitemapEntries } from "@/lib/blog/friend-links";
import { buildSitemapXml } from "@/lib/blog/post-seo";
import { listStandalonePageSitemapEntries } from "@/lib/blog/pages";
import { listSitemapEntries } from "@/lib/blog/posts";
import { getSiteOrigin } from "@/lib/settings";

export async function GET() {
  const [postEntries, pageEntries, friendLinkEntries, siteOrigin] = await Promise.all([
    listSitemapEntries(),
    listStandalonePageSitemapEntries(),
    listFriendLinksSitemapEntries(),
    getSiteOrigin(),
  ]);
  const xml = buildSitemapXml([...postEntries, ...pageEntries, ...friendLinkEntries], siteOrigin);

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "s-maxage=300, stale-while-revalidate=86400",
    },
  });
}

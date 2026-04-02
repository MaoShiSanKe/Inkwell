import { buildRssXml } from "@/lib/blog/post-seo";
import { listPublishedRssPosts } from "@/lib/blog/posts";
import { getSiteBrandName, getSiteOrigin } from "@/lib/settings";

export async function GET() {
  const [posts, siteOrigin, siteBrandName] = await Promise.all([
    listPublishedRssPosts(),
    getSiteOrigin(),
    getSiteBrandName(),
  ]);
  const xml = buildRssXml(
    {
      siteOrigin,
      siteBrandName,
      channelTitle: `${siteBrandName} RSS`,
      channelDescription: `订阅 ${siteBrandName} 的最新已发布文章。`,
      channelPath: "/",
    },
    posts,
  );

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "s-maxage=300, stale-while-revalidate=86400",
    },
  });
}

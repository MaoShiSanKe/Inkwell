import { buildRssXml, SITE_NAME } from "@/lib/blog/post-seo";
import { listPublishedRssPosts } from "@/lib/blog/posts";
import { getSiteOrigin } from "@/lib/settings";

export async function GET() {
  const [posts, siteOrigin] = await Promise.all([listPublishedRssPosts(), getSiteOrigin()]);
  const xml = buildRssXml(
    {
      siteOrigin,
      channelTitle: `${SITE_NAME} RSS`,
      channelDescription: "订阅 Inkwell 的最新已发布文章。",
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

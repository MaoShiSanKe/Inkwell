import { notFound } from "next/navigation";

import { buildRssXml } from "@/lib/blog/post-seo";
import { resolvePublishedTagRssBySlug } from "@/lib/blog/posts";
import { getSiteBrandName, getSiteOrigin } from "@/lib/settings";

type TagRssRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: TagRssRouteProps) {
  const [{ slug }, siteOrigin, siteBrandName] = await Promise.all([
    params,
    getSiteOrigin(),
    getSiteBrandName(),
  ]);
  const result = await resolvePublishedTagRssBySlug(slug);

  if (result.kind !== "feed") {
    notFound();
  }

  const xml = buildRssXml(
    {
      siteOrigin,
      siteBrandName,
      channelTitle: `${result.tag.name} 标签 RSS | ${siteBrandName}`,
      channelDescription:
        result.tag.description?.trim() || `订阅标签“${result.tag.name}”下的最新已发布文章。`,
      channelPath: `/tag/${result.tag.slug}`,
    },
    result.posts,
  );

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "s-maxage=300, stale-while-revalidate=86400",
    },
  });
}

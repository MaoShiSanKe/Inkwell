import { notFound } from "next/navigation";

import { buildRssXml, SITE_NAME } from "@/lib/blog/post-seo";
import { resolvePublishedCategoryRssBySlug } from "@/lib/blog/posts";
import { getSiteOrigin } from "@/lib/settings";

type CategoryRssRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: CategoryRssRouteProps) {
  const [{ slug }, siteOrigin] = await Promise.all([params, getSiteOrigin()]);
  const result = await resolvePublishedCategoryRssBySlug(slug);

  if (result.kind !== "feed") {
    notFound();
  }

  const xml = buildRssXml(
    {
      siteOrigin,
      channelTitle: `${result.category.name} 分类 RSS | ${SITE_NAME}`,
      channelDescription:
        result.category.description?.trim() || `订阅分类“${result.category.name}”下的最新已发布文章。`,
      channelPath: `/category/${result.category.slug}`,
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

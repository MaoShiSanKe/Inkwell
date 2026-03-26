import { buildRobotsTxt } from "@/lib/blog/post-seo";
import { getSiteOrigin } from "@/lib/settings";

export async function GET() {
  const siteOrigin = await getSiteOrigin();
  const body = buildRobotsTxt(siteOrigin);

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "s-maxage=300, stale-while-revalidate=86400",
    },
  });
}

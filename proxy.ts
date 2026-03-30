import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isIpBlacklisted, resolveRequestIp } from "@/lib/ip-blacklist";
import { getAdminPath } from "@/lib/settings";

const RESERVED_SEGMENTS = new Set([
  "post",
  "category",
  "tag",
  "author",
  "series",
  "search",
  "subscribe",
  "unsubscribe",
  "friend-links",
  "api",
  "standalone",
]);

export async function proxy(request: NextRequest) {
  const clientIp = resolveRequestIp(
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
  );

  if (clientIp) {
    const blocked = await isIpBlacklisted(clientIp);

    if (blocked) {
      return new NextResponse("Forbidden", {
        status: 403,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }
  }

  const pathname = request.nextUrl.pathname;
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length !== 1) {
    return NextResponse.next();
  }

  const [slug] = segments;

  if (!slug || slug.includes(".")) {
    return NextResponse.next();
  }

  const adminPath = await getAdminPath();

  if (RESERVED_SEGMENTS.has(slug) || slug === adminPath) {
    return NextResponse.next();
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/standalone/${slug}`;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};

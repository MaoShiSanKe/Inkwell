import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isIpBlacklisted, resolveRequestIp } from "@/lib/ip-blacklist";

export async function proxy(request: NextRequest) {
  const clientIp = resolveRequestIp(
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
  );

  if (!clientIp) {
    return NextResponse.next();
  }

  const blocked = await isIpBlacklisted(clientIp);

  if (!blocked) {
    return NextResponse.next();
  }

  return new NextResponse("Forbidden", {
    status: 403,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};

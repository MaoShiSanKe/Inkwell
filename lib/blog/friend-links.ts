import { resolveImageUrl, buildSiteUrl, SITE_NAME } from "@/lib/blog/post-seo";
import {
  getFriendLinksSitemapEntry,
  listPublishedFriendLinks,
} from "@/lib/admin/friend-links";
import { getSiteOrigin } from "@/lib/settings";

export async function listPublicFriendLinks() {
  const siteOrigin = getSiteOrigin();
  const rows = await listPublishedFriendLinks();

  return rows.map((row) => ({
    ...row,
    logoUrl: resolveImageUrl(row.logo, siteOrigin),
  }));
}

export async function getFriendLinksPageMetadata() {
  const siteOrigin = getSiteOrigin();
  const canonicalUrl = buildSiteUrl("/friend-links", siteOrigin);

  return {
    title: `友情链接 | ${SITE_NAME}`,
    description: "浏览站点公开展示的友情链接列表。",
    canonicalUrl,
  };
}

export async function listFriendLinksSitemapEntries() {
  const entry = await getFriendLinksSitemapEntry();

  return entry ? [entry] : [];
}

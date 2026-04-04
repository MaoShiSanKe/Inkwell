import { listPublicSiteNavigation } from "@/lib/admin/site-navigation";

export async function listPublicSiteNavigationItems() {
  return listPublicSiteNavigation();
}

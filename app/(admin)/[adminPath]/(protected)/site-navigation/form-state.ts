import {
  initialSiteNavigationFormState,
  type SiteNavigationFormState,
} from "@/lib/admin/site-navigation-form";

export type CreateSiteNavigationActionState = SiteNavigationFormState;
export type UpdateSiteNavigationActionState = SiteNavigationFormState;

export const initialCreateSiteNavigationState = initialSiteNavigationFormState;
export const initialUpdateSiteNavigationState = initialSiteNavigationFormState;

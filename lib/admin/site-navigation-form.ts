export type SiteNavigationFormValues = {
  label: string;
  url: string;
  sortOrder: string;
  openInNewTab: "true" | "false";
  visible: "true" | "false";
};

export type SiteNavigationFormErrors = Partial<
  Record<keyof SiteNavigationFormValues | "form", string>
>;

export type SiteNavigationFormState = {
  values: SiteNavigationFormValues;
  errors: SiteNavigationFormErrors;
};

export const initialSiteNavigationFormValues: SiteNavigationFormValues = {
  label: "",
  url: "",
  sortOrder: "0",
  openInNewTab: "false",
  visible: "true",
};

export const initialSiteNavigationFormState: SiteNavigationFormState = {
  values: initialSiteNavigationFormValues,
  errors: {},
};

export function createSiteNavigationFormState(
  values: Partial<SiteNavigationFormValues> = {},
  errors: SiteNavigationFormErrors = {},
): SiteNavigationFormState {
  return {
    values: {
      ...initialSiteNavigationFormValues,
      ...values,
    },
    errors,
  };
}

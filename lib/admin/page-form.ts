export type PageFormValues = {
  title: string;
  slug: string;
  content: string;
  status: "draft" | "published" | "trash";
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageMediaId: string;
  canonicalUrl: string;
  noindex: boolean;
  nofollow: boolean;
};

export type PageFormErrors = Partial<Record<keyof PageFormValues | "form", string>>;

export type PageFormState = {
  values: PageFormValues;
  errors: PageFormErrors;
};

export const initialPageFormValues: PageFormValues = {
  title: "",
  slug: "",
  content: "",
  status: "draft",
  metaTitle: "",
  metaDescription: "",
  ogTitle: "",
  ogDescription: "",
  ogImageMediaId: "",
  canonicalUrl: "",
  noindex: false,
  nofollow: false,
};

export const initialPageFormState: PageFormState = {
  values: initialPageFormValues,
  errors: {},
};

export function createPageFormState(
  values: Partial<PageFormValues> = {},
  errors: PageFormErrors = {},
): PageFormState {
  return {
    values: {
      ...initialPageFormValues,
      ...values,
      noindex: values.noindex ?? initialPageFormValues.noindex,
      nofollow: values.nofollow ?? initialPageFormValues.nofollow,
    },
    errors,
  };
}

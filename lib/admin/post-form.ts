export type PostFormValues = {
  title: string;
  slug: string;
  categoryId: string;
  excerpt: string;
  content: string;
  status: "draft" | "published";
  tagIds: string[];
  seriesIds: string[];
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  breadcrumbEnabled: boolean;
  noindex: boolean;
  nofollow: boolean;
};

export type PostFormErrors = Partial<Record<keyof PostFormValues | "form", string>>;

export type PostFormState = {
  values: PostFormValues;
  errors: PostFormErrors;
};

export const initialPostFormValues: PostFormValues = {
  title: "",
  slug: "",
  categoryId: "",
  excerpt: "",
  content: "",
  status: "draft",
  tagIds: [],
  seriesIds: [],
  metaTitle: "",
  metaDescription: "",
  ogTitle: "",
  ogDescription: "",
  canonicalUrl: "",
  breadcrumbEnabled: false,
  noindex: false,
  nofollow: false,
};

export const initialPostFormState: PostFormState = {
  values: initialPostFormValues,
  errors: {},
};

export function createPostFormState(
  values: Partial<PostFormValues> = {},
  errors: PostFormErrors = {},
): PostFormState {
  return {
    values: {
      ...initialPostFormValues,
      ...values,
      tagIds: values.tagIds ?? initialPostFormValues.tagIds,
      seriesIds: values.seriesIds ?? initialPostFormValues.seriesIds,
      breadcrumbEnabled:
        values.breadcrumbEnabled ?? initialPostFormValues.breadcrumbEnabled,
      noindex: values.noindex ?? initialPostFormValues.noindex,
      nofollow: values.nofollow ?? initialPostFormValues.nofollow,
    },
    errors,
  };
}

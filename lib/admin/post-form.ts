export type PostFormValues = {
  title: string;
  slug: string;
  categoryId: string;
  excerpt: string;
  content: string;
  status: "draft" | "published" | "scheduled";
  scheduledAt: string;
  scheduledAtIso: string;
  tagIds: string[];
  seriesIds: string[];
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageMediaId: string;
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
  scheduledAt: "",
  scheduledAtIso: "",
  tagIds: [],
  seriesIds: [],
  metaTitle: "",
  metaDescription: "",
  ogTitle: "",
  ogDescription: "",
  ogImageMediaId: "",
  canonicalUrl: "",
  breadcrumbEnabled: false,
  noindex: false,
  nofollow: false,
};

export const initialPostFormState: PostFormState = {
  values: initialPostFormValues,
  errors: {},
};

export function formatScheduledAtInputFromIso(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function toScheduledAtIso(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

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

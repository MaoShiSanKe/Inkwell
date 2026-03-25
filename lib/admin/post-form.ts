export type PostFormValues = {
  title: string;
  slug: string;
  categoryId: string;
  excerpt: string;
  content: string;
  status: "draft" | "published";
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
    },
    errors,
  };
}

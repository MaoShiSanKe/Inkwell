export type FriendLinkFormValues = {
  siteName: string;
  url: string;
  description: string;
  logoMediaId: string;
  sortOrder: string;
  status: "draft" | "published" | "trash";
};

export type FriendLinkFormErrors = Partial<Record<keyof FriendLinkFormValues | "form", string>>;

export type FriendLinkFormState = {
  values: FriendLinkFormValues;
  errors: FriendLinkFormErrors;
};

export const initialFriendLinkFormValues: FriendLinkFormValues = {
  siteName: "",
  url: "",
  description: "",
  logoMediaId: "",
  sortOrder: "0",
  status: "draft",
};

export const initialFriendLinkFormState: FriendLinkFormState = {
  values: initialFriendLinkFormValues,
  errors: {},
};

export function createFriendLinkFormState(
  values: Partial<FriendLinkFormValues> = {},
  errors: FriendLinkFormErrors = {},
): FriendLinkFormState {
  return {
    values: {
      ...initialFriendLinkFormValues,
      ...values,
    },
    errors,
  };
}

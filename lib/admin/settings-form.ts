export type SettingsFormValues = {
  admin_path: string;
  revision_limit: string;
  revision_ttl_days: string;
  excerpt_length: string;
  comment_moderation: "pending" | "approved" | "";
};

export type SettingsFormErrors = Partial<
  Record<keyof SettingsFormValues | "form", string>
>;

export type SettingsFormState = {
  values: SettingsFormValues;
  errors: SettingsFormErrors;
};

export const initialSettingsFormValues: SettingsFormValues = {
  admin_path: "admin",
  revision_limit: "20",
  revision_ttl_days: "30",
  excerpt_length: "150",
  comment_moderation: "pending",
};

export const initialSettingsFormState: SettingsFormState = {
  values: initialSettingsFormValues,
  errors: {},
};

export function createSettingsFormState(
  values: Partial<SettingsFormValues> = {},
  errors: SettingsFormErrors = {},
): SettingsFormState {
  return {
    values: {
      ...initialSettingsFormValues,
      ...values,
    },
    errors,
  };
}

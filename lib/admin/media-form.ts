export type LocalImageUploadValues = {
  altText: string;
  caption: string;
  fileName: string;
};

export type LocalImageUploadErrors = Partial<
  Record<keyof LocalImageUploadValues | "image" | "form", string>
>;

export type LocalImageUploadState = {
  values: LocalImageUploadValues;
  errors: LocalImageUploadErrors;
};

export const initialLocalImageUploadValues: LocalImageUploadValues = {
  altText: "",
  caption: "",
  fileName: "",
};

export const initialLocalImageUploadState: LocalImageUploadState = {
  values: initialLocalImageUploadValues,
  errors: {},
};

export function createLocalImageUploadState(
  values: Partial<LocalImageUploadValues> = {},
  errors: LocalImageUploadErrors = {},
): LocalImageUploadState {
  return {
    values: {
      ...initialLocalImageUploadValues,
      ...values,
    },
    errors,
  };
}

export type ExternalImageFormValues = {
  externalUrl: string;
  altText: string;
  caption: string;
  width: string;
  height: string;
};

export type ExternalImageFormErrors = Partial<
  Record<keyof ExternalImageFormValues | "form", string>
>;

export type ExternalImageFormState = {
  values: ExternalImageFormValues;
  errors: ExternalImageFormErrors;
};

export const initialExternalImageFormValues: ExternalImageFormValues = {
  externalUrl: "",
  altText: "",
  caption: "",
  width: "",
  height: "",
};

export const initialExternalImageFormState: ExternalImageFormState = {
  values: initialExternalImageFormValues,
  errors: {},
};

export function createExternalImageFormState(
  values: Partial<ExternalImageFormValues> = {},
  errors: ExternalImageFormErrors = {},
): ExternalImageFormState {
  return {
    values: {
      ...initialExternalImageFormValues,
      ...values,
    },
    errors,
  };
}

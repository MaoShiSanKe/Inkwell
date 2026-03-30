export type SubscriptionFormValues = {
  displayName: string;
  email: string;
};

export type SubscriptionFormErrors = Partial<Record<keyof SubscriptionFormValues | "form", string>>;

export type SubscriptionFormSubmissionStatus = "idle" | "created" | "existing" | "unsubscribed";

export type SubscriptionFormState = {
  values: SubscriptionFormValues;
  errors: SubscriptionFormErrors;
  submissionStatus: SubscriptionFormSubmissionStatus;
  message: string | null;
};

export const initialSubscriptionFormValues: SubscriptionFormValues = {
  displayName: "",
  email: "",
};

export const initialSubscriptionFormState: SubscriptionFormState = {
  values: initialSubscriptionFormValues,
  errors: {},
  submissionStatus: "idle",
  message: null,
};

export function createSubscriptionFormState(
  values: Partial<SubscriptionFormValues> = {},
  errors: SubscriptionFormErrors = {},
  submissionStatus: SubscriptionFormSubmissionStatus = "idle",
  message: string | null = null,
): SubscriptionFormState {
  return {
    values: {
      ...initialSubscriptionFormValues,
      ...values,
    },
    errors,
    submissionStatus,
    message,
  };
}

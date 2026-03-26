export type IpBlacklistFormValues = {
  network: string;
  reason: string;
};

export type IpBlacklistFormErrors = Partial<
  Record<keyof IpBlacklistFormValues | "form", string>
>;

export type IpBlacklistFormState = {
  values: IpBlacklistFormValues;
  errors: IpBlacklistFormErrors;
};

export const initialIpBlacklistFormValues: IpBlacklistFormValues = {
  network: "",
  reason: "",
};

export const initialIpBlacklistFormState: IpBlacklistFormState = {
  values: initialIpBlacklistFormValues,
  errors: {},
};

export function createIpBlacklistFormState(
  values: Partial<IpBlacklistFormValues> = {},
  errors: IpBlacklistFormErrors = {},
): IpBlacklistFormState {
  return {
    values: {
      ...initialIpBlacklistFormValues,
      ...values,
    },
    errors,
  };
}

export type TaxonomyFormValues = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
};

export type TaxonomyFormErrors = Partial<
  Record<keyof TaxonomyFormValues | "form", string>
>;

export type TaxonomyFormState = {
  values: TaxonomyFormValues;
  errors: TaxonomyFormErrors;
};

export const initialTaxonomyFormValues: TaxonomyFormValues = {
  name: "",
  slug: "",
  description: "",
  parentId: "",
};

export const initialTaxonomyFormState: TaxonomyFormState = {
  values: initialTaxonomyFormValues,
  errors: {},
};

export function createTaxonomyFormState(
  values: Partial<TaxonomyFormValues> = {},
  errors: TaxonomyFormErrors = {},
): TaxonomyFormState {
  return {
    values: {
      ...initialTaxonomyFormValues,
      ...values,
    },
    errors,
  };
}

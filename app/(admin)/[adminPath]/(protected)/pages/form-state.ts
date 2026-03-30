import { initialPageFormState, type PageFormState } from "@/lib/admin/page-form";

export type CreatePageActionState = PageFormState;
export type UpdatePageActionState = PageFormState;

export const initialCreatePageState = initialPageFormState;
export const initialUpdatePageState = initialPageFormState;

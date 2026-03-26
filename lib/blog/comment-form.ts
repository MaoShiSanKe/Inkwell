export type CommentFormValues = {
  postId: string;
  parentId: string;
  authorName: string;
  authorEmail: string;
  authorUrl: string;
  content: string;
};

export type CommentFormErrors = Partial<
  Record<keyof CommentFormValues | "form", string>
>;

export type CommentFormSubmissionStatus = "idle" | "approved" | "pending";

export type CommentFormState = {
  values: CommentFormValues;
  errors: CommentFormErrors;
  submissionStatus: CommentFormSubmissionStatus;
  message: string | null;
};

export const initialCommentFormValues: CommentFormValues = {
  postId: "",
  parentId: "",
  authorName: "",
  authorEmail: "",
  authorUrl: "",
  content: "",
};

export const initialCommentFormState: CommentFormState = {
  values: initialCommentFormValues,
  errors: {},
  submissionStatus: "idle",
  message: null,
};

export function createCommentFormState(
  values: Partial<CommentFormValues> = {},
  errors: CommentFormErrors = {},
  submissionStatus: CommentFormSubmissionStatus = "idle",
  message: string | null = null,
): CommentFormState {
  return {
    values: {
      ...initialCommentFormValues,
      ...values,
    },
    errors,
    submissionStatus,
    message,
  };
}

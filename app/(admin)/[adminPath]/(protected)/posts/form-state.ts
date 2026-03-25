import { initialPostFormState, type PostFormState } from "@/lib/admin/post-form";

export type CreatePostActionState = PostFormState;
export type UpdatePostActionState = PostFormState;

export const initialCreatePostState = initialPostFormState;
export const initialUpdatePostState = initialPostFormState;

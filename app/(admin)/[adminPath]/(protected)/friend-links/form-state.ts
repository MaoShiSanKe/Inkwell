import { initialFriendLinkFormState, type FriendLinkFormState } from "@/lib/admin/friend-link-form";

export type CreateFriendLinkActionState = FriendLinkFormState;
export type UpdateFriendLinkActionState = FriendLinkFormState;

export const initialCreateFriendLinkState = initialFriendLinkFormState;
export const initialUpdateFriendLinkState = initialFriendLinkFormState;

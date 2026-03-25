import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "editor",
  "author",
  "subscriber",
]);

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "published",
  "scheduled",
  "trash",
]);

export const commentStatusEnum = pgEnum("comment_status", [
  "pending",
  "approved",
  "spam",
  "trash",
]);

export const mediaSourceEnum = pgEnum("media_source", ["local", "external"]);

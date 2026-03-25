import { boolean, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";

import { media } from "./media";
import { posts } from "./posts";

export const postMeta = pgTable("post_meta", {
  postId: integer("post_id")
    .primaryKey()
    .references(() => posts.id, { onDelete: "cascade" }),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  ogTitle: varchar("og_title", { length: 255 }),
  ogDescription: text("og_description"),
  ogImageMediaId: integer("og_image_media_id").references(() => media.id, {
    onDelete: "set null",
  }),
  canonicalUrl: text("canonical_url"),
  breadcrumbEnabled: boolean("breadcrumb_enabled").notNull().default(false),
  noindex: boolean("noindex").notNull().default(false),
  nofollow: boolean("nofollow").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

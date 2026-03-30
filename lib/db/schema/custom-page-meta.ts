import { boolean, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";

import { media } from "./media";
import { customPages } from "./custom-pages";

export const customPageMeta = pgTable("custom_page_meta", {
  pageId: integer("page_id")
    .primaryKey()
    .references(() => customPages.id, { onDelete: "cascade" }),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  ogTitle: varchar("og_title", { length: 255 }),
  ogDescription: text("og_description"),
  ogImageMediaId: integer("og_image_media_id").references(() => media.id, {
    onDelete: "set null",
  }),
  canonicalUrl: text("canonical_url"),
  noindex: boolean("noindex").notNull().default(false),
  nofollow: boolean("nofollow").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

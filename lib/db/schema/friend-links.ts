import { check, index, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { friendLinkStatusEnum } from "./enums";
import { media } from "./media";
import { users } from "./users";

export const friendLinks = pgTable(
  "friend_links",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    siteName: varchar("site_name", { length: 160 }).notNull(),
    url: text("url").notNull(),
    description: text("description").notNull().default(""),
    logoMediaId: integer("logo_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    status: friendLinkStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("friend_links_author_idx").on(table.authorId),
    index("friend_links_logo_media_idx").on(table.logoMediaId),
    index("friend_links_status_sort_idx").on(table.status, table.sortOrder, table.siteName),
    check(
      "friend_links_published_at_required",
      sql`(${table.status} <> 'published' or ${table.publishedAt} is not null)`,
    ),
  ],
);

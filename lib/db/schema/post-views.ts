import { check, date, integer, primaryKey, timestamp } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { posts } from "./posts";

export const postViews = pgTable(
  "post_views",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    viewDate: date("view_date", { mode: "string" }).notNull(),
    viewCount: integer("view_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.viewDate], name: "post_views_pk" }),
    check("post_views_count_non_negative", sql`${table.viewCount} >= 0`),
  ],
);

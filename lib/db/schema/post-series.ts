import { check, index, integer, primaryKey, timestamp } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { posts } from "./posts";
import { series } from "./series";

export const postSeries = pgTable(
  "post_series",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    seriesId: integer("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.seriesId], name: "post_series_pk" }),
    index("post_series_series_order_idx").on(table.seriesId, table.orderIndex),
    check("post_series_order_non_negative", sql`${table.orderIndex} >= 0`),
  ],
);

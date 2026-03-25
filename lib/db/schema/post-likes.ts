import { integer, primaryKey, timestamp } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";

import { inet } from "./custom-types";
import { posts } from "./posts";

export const postLikes = pgTable(
  "post_likes",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    ipAddress: inet("ip_address").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.ipAddress], name: "post_likes_pk" }),
  ],
);

import { index, integer, primaryKey, timestamp } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";

import { posts } from "./posts";
import { tags } from "./tags";

export const postTags = pgTable(
  "post_tags",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tagId], name: "post_tags_pk" }),
    index("post_tags_tag_idx").on(table.tagId),
  ],
);

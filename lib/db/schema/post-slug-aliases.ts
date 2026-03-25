import { index, integer, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";

import { posts } from "./posts";

export const postSlugAliases = pgTable(
  "post_slug_aliases",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("post_slug_aliases_slug_unique").on(table.slug),
    index("post_slug_aliases_post_idx").on(table.postId),
  ],
);

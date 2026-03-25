import { index, integer, real, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";

import { posts } from "./posts";

export const sitemapEntries = pgTable(
  "sitemap_entries",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postId: integer("post_id").references(() => posts.id, {
      onDelete: "cascade",
    }),
    loc: varchar("loc", { length: 255 }).notNull(),
    changeFreq: varchar("change_freq", { length: 32 }),
    priority: real("priority"),
    lastModifiedAt: timestamp("last_modified_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sitemap_entries_loc_unique").on(table.loc),
    uniqueIndex("sitemap_entries_post_unique").on(table.postId),
    index("sitemap_entries_last_modified_idx").on(table.lastModifiedAt),
  ],
);

import { index, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";

import { postStatusEnum } from "./enums";
import { posts } from "./posts";
import { users } from "./users";

export const postRevisions = pgTable(
  "post_revisions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    editorId: integer("editor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    excerpt: text("excerpt"),
    content: text("content").notNull(),
    status: postStatusEnum("status").notNull(),
    reason: varchar("reason", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("post_revisions_post_created_idx").on(table.postId, table.createdAt),
    index("post_revisions_editor_idx").on(table.editorId),
  ],
);

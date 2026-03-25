import { AnyPgColumn, index, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";

import { inet } from "./custom-types";
import { commentStatusEnum } from "./enums";
import { posts } from "./posts";
import { users } from "./users";

export const comments = pgTable(
  "comments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references((): AnyPgColumn => comments.id, {
      onDelete: "cascade",
    }),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    authorName: varchar("author_name", { length: 120 }).notNull(),
    authorEmail: varchar("author_email", { length: 255 }).notNull(),
    authorUrl: varchar("author_url", { length: 255 }),
    content: text("content").notNull(),
    status: commentStatusEnum("status").notNull().default("pending"),
    ipAddress: inet("ip_address").notNull(),
    userAgent: varchar("user_agent", { length: 512 }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("comments_post_idx").on(table.postId),
    index("comments_post_status_created_idx").on(
      table.postId,
      table.status,
      table.createdAt,
    ),
    index("comments_parent_idx").on(table.parentId),
    index("comments_author_email_idx").on(table.authorEmail),
  ],
);

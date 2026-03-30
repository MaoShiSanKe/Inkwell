import { check, index, integer, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { postStatusEnum } from "./enums";
import { users } from "./users";

export const customPages = pgTable(
  "custom_pages",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    content: text("content").notNull(),
    status: postStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("custom_pages_slug_unique").on(table.slug),
    index("custom_pages_author_idx").on(table.authorId),
    index("custom_pages_status_published_idx").on(table.status, table.publishedAt),
    check(
      "custom_pages_published_at_required",
      sql`(${table.status} not in ('published', 'scheduled') or ${table.publishedAt} is not null)`,
    ),
  ],
);

import { boolean, index, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";

import { users } from "./users";

export const siteNavigation = pgTable(
  "site_navigation",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    label: varchar("label", { length: 80 }).notNull(),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    openInNewTab: boolean("open_in_new_tab").notNull().default(false),
    visible: boolean("visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("site_navigation_author_idx").on(table.authorId),
    index("site_navigation_visible_sort_idx").on(table.visible, table.sortOrder, table.label),
  ],
);

import { check, index, integer, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { cidr } from "./custom-types";
import { users } from "./users";

export const ipBlacklist = pgTable(
  "ip_blacklist",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    network: cidr("network").notNull(),
    reason: varchar("reason", { length: 255 }),
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ip_blacklist_network_unique").on(table.network),
    index("ip_blacklist_expires_idx").on(table.expiresAt),
    check(
      "ip_blacklist_expires_after_created",
      sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

import { bigint, check, index, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { mediaSourceEnum } from "./enums";
import { users } from "./users";

export const media = pgTable(
  "media",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    uploaderId: integer("uploader_id").references(() => users.id, {
      onDelete: "set null",
    }),
    source: mediaSourceEnum("source").notNull(),
    originalFilename: varchar("original_filename", { length: 255 }),
    mimeType: varchar("mime_type", { length: 120 }),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    width: integer("width"),
    height: integer("height"),
    storagePath: text("storage_path"),
    thumbnailPath: text("thumbnail_path"),
    externalUrl: text("external_url"),
    altText: varchar("alt_text", { length: 255 }),
    caption: text("caption"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("media_source_idx").on(table.source),
    index("media_uploader_idx").on(table.uploaderId),
    index("media_created_idx").on(table.createdAt),
    check(
      "media_local_requires_storage_path",
      sql`(${table.source} <> 'local' or ${table.storagePath} is not null)`,
    ),
    check(
      "media_external_requires_url",
      sql`(${table.source} <> 'external' or ${table.externalUrl} is not null)`,
    ),
  ],
);

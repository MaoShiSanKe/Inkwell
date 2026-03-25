import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { emailNotifications, settings } from "../lib/db/schema/index";
import {
  DEFAULT_EMAIL_NOTIFICATION_SCENARIOS,
  getDefaultSettingRows,
} from "../lib/settings-config";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const client = postgres(connectionString, {
  max: 1,
});

const db = drizzle(client, {
  schema: {
    settings,
    emailNotifications,
  },
  casing: "snake_case",
});

async function seedSettings() {
  for (const row of getDefaultSettingRows()) {
    const updatedAt = new Date();

    await db
      .insert(settings)
      .values({
        ...row,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: row.value,
          isSecret: row.isSecret,
          updatedAt,
        },
      });
  }
}

async function seedEmailNotifications() {
  for (const row of DEFAULT_EMAIL_NOTIFICATION_SCENARIOS) {
    const updatedAt = new Date();

    await db
      .insert(emailNotifications)
      .values({
        ...row,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: emailNotifications.scenario,
        set: {
          description: row.description,
          enabled: row.enabled,
          updatedAt,
        },
      });
  }
}

async function main() {
  await seedSettings();
  await seedEmailNotifications();
  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });

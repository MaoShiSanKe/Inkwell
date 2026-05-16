import { pathToFileURL } from "node:url";

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { publishScheduledPostsWithDb } from "../lib/publishing/scheduled-posts";
import * as schema from "../lib/db/schema";

config({ path: ".env.local" });

function createDbContext() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const client = postgres(connectionString, {
    max: 1,
  });

  const db = drizzle(client, {
    schema,
    casing: "snake_case",
  });

  return { client, db };
}

export async function main() {
  const { client, db } = createDbContext();

  try {
    const result = await publishScheduledPostsWithDb(db);

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

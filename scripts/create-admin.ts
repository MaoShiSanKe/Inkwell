import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { users } from "../lib/db/schema";
import { hashPasswordValue } from "../lib/password-utils";

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
    users,
  },
  casing: "snake_case",
});

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const username = process.argv[3]?.trim().toLowerCase();
  const displayName = process.argv[4]?.trim();
  const password = process.argv[5];

  if (!email || !username || !displayName || !password) {
    throw new Error(
      "Usage: npm run admin:create -- <email> <username> <displayName> <password>",
    );
  }

  const passwordHash = hashPasswordValue(password);
  const updatedAt = new Date();

  await db
    .insert(users)
    .values({
      email,
      username,
      displayName,
      passwordHash,
      role: "super_admin",
      updatedAt,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        username,
        displayName,
        passwordHash,
        role: "super_admin",
        updatedAt,
      },
    });

  console.log(`Admin user ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });

import { pathToFileURL } from "node:url";

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { users } from "../lib/db/schema";
import { hashPasswordValue } from "../lib/password-utils";

const USERNAME_MAX_LENGTH = 64;

config({ path: ".env.local" });

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, USERNAME_MAX_LENGTH)
    .replace(/^-|-$/g, "");
}

function createDbContext() {
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

  return { client, db };
}

export async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const rawUsername = process.argv[3];
  const username = rawUsername ? normalizeUsername(rawUsername) : undefined;
  const displayName = process.argv[4]?.trim();
  const password = process.argv[5];

  if (!email || !rawUsername || !displayName || !password) {
    throw new Error(
      "Usage: npm run admin:create -- <email> <username> <displayName> <password>",
    );
  }

  if (!username) {
    throw new Error("Username must contain at least one lowercase letter, number, or hyphen.");
  }

  const { client, db } = createDbContext();

  try {
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

import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

const testEnvPath = resolveTestEnvPath();

config({ path: testEnvPath, override: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(`DATABASE_URL is not configured in ${testEnvPath}.`);
}

const connectionInfo = getConnectionInfo(connectionString);

assertSafeTestConnection(testEnvPath, connectionInfo);

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema/index.ts",
  out: "./lib/db/migrations",
  dbCredentials: {
    url: connectionString,
  },
  strict: true,
  verbose: true,
});

function resolveTestEnvPath() {
  const envCandidates = [".env.test.local", ".env.local"];

  for (const candidate of envCandidates) {
    const candidatePath = resolve(process.cwd(), candidate);

    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(
    `Missing test env file. Expected one of: ${envCandidates.join(", ")}. Create one before running db:migrate:test.`,
  );
}

function assertSafeTestConnection(
  envPath: string,
  connectionInfo: { databaseName: string; hostname: string },
) {
  if (basename(envPath) === ".env.test.local") {
    if (!connectionInfo.databaseName.toLowerCase().includes("_test")) {
      throw new Error(
        `Refusing to run test migrations against non-test database "${connectionInfo.databaseName}". DATABASE_URL must point to a database name containing "_test".`,
      );
    }

    return;
  }

  if (!isLocalHostname(connectionInfo.hostname)) {
    throw new Error(
      `.env.local is only allowed for test migrations when DATABASE_URL points to a local database host. Received host "${connectionInfo.hostname}".`,
    );
  }
}

function getConnectionInfo(connectionUrl: string) {
  try {
    const { hostname, pathname } = new URL(connectionUrl);
    const databaseName = pathname.replace(/^\/+/, "").split("/")[0];

    if (!databaseName) {
      throw new Error("DATABASE_URL is missing a database name.");
    }

    return {
      databaseName,
      hostname,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Invalid DATABASE_URL for test database. ${reason}`);
  }
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

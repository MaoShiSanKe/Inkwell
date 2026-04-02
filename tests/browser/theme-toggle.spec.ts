import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { settings } from "../../lib/db/schema";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("theme toggle browser regression", () => {
  test("uses backend default mode across public and admin routes when no stored theme exists", async ({ page }) => {
    const fixture = await seedThemeFixture("dark");

    try {
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto("/");

      await expect(page.getByRole("button", { name: "切换深色模式" })).toBeVisible();
      await expect(page.getByRole("button", { name: "切换深色模式" })).toHaveClass(/focus-visible:ring-blue-500\/40/);
      await expect(page.getByRole("button", { name: "切换深色模式" })).toHaveClass(/hover:border-blue-300/);
      await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(page.getByRole("button", { name: "切换深色模式" })).toContainText("浅色模式");

      await page.goto("/search");
      await expect(page.getByRole("button", { name: "切换深色模式" })).toBeVisible();
      await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(page.getByRole("button", { name: "切换深色模式" })).toContainText("浅色模式");

      await page.goto(`/${fixture.adminPath}/login`);
      await expect(page.getByRole("button", { name: "切换深色模式" })).toBeVisible();
      await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(page.getByRole("button", { name: "切换深色模式" })).toContainText("浅色模式");
    } finally {
      await cleanupThemeFixture(
        fixture.originalPublicThemeDefaultMode,
        fixture.originalPublicAccentTheme,
      );
    }
  });

  test("prefers stored theme over backend default and keeps user choice across routes", async ({ page }) => {
    const fixture = await seedThemeFixture("dark");

    try {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/");
      await page.evaluate(() => {
        window.localStorage.setItem("inkwell-theme", "light");
      });
      await page.reload();

      await expect(page.locator("html")).not.toHaveClass(/dark/);
      await expect(page.getByRole("button", { name: "切换深色模式" })).toContainText("深色模式");

      await page.getByRole("button", { name: "切换深色模式" }).click();
      await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(page.getByRole("button", { name: "切换深色模式" })).toContainText("浅色模式");
      await expect
        .poll(() => page.evaluate(() => window.localStorage.getItem("inkwell-theme")))
        .toBe("dark");

      await page.goto("/search");
      await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(page.getByRole("button", { name: "切换深色模式" })).toContainText("浅色模式");

      await page.goto(`/${fixture.adminPath}/login`);
      await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(page.getByRole("button", { name: "切换深色模式" })).toContainText("浅色模式");
    } finally {
      await cleanupThemeFixture(
        fixture.originalPublicThemeDefaultMode,
        fixture.originalPublicAccentTheme,
      );
    }
  });

  test("falls back to system preference when backend default mode is system", async ({ page }) => {
    const fixture = await seedThemeFixture("system");

    try {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/");

      await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(page.getByRole("button", { name: "切换深色模式" })).toContainText("浅色模式");
    } finally {
      await cleanupThemeFixture(
        fixture.originalPublicThemeDefaultMode,
        fixture.originalPublicAccentTheme,
      );
    }
  });
});

type ThemeFixture = {
  adminPath: string;
  originalPublicThemeDefaultMode: string | null;
  originalPublicAccentTheme: string | null;
};

async function seedThemeFixture(defaultMode: "system" | "light" | "dark"): Promise<ThemeFixture> {
  const originalPublicThemeDefaultMode = await getSettingValue("public_theme_default_mode");
  const originalPublicAccentTheme = await getSettingValue("public_accent_theme");
  const adminPath = await getConfiguredAdminPath();

  await restoreSetting("public_theme_default_mode", defaultMode);
  await restoreSetting("public_accent_theme", "blue");

  return {
    adminPath,
    originalPublicThemeDefaultMode,
    originalPublicAccentTheme,
  };
}

async function cleanupThemeFixture(
  originalPublicThemeDefaultMode: string | null,
  originalPublicAccentTheme: string | null,
) {
  await restoreSetting("public_theme_default_mode", originalPublicThemeDefaultMode);
  await restoreSetting("public_accent_theme", originalPublicAccentTheme);
}

async function getConfiguredAdminPath() {
  const value = await getSettingValue("admin_path");
  return value?.trim() || "admin";
}

async function getSettingValue(
  key: "admin_path" | "public_theme_default_mode" | "public_accent_theme",
) {
  return withDb(async (db) => {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    return row?.value ?? null;
  });
}

async function restoreSetting(
  key: "public_theme_default_mode" | "public_accent_theme",
  value: "system" | "light" | "dark" | "slate" | "blue" | "emerald" | "amber" | string | null,
) {
  await withDb(async (db) => {
    if (value === null) {
      await db.delete(settings).where(eq(settings.key, key));
      return;
    }

    await db
      .insert(settings)
      .values({
        key,
        value,
        isSecret: false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value,
          isSecret: false,
          updatedAt: new Date(),
        },
      });
  });
}

async function withDb<T>(callback: (db: ReturnType<typeof drizzle>) => Promise<T>) {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, {
    schema: { settings },
    casing: "snake_case",
  });

  try {
    return await callback(db);
  } finally {
    await client.end({ timeout: 0 });
  }
}

function resolveTestEnvPath() {
  const envCandidates = [".env.test.local", ".env.local"];

  for (const candidate of envCandidates) {
    const candidatePath = resolve(process.cwd(), candidate);

    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(
    `Missing test env file. Expected one of: ${envCandidates.join(", ")}. Create one before running browser tests.`,
  );
}

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;

  if (!value) {
    throw new Error(`DATABASE_URL is not configured in ${testEnvPath}.`);
  }

  return value;
}

function assertSafeTestConnection(
  envPath: string,
  connectionInfo: { databaseName: string; hostname: string },
) {
  if (basename(envPath) === ".env.test.local") {
    if (!connectionInfo.databaseName.toLowerCase().includes("_test")) {
      throw new Error(
        [
          `Refusing to run browser tests against non-test database "${connectionInfo.databaseName}".`,
          'DATABASE_URL must point to a database name containing "_test".',
        ].join(" "),
      );
    }

    return;
  }

  if (!isLocalHostname(connectionInfo.hostname)) {
    throw new Error(
      [
        ".env.local is only allowed for browser tests when DATABASE_URL points to a local database host.",
        `Received host "${connectionInfo.hostname}".`,
      ].join(" "),
    );
  }
}

function getConnectionInfo(connectionUrl: string) {
  try {
    const { hostname, pathname } = new URL(connectionUrl);
    const name = pathname.replace(/^\/+/, "").split("/")[0];

    if (!name) {
      throw new Error("DATABASE_URL is missing a database name.");
    }

    return {
      databaseName: name,
      hostname,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Invalid DATABASE_URL for browser tests. ${reason}`);
  }
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

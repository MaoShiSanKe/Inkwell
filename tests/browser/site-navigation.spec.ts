import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { settings, siteNavigation, users } from "../../lib/db/schema";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-site-navigation-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("site navigation browser regression", () => {
  test("renders visible header navigation items in order and respects new-tab links", async ({ page }) => {
    const seed = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const originalThemeSettings = await captureThemeSettings();

    try {
      await seedSiteNavigationFixture(seed);
      await page.goto("/");

      const nav = page.getByRole("navigation", { name: "站点导航" });
      await expect(nav).toBeVisible();
      await expect(nav.getByRole("link", { name: "首页" })).toHaveAttribute("href", "/");
      await expect(nav.getByRole("link", { name: "关于" })).toHaveAttribute("href", "/about");
      await expect(nav.getByRole("link", { name: "外链" })).toHaveAttribute("href", "https://example.com");
      await expect(nav.getByRole("link", { name: "外链" })).toHaveAttribute("target", "_blank");
      await expect(nav.getByRole("link", { name: "隐藏项" })).toHaveCount(0);

      const labels = await nav.getByRole("link").allTextContents();
      expect(labels).toEqual(["首页", "关于", "外链"]);
    } finally {
      await cleanupThemeSettings(originalThemeSettings);
      await cleanupSiteNavigationFixture();
    }
  });
});

type ThemeSettingsSnapshot = {
  public_layout_width: string | null;
  public_surface_variant: string | null;
  public_accent_theme: string | null;
};

async function seedSiteNavigationFixture(seed: string) {
  await cleanupSiteNavigationFixture();

  await withDb(async (db) => {
    const [author] = await db
      .insert(users)
      .values({
        email: `${BROWSER_PREFIX}${seed}@example.com`,
        username: `${BROWSER_PREFIX}${seed}`,
        displayName: "Site Navigation Author",
        passwordHash: "hashed-password",
        role: "editor",
      })
      .returning({ id: users.id });

    await db.insert(siteNavigation).values([
      {
        authorId: author.id,
        label: "关于",
        url: "/about",
        sortOrder: 2,
        openInNewTab: false,
        visible: true,
        updatedAt: new Date(),
      },
      {
        authorId: author.id,
        label: "首页",
        url: "/",
        sortOrder: 1,
        openInNewTab: false,
        visible: true,
        updatedAt: new Date(),
      },
      {
        authorId: author.id,
        label: "隐藏项",
        url: "/hidden",
        sortOrder: 3,
        openInNewTab: false,
        visible: false,
        updatedAt: new Date(),
      },
      {
        authorId: author.id,
        label: "外链",
        url: "https://example.com",
        sortOrder: 4,
        openInNewTab: true,
        visible: true,
        updatedAt: new Date(),
      },
    ]);
  });
}

async function cleanupSiteNavigationFixture() {
  await withDb(async (db) => {
    const browserUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.username, `${BROWSER_PREFIX}%`));

    if (browserUsers.length > 0) {
      await db.delete(siteNavigation).where(
        inArray(
          siteNavigation.authorId,
          browserUsers.map((user) => user.id),
        ),
      );

      await db.delete(users).where(
        and(
          inArray(
            users.id,
            browserUsers.map((user) => user.id),
          ),
          like(users.username, `${BROWSER_PREFIX}%`),
        ),
      );
    }
  });
}

async function captureThemeSettings(): Promise<ThemeSettingsSnapshot> {
  return {
    public_layout_width: await getSettingValue("public_layout_width"),
    public_surface_variant: await getSettingValue("public_surface_variant"),
    public_accent_theme: await getSettingValue("public_accent_theme"),
  };
}

async function cleanupThemeSettings(snapshot: ThemeSettingsSnapshot) {
  await restoreSetting("public_layout_width", snapshot.public_layout_width);
  await restoreSetting("public_surface_variant", snapshot.public_surface_variant);
  await restoreSetting("public_accent_theme", snapshot.public_accent_theme);
}

async function getSettingValue(
  key: "public_layout_width" | "public_surface_variant" | "public_accent_theme",
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
  key: "public_layout_width" | "public_surface_variant" | "public_accent_theme",
  value: string | null,
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
    schema: { settings, siteNavigation, users },
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

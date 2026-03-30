import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { eq, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { customPageMeta, customPages, settings, users } from "../../lib/db/schema";
import { hashPasswordValue } from "../../lib/password-utils";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-custom-pages-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("custom pages browser regression", () => {
  test("creates a published page and serves it at the root slug", async ({ page, request }) => {
    const fixture = await seedCustomPageFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(
        `/${fixture.adminPath}/login?redirect=${encodeURIComponent(`/${fixture.adminPath}/pages/new`)}`,
      );
      await page.getByLabel("邮箱").fill(fixture.email);
      await page.getByLabel("密码").fill(fixture.password);
      await page.getByRole("button", { name: "登录后台" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/pages/new$`));
      await page.locator('input[name="title"]').fill(fixture.title);
      await page.getByLabel("Slug").fill(fixture.slug);
      await page.locator('textarea[name="content"]').fill(["Intro", "", "## Section", "Body"].join("\n"));
      await page.getByLabel("状态").selectOption("published");
      await page.getByRole("button", { name: "保存页面" }).click();

      await expect.poll(() => new URL(page.url()).pathname).toBe(`/${fixture.adminPath}/pages`);
      await expect.poll(() => new URL(page.url()).searchParams.get("created")).toBe("1");
      await expect.poll(() => fetchCreatedPageRecord(fixture.slug)).toEqual({
        slug: fixture.slug,
        status: "published",
      });

      const internalResponse = await request.get(`/standalone/${fixture.slug}`);
      expect(internalResponse.ok()).toBe(true);
      const internalHtml = await internalResponse.text();
      expect(internalHtml).toContain(fixture.title);
      expect(internalHtml).toContain("文章目录");
      expect(internalHtml).toContain("Section");

      await page.goto(`/${fixture.slug}`);
      await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();
      await expect(page.getByText("文章目录")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Section" })).toBeVisible();

      const sitemapResponse = await request.get("/sitemap.xml");
      expect(sitemapResponse.ok()).toBe(true);
      const sitemapBody = await sitemapResponse.text();
      expect(sitemapBody).toContain(`<loc>/${fixture.slug}</loc>`);
    } finally {
      await cleanupCustomPageFixture();
    }
  });
});

type CustomPageFixture = {
  adminPath: string;
  email: string;
  password: string;
  title: string;
  slug: string;
};

async function seedCustomPageFixture(seed: string): Promise<CustomPageFixture> {
  await cleanupCustomPageFixture();

  const adminPath = await getConfiguredAdminPath();
  const email = `${BROWSER_PREFIX}${seed}@example.com`;
  const username = `${BROWSER_PREFIX}${seed}`;
  const password = `pw-${seed}-${randomUUID().slice(0, 8)}`;
  const title = `Browser Custom Page ${seed}`;
  const slug = `${BROWSER_PREFIX}${seed}`;

  await withDb(async (db) => {
    await db.insert(users).values({
      email,
      username,
      displayName: "Browser Custom Page Editor",
      passwordHash: hashPasswordValue(password),
      role: "editor",
    });
  });

  return {
    adminPath,
    email,
    password,
    title,
    slug,
  };
}

async function cleanupCustomPageFixture() {
  await withDb(async (db) => {
    const browserUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        or(
          like(users.username, `${BROWSER_PREFIX}%`),
          like(users.email, `${BROWSER_PREFIX}%`),
        ),
      );

    const browserPages = await db
      .select({ id: customPages.id })
      .from(customPages)
      .where(
        browserUsers.length > 0
          ? inArray(
              customPages.authorId,
              browserUsers.map((user) => user.id),
            )
          : like(customPages.slug, `${BROWSER_PREFIX}%`),
      );

    if (browserPages.length > 0) {
      await db.delete(customPageMeta).where(
        inArray(
          customPageMeta.pageId,
          browserPages.map((page) => page.id),
        ),
      );

      await db.delete(customPages).where(
        inArray(
          customPages.id,
          browserPages.map((page) => page.id),
        ),
      );
    }

    if (browserUsers.length > 0) {
      await db.delete(users).where(
        inArray(
          users.id,
          browserUsers.map((user) => user.id),
        ),
      );
    }
  });
}

async function getConfiguredAdminPath() {
  return withDb(async (db) => {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "admin_path"))
      .limit(1);

    return row?.value?.trim() || "admin";
  });
}

async function withDb<T>(callback: (db: ReturnType<typeof drizzle>) => Promise<T>) {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, {
    schema: { customPageMeta, customPages, settings, users },
    casing: "snake_case",
  });

  try {
    return await callback(db);
  } finally {
    await client.end({ timeout: 0 });
  }
}

async function fetchCreatedPageRecord(expectedSlug: string) {
  return withDb(async (db) => {
    const [row] = await db
      .select({ slug: customPages.slug, status: customPages.status })
      .from(customPages)
      .where(eq(customPages.slug, expectedSlug))
      .limit(1);

    return row ? { slug: row.slug, status: row.status } : null;
  });
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

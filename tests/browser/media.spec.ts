import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, desc, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { media, postMeta, posts, settings, users } from "../../lib/db/schema";
import { hashPasswordValue } from "../../lib/password-utils";

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-media-";
const TEST_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5np8sAAAAASUVORK5CYII=";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("media library browser regression", () => {
  test("covers external creation, local upload, body insertion, and OG image selection", async ({ page }) => {
    const fixture = await seedMediaFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);

    try {
      await page.goto(
        `/${fixture.adminPath}/login?redirect=${encodeURIComponent(`/${fixture.adminPath}/media`)}`,
      );
      await page.getByLabel("邮箱").fill(fixture.email);
      await page.getByLabel("密码").fill(fixture.password);
      await page.getByRole("button", { name: "登录后台" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/media$`));
      await expect(page.getByRole("heading", { name: "媒体库" })).toBeVisible();

      const externalForm = page.locator("form").filter({
        has: page.getByRole("heading", { name: "外链图片" }),
      });
      await externalForm.getByLabel("图片地址").fill(fixture.externalUrl);
      await externalForm.getByLabel("Alt 文本").fill(fixture.externalAltText);
      await externalForm.getByLabel("说明").fill("Browser external caption");
      await externalForm.getByLabel("宽度").fill("1200");
      await externalForm.getByLabel("高度").fill("630");
      await externalForm.getByRole("button", { name: "添加外链" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/media\\?created=1$`));
      await expect(page.getByText("外链图片已添加到媒体库。")).toBeVisible();
      await expect(page.getByText(fixture.externalAltText)).toBeVisible();

      const localForm = page.locator("form").filter({
        has: page.getByRole("heading", { name: "本地上传" }),
      });
      await localForm.getByLabel("Alt 文本").fill(fixture.localAltText);
      await localForm.getByLabel("说明").fill("Browser local caption");
      await localForm.locator('input[name="image"]').setInputFiles({
        name: `${BROWSER_PREFIX}${fixture.seed}.png`,
        mimeType: "image/png",
        buffer: Buffer.from(TEST_IMAGE_BASE64, "base64"),
      });
      await localForm.getByRole("button", { name: "上传图片" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/media\\?uploaded=1$`));
      await expect(page.getByText("图片已上传，并写入媒体库。")).toBeVisible();
      await expect(page.getByText(fixture.localAltText)).toBeVisible();

      const uploadedMedia = await findMediaByAltText(fixture.localAltText);

      if (!uploadedMedia?.storagePath || !uploadedMedia.thumbnailPath) {
        throw new Error("Expected uploaded local media with storage paths.");
      }

      expect(existsSync(resolve(process.cwd(), "public", uploadedMedia.storagePath))).toBe(true);
      expect(existsSync(resolve(process.cwd(), "public", uploadedMedia.thumbnailPath))).toBe(true);

      const expectedBodyContent = [
        "Browser media post content",
        `![${fixture.localAltText}](/${uploadedMedia.storagePath})`,
      ].join("\n\n");

      await page.goto(`/${fixture.adminPath}/posts/new`);
      await page.getByRole("textbox", { name: "标题", exact: true }).fill(fixture.title);
      await page.getByLabel("Slug").fill(fixture.slug);
      await page.getByLabel("正文").fill("Browser media post content");
      await page.getByLabel("插入媒体").selectOption(String(uploadedMedia.id));
      await page.getByRole("button", { name: "插入到正文" }).click();
      await expect(page.getByText("已将所选图片插入正文。公开文章页会按图片块渲染。")).toBeVisible();
      await expect(page.getByLabel("正文")).toHaveValue(expectedBodyContent);
      await page.getByLabel("状态").selectOption("published");
      await page.locator("summary").filter({ hasText: "SEO 设置" }).click();
      await page.getByLabel("OG 图").selectOption(String(uploadedMedia.id));
      await page.getByRole("button", { name: "保存文章" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/posts\\?created=1$`));

      const persistedOgImageId = await findOgImageMediaIdBySlug(fixture.slug);
      expect(persistedOgImageId).toBe(uploadedMedia.id);

      await page.goto(`/post/${fixture.slug}`);
      await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();
      await expect(page.getByText("Browser media post content", { exact: true })).toBeVisible();
      await expect(page.locator(`article img[alt="${fixture.localAltText}"]`)).toHaveAttribute(
        "src",
        `/${uploadedMedia.storagePath}`,
      );
    } finally {
      await cleanupMediaFixture();
    }
  });
});

type MediaFixture = {
  seed: string;
  adminPath: string;
  email: string;
  password: string;
  title: string;
  slug: string;
  externalUrl: string;
  externalAltText: string;
  localAltText: string;
};

async function seedMediaFixture(seed: string): Promise<MediaFixture> {
  await cleanupMediaFixture();

  const adminPath = await getConfiguredAdminPath();
  const email = `${BROWSER_PREFIX}${seed}@example.com`;
  const username = `${BROWSER_PREFIX}${seed}`;
  const password = `pw-${seed}-${randomUUID().slice(0, 8)}`;
  const title = `Browser Media Post ${seed}`;
  const slug = `${BROWSER_PREFIX}post-${seed}`;
  const externalUrl = `https://cdn.example.com/${seed}/browser-og.png`;
  const externalAltText = `${BROWSER_PREFIX}external-${seed}`;
  const localAltText = `${BROWSER_PREFIX}local-${seed}`;

  await withDb(async (db) => {
    await db.insert(users).values({
      email,
      username,
      displayName: "Browser Media Editor",
      passwordHash: hashPasswordValue(password),
      role: "editor",
    });
  });

  return {
    seed,
    adminPath,
    email,
    password,
    title,
    slug,
    externalUrl,
    externalAltText,
    localAltText,
  };
}

async function cleanupMediaFixture() {
  const mediaRows = await withDb(async (db) => {
    const browserMedia = await db
      .select({
        id: media.id,
        storagePath: media.storagePath,
        thumbnailPath: media.thumbnailPath,
      })
      .from(media)
      .where(like(media.altText, `${BROWSER_PREFIX}%`));

    const browserPosts = await db
      .select({ id: posts.id })
      .from(posts)
      .where(like(posts.slug, `${BROWSER_PREFIX}%`));

    if (browserPosts.length > 0) {
      await db.delete(posts).where(
        inArray(
          posts.id,
          browserPosts.map((post) => post.id),
        ),
      );
    }

    if (browserMedia.length > 0) {
      await db.delete(media).where(
        inArray(
          media.id,
          browserMedia.map((item) => item.id),
        ),
      );
    }

    const browserUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.username, `${BROWSER_PREFIX}%`));

    if (browserUsers.length > 0) {
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

    return browserMedia;
  });

  await Promise.allSettled(
    mediaRows
      .flatMap((item) => [item.storagePath, item.thumbnailPath])
      .filter((value): value is string => Boolean(value))
      .map(removeUploadedFile),
  );
}

async function findMediaByAltText(altText: string) {
  return withDb(async (db) => {
    const [row] = await db
      .select({
        id: media.id,
        storagePath: media.storagePath,
        thumbnailPath: media.thumbnailPath,
      })
      .from(media)
      .where(eq(media.altText, altText))
      .orderBy(desc(media.createdAt), desc(media.id))
      .limit(1);

    return row ?? null;
  });
}

async function findOgImageMediaIdBySlug(slug: string) {
  return withDb(async (db) => {
    const [row] = await db
      .select({
        ogImageMediaId: postMeta.ogImageMediaId,
      })
      .from(posts)
      .leftJoin(postMeta, eq(postMeta.postId, posts.id))
      .where(eq(posts.slug, slug))
      .limit(1);

    return row?.ogImageMediaId ?? null;
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

async function removeUploadedFile(relativePath: string) {
  await rm(resolve(process.cwd(), "public", relativePath.replace(/^\/+/, "")), {
    force: true,
  });
}

async function withDb<T>(callback: (db: ReturnType<typeof drizzle>) => Promise<T>) {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, {
    schema: { media, postMeta, posts, settings, users },
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

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { comments, posts, settings, users } from "../../lib/db/schema";
import { hashPasswordValue } from "../../lib/password-utils";

type ThemeSettingsSnapshot = {
  public_surface_variant: string | null;
  public_accent_theme: string | null;
};

const testEnvPath = resolveTestEnvPath();

loadEnv({ path: testEnvPath, override: true });

const BROWSER_PREFIX = "integration-browser-comments-";
const databaseUrl = getDatabaseUrl();

assertSafeTestConnection(testEnvPath, getConnectionInfo(databaseUrl));

test.describe("comments browser regression", () => {
  test("covers public submission, reply flow, admin approval, and public visibility", async ({ page }) => {
    const fixture = await seedCommentsFixture(`${Date.now()}-${randomUUID().slice(0, 8)}`);
    const originalThemeSettings = await captureThemeSettings();

    try {
      await applyThemeSettings({
        public_surface_variant: "solid",
        public_accent_theme: "blue",
      });

      await page.goto(`/post/${fixture.slug}`);
      await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();
      await expect(page.getByRole("heading", { name: "评论", exact: true })).toBeVisible();
      await expect(page.getByText("当前共有 2 条已公开评论。")).toBeVisible();
      await expect(page.getByText("还没有评论")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "提交评论" })).toHaveClass(/focus-visible:ring-blue-500\/40/);
      await expect(page.getByRole("button", { name: "提交评论" })).toHaveClass(/text-white/);
      await expect(page.getByLabel("邮箱")).toHaveClass(/focus:border-blue-500/);
      await expect(page.getByRole("link", { name: "回复" }).first()).toHaveClass(/underline-offset-4/);
      await expect(page.getByRole("link", { name: "回复" }).first()).toHaveClass(/text-blue-700/);
      await expect(page.getByText(fixture.visibleParentContent)).toBeVisible();
      await expect(
        page.getByText(fixture.visibleParentContent).locator("xpath=ancestor::li[1]"),
      ).toHaveClass(/bg-slate-100\/90/);
      await expect(page.getByText(fixture.visibleReplyContent)).toBeVisible();
      await expect(
        page.getByText(fixture.visibleReplyContent).locator("xpath=ancestor::li[1]"),
      ).toHaveClass(/bg-slate-100\/70/);

      await page.getByRole("link", { name: "回复" }).first().click();
      await expect(page).toHaveURL(new RegExp(`replyTo=${fixture.parentCommentId}`));
      await expect(page.getByRole("heading", { name: "回复评论" })).toBeVisible();
      await expect(page.getByText(`当前正在回复 ${fixture.parentAuthorName}。系统仅支持两层评论嵌套。`)).toBeVisible();
      await expect(page.getByRole("link", { name: "取消回复" })).toHaveClass(/underline-offset-4/);
      await expect(page.getByRole("link", { name: "取消回复" })).toHaveClass(/text-blue-700/);

      await page.goto(`/post/${fixture.slug}`);
      await page.getByLabel("昵称").fill("Pending Browser User");
      await page.getByLabel("邮箱").fill(fixture.pendingEmail);
      await page.getByLabel("评论内容").fill("Pending browser comment body");
      await page.getByRole("button", { name: "提交评论" }).click();
      await expect(page.getByText("评论已提交，等待审核。")).toBeVisible();
      await expect(page.getByText("Pending browser comment body")).toHaveCount(0);

      await page.goto(
        `/${fixture.adminPath}/login?redirect=${encodeURIComponent(`/${fixture.adminPath}/comments`)}`,
      );
      await page.getByLabel("邮箱").fill(fixture.email);
      await page.getByLabel("密码").fill(fixture.password);
      await page.getByRole("button", { name: "登录后台" }).click();

      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/comments$`));
      await expect(page.getByRole("heading", { name: "评论管理" })).toBeVisible();
      await expect(page.getByText("Pending browser comment body")).toBeVisible();

      const pendingRow = page.locator("tr", {
        has: page.getByText("Pending browser comment body"),
      });
      await pendingRow.getByRole("button", { name: "批准" }).click();
      await expect(page).toHaveURL(new RegExp(`/${fixture.adminPath}/comments\\?approved=1$`));
      await expect(page.getByText("评论已批准并公开展示。")).toBeVisible();

      await page.goto(`/post/${fixture.slug}`);
      await expect(page.getByText("Pending browser comment body")).toBeVisible();
      await expect(page.getByText("当前共有 3 条已公开评论。")).toBeVisible();
    } finally {
      await cleanupThemeSettings(originalThemeSettings);
      await cleanupCommentsFixture(fixture.originalCommentModeration);
    }
  });
});

type CommentsFixture = {
  adminPath: string;
  email: string;
  password: string;
  slug: string;
  title: string;
  parentCommentId: number;
  parentAuthorName: string;
  visibleParentContent: string;
  visibleReplyContent: string;
  pendingEmail: string;
  originalCommentModeration: string | null;
};

async function seedCommentsFixture(seed: string): Promise<CommentsFixture> {
  const adminPath = await getConfiguredAdminPath();
  const email = `${BROWSER_PREFIX}${seed}@example.com`;
  const username = `${BROWSER_PREFIX}${seed}`;
  const password = `pw-${seed}-${randomUUID().slice(0, 8)}`;
  const title = `Browser Comments Post ${seed}`;
  const slug = `${BROWSER_PREFIX}post-${seed}`;
  const parentAuthorName = "Visible Parent";
  const visibleParentContent = "Visible parent comment body";
  const visibleReplyContent = "Visible reply comment body";
  const pendingEmail = `${BROWSER_PREFIX}pending-${seed}@example.com`;

  await cleanupCommentsFixture(null);

  const originalCommentModeration = await getCurrentCommentModeration();

  const parentCommentId = await withDb(async (db) => {
    await db
      .insert(settings)
      .values({
        key: "comment_moderation",
        value: "pending",
        isSecret: false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: "pending",
          isSecret: false,
          updatedAt: new Date(),
        },
      });

    const [editor] = await db
      .insert(users)
      .values({
        email,
        username,
        displayName: "Browser Comments Editor",
        passwordHash: hashPasswordValue(password),
        role: "editor",
      })
      .returning({ id: users.id });

    const [post] = await db
      .insert(posts)
      .values({
        authorId: editor.id,
        title,
        slug,
        excerpt: "Browser comments excerpt",
        content: "Browser comments content body",
        status: "published",
        publishedAt: new Date("2026-03-26T22:00:00.000Z"),
        updatedAt: new Date("2026-03-26T22:05:00.000Z"),
      })
      .returning({ id: posts.id });

    const [parentComment] = await db
      .insert(comments)
      .values({
        postId: post.id,
        authorName: parentAuthorName,
        authorEmail: `${BROWSER_PREFIX}visible-parent-${seed}@example.com`,
        content: visibleParentContent,
        status: "approved",
        ipAddress: "127.0.0.1",
        approvedAt: new Date("2026-03-26T22:06:00.000Z"),
        updatedAt: new Date("2026-03-26T22:06:00.000Z"),
      })
      .returning({ id: comments.id });

    await db.insert(comments).values({
      postId: post.id,
      parentId: parentComment.id,
      authorName: "Visible Reply",
      authorEmail: `${BROWSER_PREFIX}visible-reply-${seed}@example.com`,
      content: visibleReplyContent,
      status: "approved",
      ipAddress: "127.0.0.1",
      approvedAt: new Date("2026-03-26T22:07:00.000Z"),
      updatedAt: new Date("2026-03-26T22:07:00.000Z"),
    });

    return parentComment.id;
  });

  return {
    adminPath,
    email,
    password,
    slug,
    title,
    parentCommentId,
    parentAuthorName,
    visibleParentContent,
    visibleReplyContent,
    pendingEmail,
    originalCommentModeration,
  };
}

async function captureThemeSettings(): Promise<ThemeSettingsSnapshot> {
  return {
    public_surface_variant: await getSettingValue("public_surface_variant"),
    public_accent_theme: await getSettingValue("public_accent_theme"),
  };
}

async function applyThemeSettings(values: {
  public_surface_variant: "soft" | "solid";
  public_accent_theme: "slate" | "blue" | "emerald" | "amber";
}) {
  await restoreSetting("public_surface_variant", values.public_surface_variant);
  await restoreSetting("public_accent_theme", values.public_accent_theme);
}

async function cleanupThemeSettings(snapshot: ThemeSettingsSnapshot) {
  await restoreSetting("public_surface_variant", snapshot.public_surface_variant);
  await restoreSetting("public_accent_theme", snapshot.public_accent_theme);
}

async function cleanupCommentsFixture(originalCommentModeration: string | null) {
  await withDb(async (db) => {
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

    if (originalCommentModeration === null) {
      await db.delete(settings).where(eq(settings.key, "comment_moderation"));
    } else {
      await restoreSetting("comment_moderation", originalCommentModeration);
    }
  });
}

async function getCurrentCommentModeration() {
  return withDb(async (db) => {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "comment_moderation"))
      .limit(1);

    return row?.value ?? null;
  });
}

async function getConfiguredAdminPath() {
  const value = await getSettingValue("admin_path");
  return value?.trim() || "admin";
}

async function getSettingValue(
  key:
    | "admin_path"
    | "comment_moderation"
    | "public_surface_variant"
    | "public_accent_theme",
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
  key: "comment_moderation" | "public_surface_variant" | "public_accent_theme",
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
    schema: { comments, posts, settings, users },
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

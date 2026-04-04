import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { asc, type SQL } from "drizzle-orm";
import { getTableName } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import postgres from "postgres";

import {
  categories,
  comments,
  customPageMeta,
  customPages,
  emailNotifications,
  friendLinks,
  ipBlacklist,
  media,
  siteNavigation,
  postLikes,
  postMeta,
  postRevisions,
  postSeries,
  postSlugAliases,
  posts,
  postTags,
  postViews,
  series,
  settings,
  sitemapEntries,
  tags,
  users,
} from "@/lib/db/schema";
import { settingDefinitions } from "@/lib/settings-config";

export type BackupSecretPolicy = "redacted" | "included";

export type ExportBackupInput = {
  outputDir: string;
  includeSecrets: boolean;
  rootDir?: string;
};

type TableExportDefinition = {
  key: string;
  fileName: string;
  table: AnyPgTable;
  orderBy: SQL[];
};

export type BackupTableExport = {
  key: string;
  fileName: string;
  tableName: string;
  propertyColumnMap: Record<string, string>;
  identityAlwaysColumnNames: string[];
};

type ExportedTableSummary = {
  key: string;
  fileName: string;
  rowCount: number;
  checksum: string;
};

type MediaSummary = {
  root: string;
  fileCount: number;
  totalBytes: number;
  checksum: string;
  missingReferencedFiles: string[];
  unreferencedFiles: string[];
};

type ExportManifest = {
  formatVersion: 1;
  generatedAt: string;
  appName: string;
  packageVersion: string;
  secretPolicy: BackupSecretPolicy;
  latestDrizzleMigrationTag: string | null;
  restoreOrder: string[];
  excludedArtifacts: string[];
  requiredEnvironmentKeys: string[];
  redactedSettingsKeys: string[];
  tables: ExportedTableSummary[];
  media: MediaSummary;
  warnings: string[];
};

const APP_NAME = "Inkwell";
const DB_DIRNAME = "db";
const MEDIA_DIRNAME = "media";
const MEDIA_ROOT_RELATIVE = "uploads";
const REQUIRED_ENVIRONMENT_KEYS = [
  "DATABASE_URL",
  "MEILISEARCH_HOST",
  "MEILISEARCH_API_KEY",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "INTERNAL_CRON_SECRET",
] as const;
const EXCLUDED_ARTIFACTS = [
  ".env.local",
  ".env.*",
  ".next/",
  "out/",
  "build/",
  "node_modules/",
  "coverage/",
  "playwright-report/",
  "test-results/",
  "Meilisearch index contents",
  "host deployment files",
] as const;

const TABLE_EXPORTS: TableExportDefinition[] = [
  { key: "users", fileName: "users.json", table: users, orderBy: [asc(users.id)] },
  {
    key: "categories",
    fileName: "categories.json",
    table: categories,
    orderBy: [asc(categories.id)],
  },
  { key: "tags", fileName: "tags.json", table: tags, orderBy: [asc(tags.id)] },
  { key: "series", fileName: "series.json", table: series, orderBy: [asc(series.id)] },
  { key: "posts", fileName: "posts.json", table: posts, orderBy: [asc(posts.id)] },
  {
    key: "post_revisions",
    fileName: "post_revisions.json",
    table: postRevisions,
    orderBy: [asc(postRevisions.id)],
  },
  {
    key: "post_slug_aliases",
    fileName: "post_slug_aliases.json",
    table: postSlugAliases,
    orderBy: [asc(postSlugAliases.id)],
  },
  {
    key: "post_tags",
    fileName: "post_tags.json",
    table: postTags,
    orderBy: [asc(postTags.postId), asc(postTags.tagId)],
  },
  {
    key: "post_series",
    fileName: "post_series.json",
    table: postSeries,
    orderBy: [asc(postSeries.postId), asc(postSeries.seriesId)],
  },
  {
    key: "comments",
    fileName: "comments.json",
    table: comments,
    orderBy: [asc(comments.id)],
  },
  { key: "media", fileName: "media.json", table: media, orderBy: [asc(media.id)] },
  {
    key: "post_meta",
    fileName: "post_meta.json",
    table: postMeta,
    orderBy: [asc(postMeta.postId)],
  },
  {
    key: "post_views",
    fileName: "post_views.json",
    table: postViews,
    orderBy: [asc(postViews.postId), asc(postViews.viewDate)],
  },
  {
    key: "post_likes",
    fileName: "post_likes.json",
    table: postLikes,
    orderBy: [asc(postLikes.postId), asc(postLikes.ipAddress)],
  },
  {
    key: "ip_blacklist",
    fileName: "ip_blacklist.json",
    table: ipBlacklist,
    orderBy: [asc(ipBlacklist.id)],
  },
  {
    key: "settings",
    fileName: "settings.json",
    table: settings,
    orderBy: [asc(settings.key)],
  },
  {
    key: "email_notifications",
    fileName: "email_notifications.json",
    table: emailNotifications,
    orderBy: [asc(emailNotifications.scenario)],
  },
  {
    key: "custom_pages",
    fileName: "custom_pages.json",
    table: customPages,
    orderBy: [asc(customPages.id)],
  },
  {
    key: "custom_page_meta",
    fileName: "custom_page_meta.json",
    table: customPageMeta,
    orderBy: [asc(customPageMeta.pageId)],
  },
  {
    key: "friend_links",
    fileName: "friend_links.json",
    table: friendLinks,
    orderBy: [asc(friendLinks.id)],
  },
  {
    key: "site_navigation",
    fileName: "site_navigation.json",
    table: siteNavigation,
    orderBy: [asc(siteNavigation.id)],
  },
  {
    key: "sitemap_entries",
    fileName: "sitemap_entries.json",
    table: sitemapEntries,
    orderBy: [asc(sitemapEntries.id)],
  },
];

function getPropertyColumnMap(table: AnyPgTable) {
  return Object.fromEntries(
    Object.entries(table)
      .filter(([, value]) => Boolean(value) && typeof value === "object" && "config" in value)
      .map(([propertyName, value]) => [propertyName, (value as { name: string }).name]),
  );
}

function getIdentityAlwaysColumnNames(table: AnyPgTable) {
  return Object.entries(table)
    .filter(([, value]) => {
      if (!value || typeof value !== "object" || !("config" in value)) {
        return false;
      }

      const generatedIdentity = (value as { config?: { generatedIdentity?: { type?: string } } }).config?.generatedIdentity;
      return generatedIdentity?.type === "always";
    })
    .map(([, value]) => (value as { name: string }).name);
}

export function getBackupTableExports(): BackupTableExport[] {
  return TABLE_EXPORTS.map((entry) => ({
    key: entry.key,
    fileName: entry.fileName,
    tableName: getTableName(entry.table),
    propertyColumnMap: getPropertyColumnMap(entry.table),
    identityAlwaysColumnNames: getIdentityAlwaysColumnNames(entry.table),
  }));
}

function createDbContext() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, {
    schema: {
      users,
      categories,
      tags,
      series,
      posts,
      postRevisions,
      postSlugAliases,
      postTags,
      postSeries,
      comments,
      media,
      postMeta,
      postViews,
      postLikes,
      ipBlacklist,
      settings,
      emailNotifications,
      customPages,
      customPageMeta,
      friendLinks,
      siteNavigation,
      sitemapEntries,
    },
    casing: "snake_case",
  });

  return { client, db };
}

function toSerializableValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSerializableValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, toSerializableValue(nested)]),
    );
  }

  return value;
}

function isSettingSecret(key: string, isSecret: boolean) {
  if (isSecret) {
    return true;
  }

  const definition = settingDefinitions[key as keyof typeof settingDefinitions];
  return definition?.isSecret ?? false;
}

export function sanitizeSettingsRows<T extends { key: string; value: string; isSecret: boolean }>(
  rows: T[],
  includeSecrets: boolean,
) {
  const redactedKeys: string[] = [];
  const sanitizedRows = rows.map((row) => {
    const secret = isSettingSecret(row.key, row.isSecret);

    if (!secret || includeSecrets) {
      return {
        ...row,
        redacted: false,
      };
    }

    redactedKeys.push(row.key);
    return {
      ...row,
      value: null,
      redacted: true,
    };
  });

  return {
    rows: sanitizedRows,
    redactedKeys: Array.from(new Set(redactedKeys)).sort(),
  };
}

function createChecksum(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

async function writeJson(filePath: string, value: unknown) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await ensureDir(dirname(filePath));
  await writeFile(filePath, content, "utf8");
  return createChecksum(content);
}

async function walkFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(absolutePath);
      }

      if (entry.isFile()) {
        return [absolutePath];
      }

      return [] as string[];
    }),
  );

  return paths.flat().sort();
}

async function checksumFiles(files: string[], baseDir: string) {
  const hash = createHash("sha256");

  for (const file of files) {
    hash.update(relative(baseDir, file).replace(/\\/g, "/"));
    hash.update(await readFile(file));
  }

  return hash.digest("hex");
}

async function getLatestMigrationTag(rootDir: string) {
  const journalPath = resolve(rootDir, "lib", "db", "migrations", "meta", "_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8")) as {
    entries?: Array<{ tag?: string }>;
  };
  const entries = journal.entries ?? [];
  return entries.length > 0 ? entries[entries.length - 1]?.tag ?? null : null;
}

async function collectUploadsInfo(rootDir: string) {
  const uploadsDir = resolve(rootDir, "public", MEDIA_ROOT_RELATIVE);

  try {
    const files = await walkFiles(uploadsDir);
    let totalBytes = 0;

    for (const file of files) {
      totalBytes += (await stat(file)).size;
    }

    return {
      uploadsDir,
      exists: true,
      files,
      totalBytes,
    };
  } catch {
    return {
      uploadsDir,
      exists: false,
      files: [] as string[],
      totalBytes: 0,
    };
  }
}

export async function collectLocalMediaFileIssues(rootDir: string) {
  const { client, db } = createDbContext();

  try {
    const rows = await db
      .select({
        storagePath: media.storagePath,
        thumbnailPath: media.thumbnailPath,
        source: media.source,
      })
      .from(media)
      .orderBy(asc(media.id));

    const referencedRelativePaths = new Set<string>();
    const missingReferencedFiles = new Set<string>();

    for (const row of rows) {
      if (row.source !== "local") {
        continue;
      }

      for (const value of [row.storagePath, row.thumbnailPath]) {
        if (!value) {
          continue;
        }

        const normalized = value.replace(/^\/+/, "");
        referencedRelativePaths.add(normalized);

        try {
          await stat(resolve(rootDir, "public", normalized));
        } catch {
          missingReferencedFiles.add(normalized);
        }
      }
    }

    const uploads = await collectUploadsInfo(rootDir);
    const unreferencedFiles = uploads.files
      .map((file) => relative(resolve(rootDir, "public"), file).replace(/\\/g, "/"))
      .filter((path) => !referencedRelativePaths.has(path))
      .sort();

    return {
      missingReferencedFiles: Array.from(missingReferencedFiles).sort(),
      unreferencedFiles,
    };
  } finally {
    await client.end({ timeout: 0 });
  }
}

export async function exportBackup(input: ExportBackupInput) {
  const rootDir = resolve(input.rootDir ?? process.cwd());
  const outputDir = resolve(input.outputDir);
  const dbDir = resolve(outputDir, DB_DIRNAME);
  const mediaDir = resolve(outputDir, MEDIA_DIRNAME);
  const uploadsOutputDir = resolve(mediaDir, MEDIA_ROOT_RELATIVE);
  const packageJson = JSON.parse(
    await readFile(resolve(rootDir, "package.json"), "utf8"),
  ) as { version?: string };
  const { client, db } = createDbContext();

  try {
    await ensureDir(outputDir);
    await ensureDir(dbDir);
    await ensureDir(mediaDir);

    const tableSummaries: ExportedTableSummary[] = [];
    let redactedSettingsKeys: string[] = [];

    for (const definition of TABLE_EXPORTS) {
      const rows = await db.select().from(definition.table).orderBy(...definition.orderBy);
      const serializableRows = rows.map((row) => toSerializableValue(row));
      const payload = definition.key === "settings"
        ? sanitizeSettingsRows(
            serializableRows as Array<{ key: string; value: string; isSecret: boolean }>,
            input.includeSecrets,
          )
        : null;
      const data = payload ? payload.rows : serializableRows;

      if (payload) {
        redactedSettingsKeys = payload.redactedKeys;
      }

      const checksum = await writeJson(resolve(dbDir, definition.fileName), data);
      tableSummaries.push({
        key: definition.key,
        fileName: join(DB_DIRNAME, definition.fileName).replace(/\\/g, "/"),
        rowCount: data.length,
        checksum,
      });
    }

    const uploads = await collectUploadsInfo(rootDir);

    if (uploads.exists) {
      await cp(uploads.uploadsDir, uploadsOutputDir, { recursive: true });
    } else {
      await ensureDir(uploadsOutputDir);
    }

    const mediaChecks = await collectLocalMediaFileIssues(rootDir);

    if (mediaChecks.missingReferencedFiles.length > 0) {
      throw new Error(
        `Missing referenced local media files: ${mediaChecks.missingReferencedFiles.join(", ")}`,
      );
    }

    const exportedMediaFiles = await walkFiles(uploadsOutputDir).catch(() => [] as string[]);
    let exportedMediaBytes = 0;

    for (const file of exportedMediaFiles) {
      exportedMediaBytes += (await stat(file)).size;
    }

    const warnings = mediaChecks.unreferencedFiles.map(
      (path) => `Unreferenced upload preserved: ${path}`,
    );

    const manifest: ExportManifest = {
      formatVersion: 1,
      generatedAt: new Date().toISOString(),
      appName: APP_NAME,
      packageVersion: packageJson.version ?? "0.0.0",
      secretPolicy: input.includeSecrets ? "included" : "redacted",
      latestDrizzleMigrationTag: await getLatestMigrationTag(rootDir),
      restoreOrder: TABLE_EXPORTS.map((entry) => entry.key),
      excludedArtifacts: [...EXCLUDED_ARTIFACTS],
      requiredEnvironmentKeys: [...REQUIRED_ENVIRONMENT_KEYS],
      redactedSettingsKeys,
      tables: tableSummaries,
      media: {
        root: join(MEDIA_DIRNAME, MEDIA_ROOT_RELATIVE).replace(/\\/g, "/"),
        fileCount: exportedMediaFiles.length,
        totalBytes: exportedMediaBytes,
        checksum: await checksumFiles(exportedMediaFiles, uploadsOutputDir),
        missingReferencedFiles: mediaChecks.missingReferencedFiles,
        unreferencedFiles: mediaChecks.unreferencedFiles,
      },
      warnings,
    };

    const manifestChecksum = await writeJson(resolve(outputDir, "manifest.json"), manifest);

    return {
      outputDir,
      manifestPath: resolve(outputDir, "manifest.json"),
      manifestChecksum,
      manifest,
    };
  } finally {
    await client.end({ timeout: 0 });
  }
}

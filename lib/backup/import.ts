import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getBackupTableExports, type BackupTableExport } from "@/lib/backup/export";
import { settingDefinitions } from "@/lib/settings-config";

export type ImportBackupInput = {
  inputDir: string;
  force: boolean;
  rootDir?: string;
  reindexSearch?: boolean;
};

type BackupManifest = {
  formatVersion: 1;
  appName: string;
  packageVersion: string;
  secretPolicy: "redacted" | "included";
  latestDrizzleMigrationTag: string | null;
  restoreOrder: string[];
  redactedSettingsKeys: string[];
  tables: Array<{ key: string; fileName: string; rowCount: number; checksum: string }>;
  media: {
    root: string;
    fileCount: number;
    totalBytes: number;
    checksum: string;
    missingReferencedFiles: string[];
    unreferencedFiles: string[];
  };
};

type RawRow = Record<string, unknown>;

type DbContext = ReturnType<typeof createDbContext>["db"];

type TableMetadata = BackupTableExport;

type RestorableSettingsRow = {
  key: string;
  value: string | null;
  isSecret: boolean;
  updatedAt?: unknown;
};

type ImportBackupResult = {
  inputDir: string;
  importedTableCount: number;
  restoredMediaFileCount: number;
  preservedSecretKeys: string[];
  skippedRedactedSecretKeys: string[];
  reindexedSearch: boolean;
};

const APP_NAME = "Inkwell";
const TABLE_EXPORTS = getBackupTableExports();
const TABLE_METADATA = new Map(TABLE_EXPORTS.map((entry) => [entry.key, entry]));

function createDbContext() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { casing: "snake_case" });

  return { client, db };
}

function checksumContent(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

async function checksumFile(filePath: string) {
  return checksumContent(await readFile(filePath, "utf8"));
}

async function checksumFiles(files: string[], baseDir: string) {
  const hash = createHash("sha256");

  for (const file of files) {
    hash.update(relative(baseDir, file).replace(/\\/g, "/"));
    hash.update(await readFile(file));
  }

  return hash.digest("hex");
}

async function walkFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const nested = await Promise.all(
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

  return nested.flat().sort();
}

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

async function getLatestMigrationTag(rootDir: string) {
  const journalPath = resolve(rootDir, "lib", "db", "migrations", "meta", "_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8")) as {
    entries?: Array<{ tag?: string }>;
  };
  const entries = journal.entries ?? [];
  return entries.length > 0 ? entries[entries.length - 1]?.tag ?? null : null;
}

async function readManifest(inputDir: string) {
  const manifestPath = resolve(inputDir, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as BackupManifest;

  if (manifest.formatVersion !== 1) {
    throw new Error(`Unsupported backup format version: ${manifest.formatVersion}`);
  }

  if (manifest.appName !== APP_NAME) {
    throw new Error(`Unexpected backup app name: ${manifest.appName}`);
  }

  return { manifest, manifestPath };
}

async function validateBackupSnapshot(inputDir: string, rootDir: string) {
  const { manifest } = await readManifest(inputDir);

  for (const entry of TABLE_EXPORTS) {
    const summary = manifest.tables.find((table) => table.key === entry.key);

    if (!summary) {
      throw new Error(`Backup is missing manifest entry for table ${entry.key}`);
    }

    const dataPath = resolve(inputDir, summary.fileName);
    const checksum = await checksumFile(dataPath);

    if (checksum !== summary.checksum) {
      throw new Error(`Checksum mismatch for ${summary.fileName}`);
    }
  }

  const mediaDir = resolve(inputDir, manifest.media.root);
  const mediaFiles = await walkFiles(mediaDir).catch(() => [] as string[]);
  const mediaChecksum = await checksumFiles(mediaFiles, mediaDir);

  if (mediaChecksum !== manifest.media.checksum) {
    throw new Error("Media checksum mismatch.");
  }

  const latestTag = await getLatestMigrationTag(rootDir);

  if (manifest.latestDrizzleMigrationTag !== latestTag) {
    throw new Error(
      `Backup migration tag ${manifest.latestDrizzleMigrationTag ?? "null"} does not match current schema ${latestTag ?? "null"}.`,
    );
  }

  return manifest;
}

async function countExistingRows(db: DbContext, tableName: string) {
  const [row] = await db.execute<{ count: number }>(sql`select count(*)::int as count from ${sql.raw(`"${tableName}"`)}`);
  return Number(row?.count ?? 0);
}

async function collectCurrentSecretValues(db: DbContext) {
  const rows = await db.execute<{ key: string; value: string }>(sql`select key, value from settings`);
  return new Map(rows.map((row) => [row.key, row.value]));
}

async function assertImportTargetState(
  db: DbContext,
  rootDir: string,
  force: boolean,
) {
  const occupiedTables: string[] = [];

  for (const entry of TABLE_EXPORTS) {
    const count = await countExistingRows(db, entry.tableName);
    if (count > 0) {
      occupiedTables.push(entry.tableName);
    }
  }

  const uploadsDir = resolve(rootDir, "public", "uploads");
  const existingUploads = await walkFiles(uploadsDir).catch(() => [] as string[]);

  if (!force && (occupiedTables.length > 0 || existingUploads.length > 0)) {
    throw new Error(
      `Import target is not empty. Occupied tables: ${occupiedTables.join(", ") || "none"}; uploads files: ${existingUploads.length}. Re-run with --force to replace current state.`,
    );
  }
}

async function resetImportTarget(
  db: DbContext,
  rootDir: string,
) {
  const restoreOrder = TABLE_EXPORTS.map((entry) => entry.tableName);

  for (const tableName of [...restoreOrder].reverse()) {
    await db.execute(sql.raw(`delete from "${tableName}"`));
  }

  await rm(resolve(rootDir, "public", "uploads"), { recursive: true, force: true });
  await ensureDir(resolve(rootDir, "public", "uploads"));
}

function stripRedactedMarker<T extends Record<string, unknown>>(row: T) {
  const { redacted: _redacted, ...rest } = row;
  return rest;
}

function normalizeTableRow(row: RawRow, table: TableMetadata) {
  const normalized = stripRedactedMarker(row);

  return Object.fromEntries(
    Object.entries(normalized).map(([propertyName, value]) => [
      table.propertyColumnMap[propertyName] ?? propertyName,
      value,
    ]),
  );
}

function isSecretKey(key: string, isSecret: boolean) {
  if (isSecret) {
    return true;
  }

  const definition = settingDefinitions[key as keyof typeof settingDefinitions];
  return definition?.isSecret ?? false;
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteLiteral(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

async function syncIdentitySequences(db: DbContext, table: TableMetadata) {
  for (const columnName of table.identityAlwaysColumnNames) {
    await db.execute(
      sql.raw(
        `select setval(pg_get_serial_sequence(${quoteLiteral(table.tableName)}, ${quoteLiteral(columnName)}), (select max(${quoteIdentifier(columnName)}) from ${quoteIdentifier(table.tableName)}), true)`,
      ),
    );
  }
}

async function insertRows(
  db: DbContext,
  table: TableMetadata,
  rows: RawRow[],
  currentSecretValues: Map<string, string>,
) {
  if (rows.length === 0) {
    return {
      preservedSecretKeys: [] as string[],
      skippedRedactedSecretKeys: [] as string[],
    };
  }

  const preservedSecretKeys: string[] = [];
  const skippedRedactedSecretKeys: string[] = [];
  const payload = rows.map((row) => {
    if (table.tableName !== "settings") {
      return normalizeTableRow(row, table);
    }

    const normalized = normalizeTableRow(row, table) as RestorableSettingsRow;
    const secret = isSecretKey(normalized.key, normalized.isSecret);

    if (!secret || normalized.value !== null) {
      return normalized;
    }

    const currentValue = currentSecretValues.get(normalized.key);

    if (currentValue !== undefined) {
      preservedSecretKeys.push(normalized.key);
      return {
        ...normalized,
        value: currentValue,
      };
    }

    skippedRedactedSecretKeys.push(normalized.key);
    return null;
  }).filter((row): row is RawRow => row !== null);

  if (payload.length > 0) {
    const overridingClause = table.identityAlwaysColumnNames.length > 0
      ? " overriding system value"
      : "";
    await db.execute(
      sql.raw(`insert into ${quoteIdentifier(table.tableName)} ${overridingClause} ${buildInsertValues(payload)}`),
    );

    if (table.identityAlwaysColumnNames.length > 0) {
      await syncIdentitySequences(db, table);
    }
  }

  return {
    preservedSecretKeys: Array.from(new Set(preservedSecretKeys)).sort(),
    skippedRedactedSecretKeys: Array.from(new Set(skippedRedactedSecretKeys)).sort(),
  };
}

function toSqlLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "null";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

function buildInsertValues(rows: RawRow[]) {
  const columns = Object.keys(rows[0] ?? {});
  const values = rows.map((row) => `(${columns.map((column) => toSqlLiteral(row[column])).join(", ")})`);
  return `(${columns.map((column) => quoteIdentifier(column)).join(", ")}) values ${values.join(", ")}`;
}

async function restoreMediaTree(inputDir: string, rootDir: string, mediaRoot: string) {
  const sourceDir = resolve(inputDir, mediaRoot);
  const targetDir = resolve(rootDir, "public", "uploads");
  await ensureDir(targetDir);
  await cp(sourceDir, targetDir, { recursive: true });
  return (await walkFiles(targetDir)).length;
}

async function maybeReindexSearch(rootDir: string, enabled: boolean) {
  if (!enabled) {
    return false;
  }

  const { main } = await import("@/scripts/reindex-search-posts");
  await main([]);
  return true;
}

export async function importBackup(input: ImportBackupInput): Promise<ImportBackupResult> {
  const rootDir = resolve(input.rootDir ?? process.cwd());
  const inputDir = resolve(input.inputDir);
  const manifest = await validateBackupSnapshot(inputDir, rootDir);
  const { client, db } = createDbContext();

  try {
    await assertImportTargetState(db, rootDir, input.force);
    const currentSecretValues = await collectCurrentSecretValues(db);

    if (input.force) {
      await resetImportTarget(db, rootDir);
    }

    const preservedSecretKeys = new Set<string>();
    const skippedRedactedSecretKeys = new Set<string>();

    for (const entry of manifest.restoreOrder) {
      const summary = manifest.tables.find((table) => table.key === entry);
      if (!summary) {
        continue;
      }

      const table = TABLE_METADATA.get(entry);
      if (!table) {
        continue;
      }

      const rows = JSON.parse(await readFile(resolve(inputDir, summary.fileName), "utf8")) as RawRow[];
      const secretResult = await insertRows(db, table, rows, currentSecretValues);
      secretResult.preservedSecretKeys.forEach((key) => preservedSecretKeys.add(key));
      secretResult.skippedRedactedSecretKeys.forEach((key) => skippedRedactedSecretKeys.add(key));
    }

    const restoredMediaFileCount = await restoreMediaTree(inputDir, rootDir, manifest.media.root);
    const reindexedSearch = await maybeReindexSearch(rootDir, input.reindexSearch ?? false);

    return {
      inputDir,
      importedTableCount: manifest.tables.length,
      restoredMediaFileCount,
      preservedSecretKeys: Array.from(preservedSecretKeys).sort(),
      skippedRedactedSecretKeys: Array.from(skippedRedactedSecretKeys).sort(),
      reindexedSearch,
    };
  } finally {
    await client.end({ timeout: 0 });
  }
}

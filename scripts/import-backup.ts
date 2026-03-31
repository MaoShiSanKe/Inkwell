import { pathToFileURL } from "node:url";

import { config } from "dotenv";

import { importBackup } from "../lib/backup/import";

config({ path: ".env.local" });

type CliOptions = {
  inputDir: string;
  force: boolean;
  reindexSearch: boolean;
};

export function parseArgs(argv: string[]): CliOptions {
  let inputDir = "";
  let force = false;
  let reindexSearch = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--input") {
      inputDir = argv[index + 1]?.trim() ?? "";
      index += 1;
      continue;
    }

    if (value.startsWith("--input=")) {
      inputDir = value.slice("--input=".length).trim();
      continue;
    }

    if (value === "--force") {
      force = true;
      continue;
    }

    if (value === "--reindex-search") {
      reindexSearch = true;
    }
  }

  if (!inputDir) {
    throw new Error("Usage: npm run backup:import -- --input <dir> [--force] [--reindex-search]");
  }

  return {
    inputDir,
    force,
    reindexSearch,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const result = await importBackup({
    inputDir: options.inputDir,
    force: options.force,
    reindexSearch: options.reindexSearch,
  });

  console.log(
    JSON.stringify(
      {
        inputDir: result.inputDir,
        importedTableCount: result.importedTableCount,
        restoredMediaFileCount: result.restoredMediaFileCount,
        preservedSecretKeys: result.preservedSecretKeys,
        skippedRedactedSecretKeys: result.skippedRedactedSecretKeys,
        reindexedSearch: result.reindexedSearch,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

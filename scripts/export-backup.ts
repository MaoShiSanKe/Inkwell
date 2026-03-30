import { pathToFileURL } from "node:url";

import { config } from "dotenv";

import { exportBackup } from "../lib/backup/export";

config({ path: ".env.local" });

type CliOptions = {
  outputDir: string;
  includeSecrets: boolean;
};

export function parseArgs(argv: string[]): CliOptions {
  let outputDir = "";
  let includeSecrets = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--output") {
      outputDir = argv[index + 1]?.trim() ?? "";
      index += 1;
      continue;
    }

    if (value.startsWith("--output=")) {
      outputDir = value.slice("--output=".length).trim();
      continue;
    }

    if (value === "--include-secrets") {
      includeSecrets = true;
    }
  }

  if (!outputDir) {
    throw new Error("Usage: npm run backup:export -- --output <dir> [--include-secrets]");
  }

  return {
    outputDir,
    includeSecrets,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const result = await exportBackup({
    outputDir: options.outputDir,
    includeSecrets: options.includeSecrets,
  });

  console.log(
    JSON.stringify(
      {
        outputDir: result.outputDir,
        manifestPath: result.manifestPath,
        secretPolicy: result.manifest.secretPolicy,
        tableCount: result.manifest.tables.length,
        mediaFileCount: result.manifest.media.fileCount,
        warnings: result.manifest.warnings,
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

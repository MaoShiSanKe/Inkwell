import { pathToFileURL } from "node:url";

import { config } from "dotenv";

import { reindexPublishedPosts } from "../lib/search/reindex-posts";

config({ path: ".env.local" });

type CliOptions = {
  batchSize?: number;
  slugPrefix?: string;
};

export function parseArgs(argv: string[]): CliOptions {
  let batchSize: number | undefined;
  let slugPrefix: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--batch-size") {
      const parsed = Number.parseInt(argv[index + 1] ?? "", 10);
      batchSize = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
      index += 1;
      continue;
    }

    if (value.startsWith("--batch-size=")) {
      const parsed = Number.parseInt(value.slice("--batch-size=".length), 10);
      batchSize = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
      continue;
    }

    if (value === "--slug-prefix") {
      slugPrefix = argv[index + 1]?.trim() || undefined;
      index += 1;
      continue;
    }

    if (value.startsWith("--slug-prefix=")) {
      slugPrefix = value.slice("--slug-prefix=".length).trim() || undefined;
    }
  }

  return { batchSize, slugPrefix };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const result = await reindexPublishedPosts({
    batchSize: options.batchSize,
    slugPrefix: options.slugPrefix,
  });

  console.log(
    JSON.stringify(
      {
        indexName: result.indexName,
        batchSize: result.batchSize,
        batchCount: result.batchCount,
        sourceCount: result.sourceCount,
        indexedCount: result.indexedCount,
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

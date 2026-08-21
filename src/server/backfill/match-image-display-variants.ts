import { createClient } from "@libsql/client";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import sharp from "sharp";
import { UTApi, UTFile } from "uploadthing/server";

import { images, matches } from "@/server/db/schema";

type Options = {
  confirmProdBackfill: boolean;
  dryRun: boolean;
  envFile: string;
  limit: number | null;
  maxDimension: number;
  prodFromEnvFile: boolean;
  quality: number;
};

const DEFAULT_MAX_DIMENSION = 1920;
const DEFAULT_QUALITY = 85;
const COMMENTED_ENV_ASSIGNMENT = /^#\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;
const REQUIRED_COLUMNS = {
  mafia_magic_image: [
    "variant",
    "width",
    "height",
    "size_bytes",
    "mime_type",
    "source_file_key",
  ],
  mafia_magic_match: ["original_image"],
};

function parseArgs(args: string[]): Options {
  const options: Options = {
    confirmProdBackfill: false,
    dryRun: true,
    envFile: ".env",
    limit: null,
    maxDimension: DEFAULT_MAX_DIMENSION,
    prodFromEnvFile: false,
    quality: DEFAULT_QUALITY,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--":
        break;
      case "--confirm-prod-backfill":
        options.confirmProdBackfill = true;
        break;
      case "--write":
        options.dryRun = false;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--prod-from-env-file":
        options.prodFromEnvFile = true;
        break;
      case "--env-file":
        if (!next) throw new Error("--env-file requires a value");
        options.envFile = next;
        index += 1;
        break;
      case "--limit":
        if (!next) throw new Error("--limit requires a value");
        options.limit = Number.parseInt(next, 10);
        if (!Number.isInteger(options.limit) || options.limit <= 0) {
          throw new Error("--limit must be a positive integer");
        }
        index += 1;
        break;
      case "--max-dimension":
        if (!next) throw new Error("--max-dimension requires a value");
        options.maxDimension = Number.parseInt(next, 10);
        if (
          !Number.isInteger(options.maxDimension) ||
          options.maxDimension <= 0
        ) {
          throw new Error("--max-dimension must be a positive integer");
        }
        index += 1;
        break;
      case "--quality":
        if (!next) throw new Error("--quality requires a value");
        options.quality = Number.parseInt(next, 10);
        if (
          !Number.isInteger(options.quality) ||
          options.quality < 1 ||
          options.quality > 100
        ) {
          throw new Error("--quality must be an integer from 1 to 100");
        }
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function loadCommentedProdEnv(envFile: string) {
  const fs = await import("node:fs/promises");
  const content = await fs.readFile(envFile, "utf8");
  const lines = content.split(/\r?\n/);
  const values = new Map<string, string>();
  let insideProdBlock = false;

  for (const line of lines) {
    if (/drizzle\s+prod/i.test(line)) {
      insideProdBlock = true;
      continue;
    }

    if (insideProdBlock && line.trim() === "") {
      break;
    }

    if (!insideProdBlock) continue;

    const match = COMMENTED_ENV_ASSIGNMENT.exec(line);
    if (match) {
      values.set(match[1]!, match[2] ?? "");
    }
  }

  return values;
}

async function resolveRuntimeEnv(options: Options) {
  const prodEnv = options.prodFromEnvFile
    ? await loadCommentedProdEnv(options.envFile)
    : new Map<string, string>();

  const getValue = (key: string) => prodEnv.get(key) ?? process.env[key];
  const databaseUrl = getValue("DATABASE_URL");
  const tursoAuthToken = getValue("TURSO_AUTH_TOKEN");
  const uploadThingToken = getValue("UPLOADTHING_TOKEN");

  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!tursoAuthToken) throw new Error("TURSO_AUTH_TOKEN is required");
  if (!uploadThingToken) throw new Error("UPLOADTHING_TOKEN is required");

  return { databaseUrl, tursoAuthToken, uploadThingToken };
}

function toDisplayFileName(fileKey: string) {
  const safeKey = fileKey.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `match-${safeKey}-display.webp`;
}

async function assertMigrationApplied(client: ReturnType<typeof createClient>) {
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const result = await client.execute(`PRAGMA table_info(${table})`);
    const existing = new Set(
      result.rows.flatMap((row) =>
        typeof row.name === "string" ? [row.name] : [],
      ),
    );
    const missing = columns.filter((column) => !existing.has(column));

    if (missing.length > 0) {
      throw new Error(
        `Migration is not applied. Missing ${table}.${missing.join(", ")}`,
      );
    }
  }
}

async function buildDisplayImage({
  fileKey,
  maxDimension,
  quality,
  url,
}: {
  fileKey: string;
  maxDimension: number;
  quality: number;
  url: string;
}) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch source image (${response.status})`);
  }

  const input = Buffer.from(await response.arrayBuffer());
  const transformer = sharp(input).rotate().resize({
    fit: "inside",
    height: maxDimension,
    width: maxDimension,
    withoutEnlargement: true,
  });
  const output = await transformer.webp({ quality }).toBuffer();
  const metadata = await sharp(output).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Display image metadata could not be read");
  }

  return {
    file: new UTFile(
      [
        output.buffer.slice(
          output.byteOffset,
          output.byteOffset + output.byteLength,
        ) as ArrayBuffer,
      ],
      toDisplayFileName(fileKey),
      {
        type: "image/webp",
      },
    ),
    metadata: {
      width: metadata.width,
      height: metadata.height,
      sizeBytes: output.byteLength,
      mimeType: "image/webp",
    },
  };
}

function formatUnknownError(value: unknown) {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return "Unknown error";
  }
}

type UploadThingFileData = {
  key?: string;
  url?: string;
  ufsUrl?: string;
};

type UploadThingFileResult = UploadThingFileData & {
  data?: UploadThingFileData;
  error?: unknown;
};

function getUploadedFile(uploadResponse: unknown) {
  const responses = Array.isArray(uploadResponse)
    ? (uploadResponse as unknown[])
    : [uploadResponse];
  const wrapper = responses[0] as UploadThingFileResult | undefined;

  if (!wrapper) {
    throw new Error("UploadThing upload response was empty");
  }

  const result: UploadThingFileResult = {
    data: wrapper.data,
    error: wrapper.error,
    key: wrapper.key,
    ufsUrl: wrapper.ufsUrl,
    url: wrapper.url,
  };

  if (result.error) {
    throw new Error(
      `UploadThing upload failed: ${formatUnknownError(result.error)}`,
    );
  }

  const data = result.data ?? result;
  const key = data?.key;
  const url = data?.ufsUrl ?? data?.url;

  if (!key || !url) {
    throw new Error("UploadThing upload response did not include key and url");
  }

  return {
    key,
    url,
  };
}

export async function run(...args: string[]) {
  const options = parseArgs(args);
  const runtimeEnv = await resolveRuntimeEnv(options);
  const client = createClient({
    authToken: runtimeEnv.tursoAuthToken,
    url: runtimeEnv.databaseUrl,
  });
  const db = drizzle(client, { schema: { images, matches } });

  await assertMigrationApplied(client);

  if (!options.dryRun && !options.confirmProdBackfill) {
    throw new Error(
      "Refusing to write without --confirm-prod-backfill. Run dry-run first.",
    );
  }

  const rows = await db
    .select({
      matchId: matches.id,
      currentImageId: matches.image,
      originalImageId: matches.originalImage,
      fileKey: images.fileKey,
      fileUrl: images.fileUrl,
      variant: images.variant,
      width: images.width,
      height: images.height,
      sizeBytes: images.sizeBytes,
      mimeType: images.mimeType,
    })
    .from(matches)
    .innerJoin(images, eq(images.id, matches.image));

  const candidates = [];

  for (const row of rows) {
    if (!row.currentImageId) continue;

    const alreadyDisplay =
      row.variant === "display" &&
      row.width != null &&
      row.height != null &&
      row.width <= options.maxDimension &&
      row.height <= options.maxDimension &&
      row.mimeType === "image/webp";

    if (alreadyDisplay) continue;

    const [existingDisplay] = await db
      .select({ id: images.id })
      .from(images)
      .where(
        and(
          eq(images.variant, "display"),
          eq(images.sourceFileKey, row.fileKey),
        ),
      )
      .limit(1);

    candidates.push({
      ...row,
      existingDisplayId: existingDisplay?.id ?? null,
    });
  }

  const limitedCandidates =
    options.limit == null ? candidates : candidates.slice(0, options.limit);

  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        candidateCount: candidates.length,
        selectedCount: limitedCandidates.length,
        maxDimension: options.maxDimension,
        quality: options.quality,
      },
      null,
      2,
    ),
  );

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        limitedCandidates.map((candidate) => ({
          matchId: candidate.matchId,
          imageId: candidate.currentImageId,
          originalImageId: candidate.originalImageId,
          variant: candidate.variant,
          width: candidate.width,
          height: candidate.height,
          sizeBytes: candidate.sizeBytes,
          mimeType: candidate.mimeType,
          hasReusableDisplay: candidate.existingDisplayId != null,
        })),
        null,
        2,
      ),
    );
    return;
  }

  const utapi = new UTApi({ token: runtimeEnv.uploadThingToken });

  for (const candidate of limitedCandidates) {
    try {
      if (candidate.existingDisplayId != null) {
        await db
          .update(matches)
          .set({
            image: candidate.existingDisplayId,
            originalImage:
              candidate.originalImageId ?? candidate.currentImageId,
          })
          .where(eq(matches.id, candidate.matchId));
        console.log(
          `match ${candidate.matchId}: reused display image ${candidate.existingDisplayId}`,
        );
        continue;
      }

      const displayImage = await buildDisplayImage({
        fileKey: candidate.fileKey,
        maxDimension: options.maxDimension,
        quality: options.quality,
        url: candidate.fileUrl,
      });
      const uploaded = getUploadedFile(
        await utapi.uploadFiles(displayImage.file, {
          contentDisposition: "inline",
        }),
      );

      const [inserted] = await db
        .insert(images)
        .values({
          fileKey: uploaded.key,
          fileUrl: uploaded.url,
          height: displayImage.metadata.height,
          mimeType: displayImage.metadata.mimeType,
          sizeBytes: displayImage.metadata.sizeBytes,
          sourceFileKey: candidate.fileKey,
          variant: "display",
          width: displayImage.metadata.width,
        })
        .returning({ id: images.id });

      if (!inserted) {
        throw new Error("Failed to insert display image row");
      }

      await db
        .update(matches)
        .set({
          image: inserted.id,
          originalImage: candidate.originalImageId ?? candidate.currentImageId,
        })
        .where(eq(matches.id, candidate.matchId));

      console.log(
        `match ${candidate.matchId}: created display image ${inserted.id}`,
      );
    } catch (error) {
      console.error(
        `match ${candidate.matchId}: failed - ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}

export default run;

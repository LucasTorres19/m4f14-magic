import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function resolveBackfillModule(scriptName: string) {
  const normalized = scriptName.replace(/\.(ts|js|mjs|cjs)$/, "");
  const baseDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(baseDir, `${normalized}.ts`),
    join(baseDir, `${normalized}.tsx`),
    join(baseDir, `${normalized}.js`),
    join(baseDir, `${normalized}.mjs`),
    join(baseDir, `${normalized}.cjs`),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return pathToFileURL(candidate).href;
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(
    `Backfill script "${scriptName}" not found in ${baseDir}. Tried: ${candidates.join(
      ", ",
    )}`,
  );
}

async function main() {
  const [, , scriptName, ...args] = process.argv;

  if (!scriptName) {
    console.error(
      "Usage: npm run backfill <script-name> [script-args...]\nExample: npm run backfill uploadthing-images",
    );
    process.exitCode = 1;
    return;
  }

  const moduleUrl = await resolveBackfillModule(scriptName);

  const imported = (await import(moduleUrl)) as {
    default?: (...args: string[]) => Promise<void>;
    run?: (...args: string[]) => Promise<void>;
  };

  const runnable = imported.default ?? imported.run;
  if (typeof runnable === "function") {
    await runnable(...args);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

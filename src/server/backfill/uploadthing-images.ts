import { asc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "../db";
import { images, matchImages, matches } from "../db/schema";

export default async function main() {
  console.info("Starting uploadthing image backfill...");

  const matchesWithoutCroppedImage = await db
    .select({
      id: matches.id,
    })
    .from(matches)
    .where(isNull(matches.cropped_image));

  if (matchesWithoutCroppedImage.length === 0) {
    console.info("No matches need backfilling. Nothing to do.");
    return;
  }

  const matchIds = matchesWithoutCroppedImage.map((match) => match.id);

  const candidateImages = await db
    .select({
      id: matchImages.id,
      matchId: matchImages.matchId,
      fileKey: matchImages.fileKey,
      fileUrl: matchImages.fileUrl,
      createdAt: matchImages.createdAt,
    })
    .from(matchImages)
    .where(inArray(matchImages.matchId, matchIds))
    .orderBy(
      asc(matchImages.matchId),
      asc(matchImages.displayOrder),
      asc(matchImages.id),
    );

  const firstImagesByMatch = new Map<
    number,
    (typeof candidateImages)[number]
  >();

  for (const image of candidateImages) {
    if (firstImagesByMatch.has(image.matchId)) continue;
    // Preserve the earliest image per match (lowest displayOrder, then id).
    firstImagesByMatch.set(image.matchId, image);
  }

  const matchesToProcess = matchesWithoutCroppedImage.filter((match) =>
    firstImagesByMatch.has(match.id),
  );

  if (matchesToProcess.length === 0) {
    console.info(
      "Matches without images exist, but none have associated match images.",
    );
    return;
  }

  let updatedCount = 0;

  await db.transaction(async (tx) => {
    for (const match of matchesToProcess) {
      const sourceImage = firstImagesByMatch.get(match.id);
      if (!sourceImage) continue;

      const [insertedImage] = await tx
        .insert(images)
        .values({
          fileKey: sourceImage.fileKey,
          fileUrl: sourceImage.fileUrl,
          createdAt: sourceImage.createdAt,
        })
        .returning({
          id: images.id,
        });

      if (!insertedImage) {
        throw new Error(
          `Failed to insert image for match ${match.id} (source image ${sourceImage.id})`,
        );
      }

      await tx
        .update(matches)
        .set({
          cropped_image: insertedImage.id,
        })
        .where(eq(matches.id, match.id));

      updatedCount += 1;
    }
  });

  console.info(`Backfill complete. Updated ${updatedCount} matches.`);
}

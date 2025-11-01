import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  commanders,
  images,
  matches,
  players,
  playersToMatches,
} from "@/server/db/schema";
import { alias } from "drizzle-orm/sqlite-core";

export const matchesRouter = createTRPCRouter({
  findAll: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(25),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 25;

      const origImage = alias(images, "orig_image");
      const croppedImage = alias(images, "cropped_image");
      const matchRows = await ctx.db
        .select({
          id: matches.id,
          startingHp: matches.startingHp,
          image: {
            id: origImage.id,
            url: origImage.fileUrl,
          },
          croppedImage: {
            id: croppedImage.id,
            url: croppedImage.fileUrl,
          },
          createdAt: matches.createdAt,
          updatedAt: matches.updatedAt,
        })
        .from(matches)
        .leftJoin(origImage, eq(origImage.id, matches.image))
        .leftJoin(croppedImage, eq(croppedImage.id, matches.cropped_image))
        .orderBy(desc(matches.createdAt))
        .limit(limit);

      if (matchRows.length === 0) {
        return [];
      }

      const matchIds = matchRows.map((match) => match.id);

      const playerRows = await ctx.db
        .select({
          matchId: playersToMatches.matchId,
          placement: playersToMatches.placement,
          playerId: players.id,
          name: players.name,
          backgroundColor: players.backgroundColor,
          commanderId: playersToMatches.commanderId,
          commanderName: commanders.name,
          commanderImageUrl: commanders.imageUrl,
          commanderArtImageUrl: commanders.artImageUrl,
        })
        .from(playersToMatches)
        .innerJoin(players, eq(players.id, playersToMatches.playerId))
        .leftJoin(commanders, eq(commanders.id, playersToMatches.commanderId))
        .where(inArray(playersToMatches.matchId, matchIds))
        .orderBy(
          asc(playersToMatches.matchId),
          asc(playersToMatches.placement),
        );

      const playersByMatch = new Map<
        number,
        {
          playerId: number;
          name: string;
          backgroundColor: string;
          placement: number;
          commander: {
            id: number;
            name: string | null;
            imageUrl: string | null;
            artImageUrl: string | null;
          } | null;
        }[]
      >();

      for (const row of playerRows) {
        if (!playersByMatch.has(row.matchId)) {
          playersByMatch.set(row.matchId, []);
        }

        const safeName = row.name ?? "Invocador desconocido";
        const safeColor = row.backgroundColor ?? "#1f2937";
        const commander =
          row.commanderId != null
            ? {
                id: row.commanderId,
                name: row.commanderName ?? null,
                imageUrl: row.commanderImageUrl ?? null,
                artImageUrl: row.commanderArtImageUrl,
              }
            : null;

        playersByMatch.get(row.matchId)?.push({
          playerId: row.playerId,
          name: safeName,
          backgroundColor: safeColor,
          placement: row.placement,
          commander,
        });
      }

      return matchRows.map((match) => ({
        id: match.id,
        croppedImage: match.croppedImage,
        image: match.image,
        startingHp: match.startingHp,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
        players:
          playersByMatch.get(match.id)?.map((player) => ({
            id: player.playerId,
            name: player.name,
            backgroundColor: player.backgroundColor,
            placement: player.placement,
            commander: player.commander
              ? {
                  id: player.commander.id,
                  name: player.commander.name,
                  imageUrl: player.commander.imageUrl,
                  artImageUrl: player.commander.artImageUrl,
                }
              : null,
          })) ?? [],
      }));
    }),
});

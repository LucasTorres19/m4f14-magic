import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  commanders,
  matchImages,
  matches,
  players,
  playersToMatches,
} from "@/server/db/schema";

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

      const matchRows = await ctx.db
        .select({
          id: matches.id,
          startingHp: matches.startingHp,
          createdAt: matches.createdAt,
          updatedAt: matches.updatedAt,
        })
        .from(matches)
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

      const imageRows =
        matchIds.length === 0
          ? []
          : await ctx.db
              .select({
                id: matchImages.id,
                matchId: matchImages.matchId,
                fileKey: matchImages.fileKey,
                fileUrl: matchImages.fileUrl,
                originalName: matchImages.originalName,
                displayOrder: matchImages.displayOrder,
              })
              .from(matchImages)
              .where(inArray(matchImages.matchId, matchIds))
              .orderBy(
                asc(matchImages.matchId),
                asc(matchImages.displayOrder),
                asc(matchImages.id),
              );

      const imagesByMatch = new Map<
        number,
        {
          id: number;
          fileKey: string;
          fileUrl: string;
          originalName: string | null;
          displayOrder: number;
        }[]
      >();

      for (const row of imageRows) {
        if (!imagesByMatch.has(row.matchId)) {
          imagesByMatch.set(row.matchId, []);
        }

        imagesByMatch.get(row.matchId)?.push({
          id: row.id,
          fileKey: row.fileKey,
          fileUrl: row.fileUrl,
          originalName: row.originalName,
          displayOrder: row.displayOrder,
        });
      }

      return matchRows.map((match) => ({
        id: match.id,
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
        images:
          imagesByMatch.get(match.id)?.map((image) => ({
            id: image.id,
            key: image.fileKey,
            url: image.fileUrl,
            name: image.originalName,
            order: image.displayOrder,
          })) ?? [],
      }));
    }),
});

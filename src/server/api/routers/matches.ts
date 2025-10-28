import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { matches, players, playersToMatches } from "@/server/db/schema";

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
        })
        .from(playersToMatches)
        .innerJoin(players, eq(players.id, playersToMatches.playerId))
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
        }[]
      >();

      for (const row of playerRows) {
        if (!playersByMatch.has(row.matchId)) {
          playersByMatch.set(row.matchId, []);
        }

        const safeName = row.name ?? "Invocador desconocido";
        const safeColor = row.backgroundColor ?? "#1f2937";

        playersByMatch.get(row.matchId)?.push({
          playerId: row.playerId,
          name: safeName,
          backgroundColor: safeColor,
          placement: row.placement,
        });
      }

      return matchRows.map((match) => ({
        id: match.id,
        startingHp: match.startingHp,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
        players:
          playersByMatch
            .get(match.id)
            ?.map((player) => ({
              id: player.playerId,
              name: player.name,
              backgroundColor: player.backgroundColor,
              placement: player.placement,
            })) ?? [],
      }));
    }),
});

import { utapi } from "@/app/api/uploadthing/core";
import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  max,
  ne,
  sql,
  sum,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { z } from "zod";

import { normalizeInvokerAlias } from "@/lib/invoker-profile";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { writeAuditLog } from "@/server/audit";
import type { db } from "@/server/db";
import {
  commanders,
  images,
  matches,
  players,
  playersToMatches,
  tournaments,
} from "@/server/db/schema";
import {
  calculateDominationRelations,
  calculatePlayerRivalStats,
  type DominationRelation,
} from "@/server/domain/domination";
import { revalidatePath } from "next/cache";

const playerProfileImage = alias(images, "player_profile_image");

const profileImageInputSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1),
});

async function getDominationRelations(database: typeof db) {
  const winnerEntry = alias(playersToMatches, "winner_entry");
  const rivalEntry = alias(playersToMatches, "rival_entry");
  const winner = alias(players, "winner");
  const rival = alias(players, "rival");

  const directWins = await database
    .select({
      winnerId: winnerEntry.playerId,
      winnerName: winner.name,
      winnerColor: winner.backgroundColor,
      rivalId: rivalEntry.playerId,
      rivalName: rival.name,
      rivalColor: rival.backgroundColor,
      wins: count(sql`1`).as("wins"),
    })
    .from(winnerEntry)
    .innerJoin(
      rivalEntry,
      and(
        eq(rivalEntry.matchId, winnerEntry.matchId),
        ne(rivalEntry.playerId, winnerEntry.playerId),
      ),
    )
    .innerJoin(winner, eq(winner.id, winnerEntry.playerId))
    .innerJoin(rival, eq(rival.id, rivalEntry.playerId))
    .where(eq(winnerEntry.placement, 1))
    .groupBy(
      winnerEntry.playerId,
      winner.name,
      winner.backgroundColor,
      rivalEntry.playerId,
      rival.name,
      rival.backgroundColor,
    );

  return calculateDominationRelations(
    directWins.map((row) => ({ ...row, wins: Number(row.wins) })),
  );
}

async function getSharedRivalCounts(database: typeof db, playerId: number) {
  const playerEntry = alias(playersToMatches, "player_entry");
  const rivalEntry = alias(playersToMatches, "shared_rival_entry");
  const rival = alias(players, "shared_rival");

  const rows = await database
    .select({
      rivalId: rivalEntry.playerId,
      rivalName: rival.name,
      rivalColor: rival.backgroundColor,
      sharedMatches: count(sql`1`).as("sharedMatches"),
      wins: sum(
        sql<number>`CASE WHEN ${playerEntry.placement} = 1 THEN 1 ELSE 0 END`,
      ).as("wins"),
      losses: sum(
        sql<number>`CASE WHEN ${rivalEntry.placement} = 1 THEN 1 ELSE 0 END`,
      ).as("losses"),
    })
    .from(playerEntry)
    .innerJoin(
      rivalEntry,
      and(
        eq(rivalEntry.matchId, playerEntry.matchId),
        ne(rivalEntry.playerId, playerEntry.playerId),
      ),
    )
    .innerJoin(rival, eq(rival.id, rivalEntry.playerId))
    .where(eq(playerEntry.playerId, playerId))
    .groupBy(rivalEntry.playerId, rival.name, rival.backgroundColor);

  return rows.map((row) => ({
    rivalId: row.rivalId,
    rivalName: row.rivalName ?? "Invocador desconocido",
    rivalColor: row.rivalColor ?? "#1f2937",
    sharedMatches: Number(row.sharedMatches),
    wins: Number(row.wins ?? 0),
    losses: Number(row.losses ?? 0),
  }));
}

function getPlayerDomination(
  relations: readonly DominationRelation[],
  playerId: number,
) {
  return {
    parents: relations
      .filter((relation) => relation.childId === playerId)
      .map((relation) => ({
        counterpartId: relation.parentId,
        counterpartName: relation.parentName,
        counterpartColor: relation.parentColor,
        wins: relation.parentWins,
        losses: relation.childWins,
        directMatches: relation.directMatches,
        winPercentage: relation.winPercentage,
      })),
    children: relations
      .filter((relation) => relation.parentId === playerId)
      .map((relation) => ({
        counterpartId: relation.childId,
        counterpartName: relation.childName,
        counterpartColor: relation.childColor,
        wins: relation.parentWins,
        losses: relation.childWins,
        directMatches: relation.directMatches,
        winPercentage: relation.winPercentage,
      })),
  };
}

export const playersRouter = createTRPCRouter({
  findAll: publicProcedure.query(async ({ ctx }) => {
    const dbPlayers = await ctx.db
      .select({
        id: players.id,
        name: players.name,
        backgroundColor: players.backgroundColor,
      })
      .from(players)
      .orderBy(asc(players.name));

    return dbPlayers;
  }),
  detail: publicProcedure
    .input(z.object({ playerId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [player] = await ctx.db
        .select({
          id: players.id,
          name: players.name,
          alias: players.alias,
          backgroundColor: players.backgroundColor,
          profileImageUrl: playerProfileImage.fileUrl,
        })
        .from(players)
        .leftJoin(
          playerProfileImage,
          eq(playerProfileImage.id, players.profileImage),
        )
        .where(eq(players.id, input.playerId))
        .limit(1);

      if (!player) return null;

      // Count players per match to detect 1v1 (league) games and exclude them from podium metrics
      const matchSizeAgg = ctx.db
        .select({
          matchId: playersToMatches.matchId,
          playerCount: count(sql`1`).as("playerCount"),
        })
        .from(playersToMatches)
        .groupBy(playersToMatches.matchId)
        .as("matchSizeAgg");

      const agg = ctx.db
        .select({
          commanderId: playersToMatches.commanderId,
          matchCount: count(sql`1`).as("matchCount"),
          wins: sum(
            sql<number>`CASE WHEN ${playersToMatches.placement} = 1 THEN 1 ELSE 0 END`,
          ).as("wins"),
          podiumMatchCount: sum(
            sql<number>`CASE WHEN ${matchSizeAgg.playerCount} >= 3 THEN 1 ELSE 0 END`,
          ).as("podiumMatchCount"),
          podiums: sum(
            sql<number>`CASE WHEN ${matchSizeAgg.playerCount} >= 3 AND ${playersToMatches.placement} IN (1,2) THEN 1 ELSE 0 END`,
          ).as("podiums"),
        })
        .from(playersToMatches)
        .innerJoin(
          matchSizeAgg,
          eq(matchSizeAgg.matchId, playersToMatches.matchId),
        )
        .where(
          sql`${playersToMatches.playerId} = ${input.playerId} and ${playersToMatches.commanderId} is not null`,
        )
        .groupBy(playersToMatches.commanderId)
        .as("agg");

      const [rows, dominationRelations, sharedRivals] = await Promise.all([
        ctx.db
          .select({
            commanderId: agg.commanderId,
            matchCount: agg.matchCount,
            wins: agg.wins,
            podiumMatchCount: agg.podiumMatchCount,
            podiums: agg.podiums,
            name: commanders.name,
            artImageUrl: commanders.artImageUrl,
            imageUrl: commanders.imageUrl,
          })
          .from(agg)
          .leftJoin(commanders, eq(commanders.id, agg.commanderId))
          .orderBy(desc(agg.matchCount), asc(commanders.name)),
        getDominationRelations(ctx.db),
        getSharedRivalCounts(ctx.db, player.id),
      ]);

      return {
        id: player.id,
        name: player.name,
        alias: player.alias,
        backgroundColor: player.backgroundColor,
        profileImageUrl: player.profileImageUrl,
        commanders: rows.map((r) => ({
          commanderId: r.commanderId ?? 0,
          name: r.name ?? null,
          artImageUrl: r.artImageUrl ?? null,
          imageUrl: r.imageUrl ?? null,
          matchCount: Number(r.matchCount ?? 0),
          wins: Number(r.wins ?? 0),
          podiumMatchCount: Number(r.podiumMatchCount ?? 0),
          podiums: Number(r.podiums ?? 0),
        })),
        ...getPlayerDomination(dominationRelations, player.id),
        rivals: calculatePlayerRivalStats(
          player.id,
          sharedRivals,
          dominationRelations,
        ),
      } as const;
    }),
  history: publicProcedure
    .input(
      z.object({
        playerId: z.number().int().positive(),
        limit: z.number().int().min(1).max(5000).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 50;

      // Base rows: matches where this player participated, include their placement and commander
      const img = alias(images, "orig_image");
      const cimg = alias(images, "cropped_image");

      const p2mSelf = playersToMatches;

      const baseRows = await ctx.db
        .select({
          matchId: matches.id,
          createdAt: matches.createdAt,
          startingHp: matches.startingHp,
          selfPlacement: p2mSelf.placement,
          selfCommanderId: p2mSelf.commanderId,
          image: {
            id: img.id,
            key: img.fileKey,
            url: img.fileUrl,
            variant: img.variant,
            width: img.width,
            height: img.height,
            sizeBytes: img.sizeBytes,
            mimeType: img.mimeType,
          },
          croppedImage: {
            id: cimg.id,
            key: cimg.fileKey,
            url: cimg.fileUrl,
            variant: cimg.variant,
            width: cimg.width,
            height: cimg.height,
            sizeBytes: cimg.sizeBytes,
            mimeType: cimg.mimeType,
          },
          leagueName: tournaments.name,
        })
        .from(matches)
        .innerJoin(p2mSelf, eq(p2mSelf.matchId, matches.id))
        .leftJoin(img, eq(img.id, matches.image))
        .leftJoin(cimg, eq(cimg.id, matches.cropped_image))
        .leftJoin(tournaments, eq(tournaments.id, matches.tournamentId))
        .where(eq(p2mSelf.playerId, input.playerId))
        .orderBy(desc(matches.createdAt))
        .limit(limit);

      if (baseRows.length === 0) return [] as const;

      const matchIds = baseRows.map((r) => r.matchId);

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
        if (!playersByMatch.has(row.matchId))
          playersByMatch.set(row.matchId, []);
        playersByMatch.get(row.matchId)!.push({
          playerId: row.playerId,
          name: row.name ?? "Invocador desconocido",
          backgroundColor: row.backgroundColor ?? "#1f2937",
          placement: row.placement,
          commander:
            row.commanderId != null
              ? {
                  id: row.commanderId,
                  name: row.commanderName ?? null,
                  imageUrl: row.commanderImageUrl ?? null,
                  artImageUrl: row.commanderArtImageUrl ?? null,
                }
              : null,
        });
      }

      // Attach self commander name/art
      const selfCommanderIds = baseRows
        .map((r) => r.selfCommanderId)
        .filter((x): x is number => x != null);
      const selfCommanderMap = new Map<
        number,
        {
          name: string | null;
          imageUrl: string | null;
          artImageUrl: string | null;
        }
      >();
      if (selfCommanderIds.length > 0) {
        const selfCmdRows = await ctx.db
          .select({
            id: commanders.id,
            name: commanders.name,
            imageUrl: commanders.imageUrl,
            artImageUrl: commanders.artImageUrl,
          })
          .from(commanders)
          .where(inArray(commanders.id, Array.from(new Set(selfCommanderIds))));
        for (const r of selfCmdRows)
          selfCommanderMap.set(r.id, {
            name: r.name ?? null,
            imageUrl: r.imageUrl ?? null,
            artImageUrl: r.artImageUrl ?? null,
          });
      }

      return baseRows.map((r) => ({
        matchId: r.matchId,
        createdAt: r.createdAt,
        startingHp: r.startingHp,
        self: {
          placement: r.selfPlacement,
          commander:
            r.selfCommanderId != null
              ? {
                  id: r.selfCommanderId,
                  ...(selfCommanderMap.get(r.selfCommanderId) ?? {
                    name: null,
                    imageUrl: null,
                    artImageUrl: null,
                  }),
                }
              : null,
        },
        image: r.image,
        croppedImage: r.croppedImage,
        players: playersByMatch.get(r.matchId) ?? [],
        leagueName: r.leagueName ?? null,
      }));
    }),
  listWithStats: publicProcedure.query(async ({ ctx }) => {
    const dominationRelationsPromise = getDominationRelations(ctx.db);

    // Usar cutoff desde SQLite para evitar problemas de zona horaria/tipos
    // equivalente a últimos 30 días: unixepoch('now','-30 days')
    // Count players per match to detect 1v1 (league) games and exclude them from podium metrics
    const matchSizeAgg = ctx.db
      .select({
        matchId: playersToMatches.matchId,
        playerCount: count(sql`1`).as("playerCount"),
      })
      .from(playersToMatches)
      .groupBy(playersToMatches.matchId)
      .as("matchSizeAgg");

    const agg = ctx.db
      .select({
        playerId: playersToMatches.playerId,
        matchCount: count(sql`1`).as("matchCount"),
        wins: sum(
          sql<number>`CASE WHEN ${playersToMatches.placement} = 1 THEN 1 ELSE 0 END`,
        ).as("wins"),
        podiumMatchCount: sum(
          sql<number>`CASE WHEN ${matchSizeAgg.playerCount} >= 3 THEN 1 ELSE 0 END`,
        ).as("podiumMatchCount"),
        podiums: sum(
          sql<number>`CASE WHEN ${matchSizeAgg.playerCount} >= 3 AND ${playersToMatches.placement} IN (1,2) THEN 1 ELSE 0 END`,
        ).as("podiums"),
        lastPlaceCount: sum(
          sql<number>`CASE WHEN ${matchSizeAgg.playerCount} > 2 AND ${playersToMatches.placement} = ${matchSizeAgg.playerCount} THEN 1 ELSE 0 END`,
        ).as("lastPlaceCount"),
        lastPlayedAt: max(matches.createdAt).as("lastPlayedAt"),
      })
      .from(playersToMatches)
      .innerJoin(
        matchSizeAgg,
        eq(matchSizeAgg.matchId, playersToMatches.matchId),
      )
      .innerJoin(matches, eq(matches.id, playersToMatches.matchId))
      .groupBy(playersToMatches.playerId)
      .as("agg");

    const agg30Rows = await ctx.db
      .select({
        playerId: playersToMatches.playerId,
        matchCount30: count(sql`1`).as("matchCount30"),
      })
      .from(playersToMatches)
      .innerJoin(matches, eq(playersToMatches.matchId, matches.id))
      .where(sql`${matches.createdAt} >= unixepoch('now','-30 days')`)
      .groupBy(playersToMatches.playerId);

    const usageAgg = ctx.db
      .select({
        playerId: playersToMatches.playerId,
        commanderId: playersToMatches.commanderId,
        cnt: count(sql`1`).as("cnt"),
        lastPlayed: max(playersToMatches.matchId).as("lastPlayed"),
      })
      .from(playersToMatches)
      .where(sql`${playersToMatches.commanderId} is not null`)
      .groupBy(playersToMatches.playerId, playersToMatches.commanderId)
      .as("usageAgg");

    const usageAgg30 = ctx.db
      .select({
        playerId: playersToMatches.playerId,
        commanderId: playersToMatches.commanderId,
        cnt: count(sql`1`).as("cnt"),
        lastPlayed: max(matches.createdAt).as("lastPlayed"),
      })
      .from(playersToMatches)
      .innerJoin(matches, eq(playersToMatches.matchId, matches.id))
      .where(
        sql`${playersToMatches.commanderId} is not null and ${matches.createdAt} >= unixepoch('now','-30 days')`,
      )
      .groupBy(playersToMatches.playerId, playersToMatches.commanderId)
      .as("usageAgg30");

    const usageRank = ctx.db
      .select({
        playerId: usageAgg.playerId,
        commanderId: usageAgg.commanderId,
        cnt: usageAgg.cnt,
        rn: sql<number>`
          row_number() over (
            partition by ${usageAgg.playerId}
            order by ${usageAgg.cnt} desc, ${usageAgg.lastPlayed} desc
          )
        `.as("rn"),
      })
      .from(usageAgg)
      .as("usageRank");

    const usageRank30 = ctx.db
      .select({
        playerId: usageAgg30.playerId,
        commanderId: usageAgg30.commanderId,
        cnt: usageAgg30.cnt,
        rn: sql<number>`
          row_number() over (
            partition by ${usageAgg30.playerId}
            order by ${usageAgg30.cnt} desc, ${usageAgg30.lastPlayed} desc
          )
        `.as("rn"),
      })
      .from(usageAgg30)
      .as("usageRank30");

    const topRows = await ctx.db
      .select({
        playerId: usageRank.playerId,
        commanderId: usageRank.commanderId,
        count: usageRank.cnt,
        commanderName: commanders.name,
        commanderArtImageUrl: commanders.artImageUrl,
      })
      .from(usageRank)
      .innerJoin(commanders, eq(commanders.id, usageRank.commanderId))
      .where(sql`${usageRank.rn} <= 3`);

    const topRows30 = await ctx.db
      .select({
        playerId: usageRank30.playerId,
        count: usageRank30.cnt,
      })
      .from(usageRank30)
      .where(eq(usageRank30.rn, 1));

    const topByPlayer = new Map<
      number,
      {
        commanderId: number;
        name: string | null;
        artImageUrl: string | null;
        count: number;
      }[]
    >();
    for (const row of topRows) {
      if (!topByPlayer.has(row.playerId)) topByPlayer.set(row.playerId, []);
      topByPlayer.get(row.playerId)!.push({
        commanderId: row.commanderId ?? 0,
        name: row.commanderName ?? null,
        artImageUrl: row.commanderArtImageUrl ?? null,
        count: Number(row.count ?? 0),
      });
    }

    const top30ByPlayerCount = new Map<number, number>();
    for (const r of topRows30) {
      top30ByPlayerCount.set(r.playerId ?? 0, Number(r.count ?? 0));
    }

    const matchCount30ByPlayer = new Map<number, number>();
    for (const r of agg30Rows) {
      matchCount30ByPlayer.set(r.playerId ?? 0, Number(r.matchCount30 ?? 0));
    }

    // Count distinct commanders per player (diversity)
    const uniqueRows = await ctx.db
      .select({
        playerId: usageAgg.playerId,
        uniqueCommanderCount: count(sql`1`).as("uniqueCommanderCount"),
      })
      .from(usageAgg)
      .groupBy(usageAgg.playerId);

    const uniqueByPlayer = new Map<number, number>();
    for (const r of uniqueRows) {
      uniqueByPlayer.set(r.playerId ?? 0, Number(r.uniqueCommanderCount ?? 0));
    }

    const rows = await ctx.db
      .select({
        id: players.id,
        name: players.name,
        alias: players.alias,
        backgroundColor: players.backgroundColor,
        profileImageUrl: playerProfileImage.fileUrl,
        matchCount: agg.matchCount,
        wins: agg.wins,
        podiumMatchCount: agg.podiumMatchCount,
        podiums: agg.podiums,
        lastPlaceCount: agg.lastPlaceCount,
        lastPlayedAt: agg.lastPlayedAt,
      })
      .from(players)
      .leftJoin(
        playerProfileImage,
        eq(playerProfileImage.id, players.profileImage),
      )
      .leftJoin(agg, eq(agg.playerId, players.id))
      .orderBy(asc(players.name));

    const [lastMatchRow] = await ctx.db
      .select({ lastCreatedAt: max(matches.createdAt).as("lastCreatedAt") })
      .from(matches);

    let lastWinnerId: number | null = null;
    if (lastMatchRow?.lastCreatedAt != null) {
      const [lastWinner] = await ctx.db
        .select({ playerId: playersToMatches.playerId })
        .from(playersToMatches)
        .innerJoin(matches, eq(playersToMatches.matchId, matches.id))
        .where(
          sql`${matches.createdAt} = ${lastMatchRow.lastCreatedAt} and ${playersToMatches.placement} = 1`,
        )
        .orderBy(desc(matches.id))
        .limit(1);
      lastWinnerId = lastWinner?.playerId ?? null;
    }

    const orderedMatches = ctx.db.$with("ordered_matches").as(
      ctx.db
        .select({
          playerId: playersToMatches.playerId,
          createdAt: matches.createdAt,
          placement: playersToMatches.placement,
          lossGroup: sql<number>`
            sum(case when ${playersToMatches.placement} <> 1 then 1 else 0 end)
              over (
                partition by ${playersToMatches.playerId}
                order by ${matches.createdAt}, ${matches.id}
              )
          `.as("lossGroup"),
        })
        .from(playersToMatches)
        .innerJoin(matches, eq(playersToMatches.matchId, matches.id)),
    );

    const [streakChampion] = await ctx.db
      .with(orderedMatches)
      .select({
        playerId: orderedMatches.playerId,
        streak: sql<number>`count(*)`,
        lastWinAt: sql<number>`max(${orderedMatches.createdAt})`.as(
          "lastWinAt",
        ),
      })
      .from(orderedMatches)
      .where(eq(orderedMatches.placement, 1))
      .groupBy(
        sql`${orderedMatches.playerId}`,
        sql`${orderedMatches.lossGroup}`,
      )
      .orderBy(sql`count(*) desc`, sql`max(${orderedMatches.createdAt}) desc`)
      .limit(1);

    const streakChampionId: number | null = streakChampion?.playerId ?? null;
    const dominationRelations = await dominationRelationsPromise;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      alias: r.alias,
      backgroundColor: r.backgroundColor,
      profileImageUrl: r.profileImageUrl,
      matchCount: Number(r.matchCount ?? 0),
      wins: Number(r.wins ?? 0),
      podiumMatchCount: Number(r.podiumMatchCount ?? 0),
      podiums: Number(r.podiums ?? 0),
      lastPlaceCount: Number(r.lastPlaceCount ?? 0),
      lastPlayedAt: r.lastPlayedAt ?? null,
      topDecks: (topByPlayer.get(r.id) ?? []).sort((a, b) => b.count - a.count),
      isLastWinner: lastWinnerId != null && r.id === lastWinnerId,
      isStreakChampion: streakChampionId != null && r.id === streakChampionId,
      uniqueCommanderCount: Number(uniqueByPlayer.get(r.id) ?? 0),
      isOtp:
        (matchCount30ByPlayer.get(r.id) ?? 0) >= 5 &&
        (top30ByPlayerCount.get(r.id) ?? 0) /
          Math.max(1, matchCount30ByPlayer.get(r.id) ?? 1) >=
          0.6,
      ...getPlayerDomination(dominationRelations, r.id),
    }));
  }),
  updateColor: protectedProcedure
    .input(
      z.object({
        playerId: z.number().int().positive(),
        color: z
          .string()
          .regex(
            /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
            "Color inválido (usa HEX).",
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(players)
        .set({ backgroundColor: input.color })
        .where(eq(players.id, input.playerId));

      return { ok: true } as const;
    }),
  updateAlias: protectedProcedure
    .input(
      z.object({
        playerId: z.number().int().positive(),
        alias: z.string().trim().max(80).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedAlias = normalizeInvokerAlias(input.alias);
      const [updatedPlayer] = await ctx.db
        .update(players)
        .set({ alias: normalizedAlias })
        .where(eq(players.id, input.playerId))
        .returning({
          id: players.id,
          name: players.name,
          alias: players.alias,
        });

      if (!updatedPlayer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No encontramos ese invocador.",
        });
      }

      revalidatePath("/summoner");
      revalidatePath(`/summoner/${updatedPlayer.id}`);
      revalidatePath("/history");
      revalidatePath("/analytics");
      await writeAuditLog({
        action: "player.alias_updated",
        entityType: "player",
        entityId: updatedPlayer.id,
        summary: `Alias updated for ${updatedPlayer.name}`,
        metadata: { alias: updatedPlayer.alias },
        headers: ctx.headers,
      });

      return { alias: updatedPlayer.alias } as const;
    }),
  authorizeProfileImageUpload: protectedProcedure.mutation(() => {
    return { ok: true } as const;
  }),
  setProfileImage: protectedProcedure
    .input(
      z.object({
        playerId: z.number().int().positive(),
        image: profileImageInputSchema.nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const [player] = await tx
          .select({
            id: players.id,
            name: players.name,
            profileImageId: players.profileImage,
          })
          .from(players)
          .where(eq(players.id, input.playerId))
          .limit(1);

        if (!player) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No encontramos ese invocador.",
          });
        }

        let nextImage: { id: number; key: string; url: string } | undefined;

        if (input.image) {
          [nextImage] = await tx
            .insert(images)
            .values({
              fileKey: input.image.key,
              fileUrl: input.image.url,
              variant: "profile",
              width: input.image.width,
              height: input.image.height,
              sizeBytes: input.image.sizeBytes,
              mimeType: input.image.mimeType,
            })
            .returning({
              id: images.id,
              key: images.fileKey,
              url: images.fileUrl,
            });

          if (!nextImage) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "No se pudo guardar la foto.",
            });
          }
        }

        await tx
          .update(players)
          .set({ profileImage: nextImage?.id ?? null })
          .where(eq(players.id, player.id));

        let previousFileKey: string | null = null;
        if (player.profileImageId != null) {
          const [deletedImage] = await tx
            .delete(images)
            .where(eq(images.id, player.profileImageId))
            .returning({ fileKey: images.fileKey });
          previousFileKey = deletedImage?.fileKey ?? null;
        }

        return {
          playerId: player.id,
          playerName: player.name,
          previousImageId: player.profileImageId,
          previousFileKey,
          image: nextImage ?? null,
        };
      });

      if (result.previousFileKey) {
        await utapi.deleteFiles(result.previousFileKey);
      }

      revalidatePath("/summoner");
      revalidatePath(`/summoner/${result.playerId}`);
      revalidatePath("/history");
      revalidatePath("/analytics");
      await writeAuditLog({
        action: result.image
          ? "player.profile_image_updated"
          : "player.profile_image_removed",
        entityType: "player",
        entityId: result.playerId,
        summary: result.image
          ? `Profile image updated for ${result.playerName}`
          : `Profile image removed for ${result.playerName}`,
        metadata: {
          previousImageId: result.previousImageId,
          nextImageId: result.image?.id ?? null,
        },
        headers: ctx.headers,
      });

      return { image: result.image } as const;
    }),
});

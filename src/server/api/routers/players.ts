import { asc, count, desc, eq, max, sql, sum, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  commanders,
  matches,
  players,
  playersToMatches,
  images,
} from "@/server/db/schema";

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
          backgroundColor: players.backgroundColor,
        })
        .from(players)
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
        .innerJoin(matchSizeAgg, eq(matchSizeAgg.matchId, playersToMatches.matchId))
        .where(
          sql`${playersToMatches.playerId} = ${input.playerId} and ${playersToMatches.commanderId} is not null`,
        )
        .groupBy(playersToMatches.commanderId)
        .as("agg");

      const rows = await ctx.db
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
        .orderBy(desc(agg.matchCount), asc(commanders.name));

      return {
        id: player.id,
        name: player.name,
        backgroundColor: player.backgroundColor,
        commanders: rows.map((r) => ({
          commanderId: r.commanderId ?? 0,
          name: r.name ?? null,
          artImageUrl: r.artImageUrl ?? null,
          imageUrl: r.imageUrl ?? null,
          matchCount: Number(r.matchCount ?? 0),
          wins: Number(r.wins ?? 0),
          podiumMatchCount: Number(r.podiumMatchCount ?? r.matchCount ?? 0),
          podiums: Number(r.podiums ?? 0),
        })),
      } as const;
    }),
  history: publicProcedure
    .input(
      z.object({ playerId: z.number().int().positive(), limit: z.number().int().min(1).max(200).optional() })
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
          image: { id: img.id, url: img.fileUrl },
          croppedImage: { id: cimg.id, url: cimg.fileUrl },
        })
        .from(matches)
        .innerJoin(p2mSelf, eq(p2mSelf.matchId, matches.id))
        .leftJoin(img, eq(img.id, matches.image))
        .leftJoin(cimg, eq(cimg.id, matches.cropped_image))
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
        .orderBy(asc(playersToMatches.matchId), asc(playersToMatches.placement));

      const playersByMatch = new Map<
        number,
        {
          playerId: number;
          name: string;
          backgroundColor: string;
          placement: number;
          commander: { id: number; name: string | null; imageUrl: string | null; artImageUrl: string | null } | null;
        }[]
      >();

      for (const row of playerRows) {
        if (!playersByMatch.has(row.matchId)) playersByMatch.set(row.matchId, []);
        playersByMatch.get(row.matchId)!.push({
          playerId: row.playerId,
          name: row.name ?? "Invocador desconocido",
          backgroundColor: row.backgroundColor ?? "#1f2937",
          placement: row.placement,
          commander: row.commanderId != null
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
      const selfCommanderMap = new Map<number, { name: string | null; imageUrl: string | null; artImageUrl: string | null }>();
      if (selfCommanderIds.length > 0) {
        const selfCmdRows = await ctx.db
          .select({ id: commanders.id, name: commanders.name, imageUrl: commanders.imageUrl, artImageUrl: commanders.artImageUrl })
          .from(commanders)
          .where(inArray(commanders.id, Array.from(new Set(selfCommanderIds))));
        for (const r of selfCmdRows) selfCommanderMap.set(r.id, { name: r.name ?? null, imageUrl: r.imageUrl ?? null, artImageUrl: r.artImageUrl ?? null });
      }

      return baseRows.map((r) => ({
        matchId: r.matchId,
        createdAt: r.createdAt,
        startingHp: r.startingHp,
        self: {
          placement: r.selfPlacement,
          commander: r.selfCommanderId != null
            ? { id: r.selfCommanderId, ...(selfCommanderMap.get(r.selfCommanderId) ?? { name: null, imageUrl: null, artImageUrl: null }) }
            : null,
        },
        image: r.image,
        croppedImage: r.croppedImage,
        players: playersByMatch.get(r.matchId) ?? [],
      }));
    }),
  listWithStats: publicProcedure.query(async ({ ctx }) => {
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
      })
      .from(playersToMatches)
      .innerJoin(matchSizeAgg, eq(matchSizeAgg.matchId, playersToMatches.matchId))
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
      .where(sql`${playersToMatches.commanderId} is not null and ${matches.createdAt} >= unixepoch('now','-30 days')`)
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
        backgroundColor: players.backgroundColor,
        matchCount: agg.matchCount,
        wins: agg.wins,
        podiumMatchCount: agg.podiumMatchCount,
        podiums: agg.podiums,
      })
      .from(players)
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

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        backgroundColor: r.backgroundColor,
        matchCount: Number(r.matchCount ?? 0),
        wins: Number(r.wins ?? 0),
        podiumMatchCount: Number(r.podiumMatchCount ?? 0),
        podiums: Number(r.podiums ?? 0),
        topDecks: (topByPlayer.get(r.id) ?? []).sort((a, b) => b.count - a.count),
        isLastWinner: lastWinnerId != null && r.id === lastWinnerId,
        isStreakChampion: streakChampionId != null && r.id === streakChampionId,
        uniqueCommanderCount: Number(uniqueByPlayer.get(r.id) ?? 0),
      isOtp:
        (matchCount30ByPlayer.get(r.id) ?? 0) >= 5 &&
        (top30ByPlayerCount.get(r.id) ?? 0) / Math.max(1, matchCount30ByPlayer.get(r.id) ?? 1) >= 0.6,
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
});

import { asc, count, eq, max, sql, sum, desc } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { commanders, matches, players, playersToMatches } from "@/server/db/schema";

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
  listWithStats: publicProcedure.query(async ({ ctx }) => {
    const agg = ctx.db
      .select({
        playerId: playersToMatches.playerId,
        matchCount: count(sql`1`).as("matchCount"),
        wins: sum(
          sql<number>`CASE WHEN ${playersToMatches.placement} = 1 THEN 1 ELSE 0 END`,
        ).as("wins"),
        podiums: sum(
          sql<number>`CASE WHEN ${playersToMatches.placement} IN (1,2,3) THEN 1 ELSE 0 END`,
        ).as("podiums"),
      })
      .from(playersToMatches)
      .groupBy(playersToMatches.playerId)
      .as("agg");

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

    const topByPlayer = new Map<
      number,
      { commanderId: number; name: string | null; artImageUrl: string | null; count: number }[]
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

    const rows = await ctx.db
      .select({
        id: players.id,
        name: players.name,
        backgroundColor: players.backgroundColor,
        matchCount: agg.matchCount,
        wins: agg.wins,
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
        lastWinAt: sql<number>`max(${orderedMatches.createdAt})`.
          as("lastWinAt"),
      })
      .from(orderedMatches)
      .where(eq(orderedMatches.placement, 1))
      .groupBy(sql`${orderedMatches.playerId}`, sql`${orderedMatches.lossGroup}`)
      .orderBy(sql`count(*) desc`, sql`max(${orderedMatches.createdAt}) desc`)
      .limit(1);

    const streakChampionId: number | null = streakChampion?.playerId ?? null;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      backgroundColor: r.backgroundColor,
      matchCount: Number(r.matchCount ?? 0),
      wins: Number(r.wins ?? 0),
      podiums: Number(r.podiums ?? 0),
      topDecks: (topByPlayer.get(r.id) ?? []).sort((a, b) => b.count - a.count),
      isLastWinner: lastWinnerId != null && r.id === lastWinnerId,
      isStreakChampion: streakChampionId != null && r.id === streakChampionId,
    }));
  }),
});

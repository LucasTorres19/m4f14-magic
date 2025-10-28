import { eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { matches, players, playersToMatches } from "@/server/db/schema";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DAYS_IN_WEEK = 7;
const MATCH_DAY_BUCKET = 10;

const startOfDay = (input: Date) => {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
};

const dateKey = (input: Date) => startOfDay(input).toISOString().slice(0, 10);

export type AnalyticsSnapshot = {
  totals: {
    totalMatches: number;
    totalPlayers: number;
    matchesThisWeek: number;
    activePlayersThisWeek: number;
  };
  matchesPerDay: { day: string; matches: number }[];
  weeklyTopPlayers: {
    playerId: number;
    name: string;
    wins: number;
    backgroundColor: string;
  }[];
  allTimeTopPlayer: {
    playerId: number;
    name: string;
    wins: number;
    backgroundColor: string;
  } | null;
};

export const getAnalyticsSnapshot = async (
  now = new Date(),
): Promise<AnalyticsSnapshot> => {
  const today = startOfDay(now);
  const weekStart = new Date(today.getTime() - (DAYS_IN_WEEK - 1) * DAY_IN_MS);
  const matchesRangeStart = new Date(
    today.getTime() - (MATCH_DAY_BUCKET - 1) * DAY_IN_MS,
  );

  const [matchRows, totalPlayersRow, participantRows] = await Promise.all([
    db
      .select({
        id: matches.id,
        startingHp: matches.startingHp,
        createdAt: matches.createdAt,
      })
      .from(matches),
    db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(players),
    db
      .select({
        playerId: players.id,
        name: players.name,
        backgroundColor: players.backgroundColor,
        placement: playersToMatches.placement,
        matchId: playersToMatches.matchId,
        matchCreatedAt: matches.createdAt,
      })
      .from(playersToMatches)
      .innerJoin(players, eq(players.id, playersToMatches.playerId))
      .innerJoin(matches, eq(matches.id, playersToMatches.matchId)),
  ]);

  const totalMatches = matchRows.length;
  const totalPlayers = Number(totalPlayersRow[0]?.count ?? 0);

  const matchesThisWeek = matchRows.filter(
    (match) => match.createdAt >= weekStart,
  ).length;

  const activePlayersThisWeek = new Set(
    participantRows
      .filter((participant) => participant.matchCreatedAt >= weekStart)
      .map((participant) => participant.playerId),
  ).size;

  const matchesPerDayBuckets = new Map<string, number>();
  for (let index = 0; index < MATCH_DAY_BUCKET; index++) {
    const day = new Date(matchesRangeStart.getTime() + index * DAY_IN_MS);
    matchesPerDayBuckets.set(dateKey(day), 0);
  }

  matchRows.forEach((match) => {
    if (match.createdAt < matchesRangeStart) {
      return;
    }
    const key = dateKey(match.createdAt);
    matchesPerDayBuckets.set(key, (matchesPerDayBuckets.get(key) ?? 0) + 1);
  });

  const matchesPerDay = Array.from(matchesPerDayBuckets.entries()).map(
    ([day, count]) => ({
      day,
      matches: count,
    }),
  );

  const weeklyWinsByPlayer = new Map<
    number,
    { name: string; wins: number; backgroundColor: string }
  >();
  const allTimeWinsByPlayer = new Map<
    number,
    { name: string; wins: number; backgroundColor: string }
  >();

  participantRows.forEach((participant) => {
    if (participant.placement !== 1) {
      return;
    }

    const allTimeCurrent = allTimeWinsByPlayer.get(participant.playerId);
    if (!allTimeCurrent) {
      allTimeWinsByPlayer.set(participant.playerId, {
        name: participant.name ?? "Invocador desconocido",
        wins: 1,
        backgroundColor: participant.backgroundColor ?? "#1f2937",
      });
    } else {
      allTimeCurrent.wins += 1;
    }

    if (participant.matchCreatedAt < weekStart) {
      return;
    }

    const weeklyCurrent = weeklyWinsByPlayer.get(participant.playerId);
    if (!weeklyCurrent) {
      weeklyWinsByPlayer.set(participant.playerId, {
        name: participant.name ?? "Invocador desconocido",
        wins: 1,
        backgroundColor: participant.backgroundColor ?? "#1f2937",
      });
      return;
    }

    weeklyCurrent.wins += 1;
  });

  const weeklyTopPlayers = Array.from(weeklyWinsByPlayer.entries())
    .map(([playerId, payload]) => ({
      playerId,
      name: payload.name,
      wins: payload.wins,
      backgroundColor: payload.backgroundColor,
    }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 6);

  let allTimeTopPlayer: AnalyticsSnapshot["allTimeTopPlayer"] = null;
  allTimeWinsByPlayer.forEach((payload, playerId) => {
    if (!allTimeTopPlayer || payload.wins > allTimeTopPlayer.wins) {
      allTimeTopPlayer = {
        playerId,
        name: payload.name,
        wins: payload.wins,
        backgroundColor: payload.backgroundColor,
      };
    }
  });

  const startingHpTotals = new Map<number, number>();
  matchRows.forEach((match) => {
    const current = startingHpTotals.get(match.startingHp) ?? 0;
    startingHpTotals.set(match.startingHp, current + 1);
  });

  return {
    totals: {
      totalMatches,
      totalPlayers,
      matchesThisWeek,
      activePlayersThisWeek,
    },
    matchesPerDay,
    weeklyTopPlayers,
    allTimeTopPlayer,
  };
};

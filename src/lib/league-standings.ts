export type LeagueResultPlayer = {
  id: number;
  name: string;
  alias?: string | null;
  backgroundColor: string;
  profileImageUrl?: string | null;
  placement: number;
};

export type LeagueResult = {
  players: LeagueResultPlayer[];
};

export type LeagueStanding = {
  id: number;
  name: string;
  alias: string | null;
  color: string;
  profileImageUrl: string | null;
  points: number;
  wins: number;
  played: number;
  last: ("W" | "L")[];
};

type HeadToHeadMatch = {
  winnerId: number;
  loserId: number;
};

function fallbackStandingOrder(a: LeagueStanding, b: LeagueStanding) {
  return b.wins - a.wins || a.name.localeCompare(b.name);
}

function orderTiedGroup(
  standings: LeagueStanding[],
  headToHeadMatches: HeadToHeadMatch[],
): LeagueStanding[] {
  if (standings.length < 2) return standings;

  const playerIds = new Set(standings.map((standing) => standing.id));
  const internalWins = new Map<number, number>(
    standings.map((standing) => [standing.id, 0] as const),
  );

  for (const match of headToHeadMatches) {
    if (!playerIds.has(match.winnerId) || !playerIds.has(match.loserId)) {
      continue;
    }
    internalWins.set(
      match.winnerId,
      (internalWins.get(match.winnerId) ?? 0) + 1,
    );
  }

  const scores = standings.map(
    (standing) => internalWins.get(standing.id) ?? 0,
  );
  if (scores.every((score) => score === scores[0])) {
    return [...standings].sort(fallbackStandingOrder);
  }

  const byInternalWins = new Map<number, LeagueStanding[]>();
  for (const standing of standings) {
    const score = internalWins.get(standing.id) ?? 0;
    const group = byInternalWins.get(score) ?? [];
    group.push(standing);
    byInternalWins.set(score, group);
  }

  return Array.from(byInternalWins.entries())
    .sort(([scoreA], [scoreB]) => scoreB - scoreA)
    .flatMap(([, group]) =>
      group.length > 1 ? orderTiedGroup(group, headToHeadMatches) : group,
    );
}

export function calculateLeagueStandings(
  results: readonly LeagueResult[],
): LeagueStanding[] {
  const standingsByPlayer = new Map<number, LeagueStanding>();
  const headToHeadMatches: HeadToHeadMatch[] = [];

  for (const result of results) {
    const sorted = [...result.players].sort(
      (a, b) => a.placement - b.placement,
    );
    const winner = sorted[0];
    const loser = sorted[1];
    if (!winner || !loser) continue;

    headToHeadMatches.push({
      winnerId: winner.id,
      loserId: loser.id,
    });

    for (const player of [winner, loser]) {
      const standing = standingsByPlayer.get(player.id) ?? {
        id: player.id,
        name: player.name,
        alias: player.alias ?? null,
        color: player.backgroundColor,
        profileImageUrl: player.profileImageUrl ?? null,
        points: 0,
        wins: 0,
        played: 0,
        last: [],
      };

      standing.played += 1;
      if (player.id === winner.id) {
        standing.wins += 1;
        standing.points += 3;
        standing.last.unshift("W");
      } else {
        standing.last.unshift("L");
      }
      standing.last = standing.last.slice(0, 5);
      standingsByPlayer.set(player.id, standing);
    }
  }

  const standings = Array.from(standingsByPlayer.values());
  const byPoints = new Map<number, LeagueStanding[]>();
  for (const standing of standings) {
    const group = byPoints.get(standing.points) ?? [];
    group.push(standing);
    byPoints.set(standing.points, group);
  }

  return Array.from(byPoints.entries())
    .sort(([pointsA], [pointsB]) => pointsB - pointsA)
    .flatMap(([, group]) => orderTiedGroup(group, headToHeadMatches));
}

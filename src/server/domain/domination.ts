export const MIN_DIRECT_MATCHES = 4;
export const DOMINATION_WIN_RATE = 0.66;

export type DirectWinCount = {
  winnerId: number;
  winnerName: string;
  winnerColor: string;
  rivalId: number;
  rivalName: string;
  rivalColor: string;
  wins: number;
};

export type DominationRelation = {
  parentId: number;
  parentName: string;
  parentColor: string;
  childId: number;
  childName: string;
  childColor: string;
  parentWins: number;
  childWins: number;
  directMatches: number;
  winPercentage: number;
};

export type SharedRivalCount = {
  rivalId: number;
  rivalName: string;
  rivalColor: string;
  sharedMatches: number;
  wins: number;
  losses: number;
};

export type RivalRelationship = "parent" | "child" | "rival";

export type PlayerRivalStats = SharedRivalCount & {
  directMatches: number;
  otherWinnerMatches: number;
  winPercentage: number | null;
  relationship: RivalRelationship;
};

type PlayerRef = {
  id: number;
  name: string;
  color: string;
};

type PairStats = {
  first: PlayerRef;
  second: PlayerRef;
  firstWins: number;
  secondWins: number;
};

/**
 * Builds ordered parent -> child relations from direct-win counts. A direct win
 * exists only when one of the pair actually won a match in which both played.
 */
export function calculateDominationRelations(
  directWins: readonly DirectWinCount[],
): DominationRelation[] {
  const pairs = new Map<string, PairStats>();

  for (const row of directWins) {
    if (row.winnerId === row.rivalId || row.wins <= 0) continue;

    const winnerIsFirst = row.winnerId < row.rivalId;
    const firstId = winnerIsFirst ? row.winnerId : row.rivalId;
    const secondId = winnerIsFirst ? row.rivalId : row.winnerId;
    const key = `${firstId}:${secondId}`;
    const current = pairs.get(key) ?? {
      first: winnerIsFirst
        ? {
            id: row.winnerId,
            name: row.winnerName,
            color: row.winnerColor,
          }
        : {
            id: row.rivalId,
            name: row.rivalName,
            color: row.rivalColor,
          },
      second: winnerIsFirst
        ? {
            id: row.rivalId,
            name: row.rivalName,
            color: row.rivalColor,
          }
        : {
            id: row.winnerId,
            name: row.winnerName,
            color: row.winnerColor,
          },
      firstWins: 0,
      secondWins: 0,
    };

    if (winnerIsFirst) current.firstWins += row.wins;
    else current.secondWins += row.wins;
    pairs.set(key, current);
  }

  const relations: DominationRelation[] = [];

  for (const pair of pairs.values()) {
    const directMatches = pair.firstWins + pair.secondWins;
    if (directMatches < MIN_DIRECT_MATCHES) continue;

    const firstRate = pair.firstWins / directMatches;
    const parentIsFirst = firstRate > DOMINATION_WIN_RATE;
    const parentIsSecond =
      pair.secondWins / directMatches > DOMINATION_WIN_RATE;
    if (!parentIsFirst && !parentIsSecond) continue;

    relations.push({
      parentId: parentIsFirst ? pair.first.id : pair.second.id,
      parentName: parentIsFirst ? pair.first.name : pair.second.name,
      parentColor: parentIsFirst ? pair.first.color : pair.second.color,
      childId: parentIsFirst ? pair.second.id : pair.first.id,
      childName: parentIsFirst ? pair.second.name : pair.first.name,
      childColor: parentIsFirst ? pair.second.color : pair.first.color,
      parentWins: parentIsFirst ? pair.firstWins : pair.secondWins,
      childWins: parentIsFirst ? pair.secondWins : pair.firstWins,
      directMatches,
      winPercentage: Math.round(
        ((parentIsFirst ? pair.firstWins : pair.secondWins) / directMatches) *
          100,
      ),
    });
  }

  return relations.sort(
    (a, b) =>
      b.winPercentage - a.winPercentage ||
      b.directMatches - a.directMatches ||
      a.parentName.localeCompare(b.parentName, "es"),
  );
}

export function calculatePlayerRivalStats(
  playerId: number,
  sharedRivals: readonly SharedRivalCount[],
  relations: readonly DominationRelation[],
): PlayerRivalStats[] {
  const relationshipByRival = new Map<number, RivalRelationship>();

  for (const relation of relations) {
    if (relation.parentId === playerId) {
      relationshipByRival.set(relation.childId, "child");
    } else if (relation.childId === playerId) {
      relationshipByRival.set(relation.parentId, "parent");
    }
  }

  return sharedRivals
    .map((rival) => {
      const directMatches = rival.wins + rival.losses;

      return {
        ...rival,
        directMatches,
        otherWinnerMatches: Math.max(0, rival.sharedMatches - directMatches),
        winPercentage:
          directMatches > 0
            ? Math.round((rival.wins / directMatches) * 100)
            : null,
        relationship: relationshipByRival.get(rival.rivalId) ?? "rival",
      };
    })
    .sort(
      (a, b) =>
        b.sharedMatches - a.sharedMatches ||
        b.directMatches - a.directMatches ||
        a.rivalName.localeCompare(b.rivalName, "es"),
    );
}

import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateDominationRelations,
  calculatePlayerRivalStats,
  type DirectWinCount,
} from "./domination";

function wins(
  winnerId: number,
  rivalId: number,
  count: number,
): DirectWinCount {
  return {
    winnerId,
    winnerName: `Jugador ${winnerId}`,
    winnerColor: `#00000${winnerId}`,
    rivalId,
    rivalName: `Jugador ${rivalId}`,
    rivalColor: `#00000${rivalId}`,
    wins: count,
  };
}

void test("califica un historial directo 8-2", () => {
  assert.deepEqual(
    calculateDominationRelations([wins(1, 2, 8), wins(2, 1, 2)]),
    [
      {
        parentId: 1,
        parentName: "Jugador 1",
        parentColor: "#000001",
        childId: 2,
        childName: "Jugador 2",
        childColor: "#000002",
        parentWins: 8,
        childWins: 2,
        directMatches: 10,
        winPercentage: 80,
      },
    ],
  );
});

void test("califica 3-1 y exige al menos cuatro victorias directas compartidas", () => {
  assert.equal(
    calculateDominationRelations([wins(1, 2, 3), wins(2, 1, 1)]).length,
    1,
  );
  assert.equal(
    calculateDominationRelations([wins(1, 2, 2), wins(2, 1, 1)]).length,
    0,
  );
});

void test("aplica mas de 66%, incluyendo 4-2 pero no un empate", () => {
  const relation = calculateDominationRelations([
    wins(1, 2, 4),
    wins(2, 1, 2),
  ])[0];

  assert.equal(relation?.winPercentage, 67);
  assert.equal(
    calculateDominationRelations([wins(1, 2, 2), wins(2, 1, 2)]).length,
    0,
  );
  assert.equal(
    calculateDominationRelations([wins(1, 2, 33), wins(2, 1, 17)]).length,
    0,
  );
});

void test("no compara entre si a participantes que no ganaron", () => {
  const relations = calculateDominationRelations([
    wins(3, 1, 4),
    wins(3, 2, 4),
  ]);

  assert.equal(
    relations.some(({ parentId, childId }) => parentId === 1 && childId === 2),
    false,
  );
  assert.equal(
    relations.some(({ parentId, childId }) => parentId === 2 && childId === 1),
    false,
  );
});

void test("incluye todos los rivales y separa partidas ganadas por terceros", () => {
  const relations = calculateDominationRelations([
    wins(1, 2, 3),
    wins(2, 1, 1),
    wins(4, 1, 4),
  ]);

  assert.deepEqual(
    calculatePlayerRivalStats(
      1,
      [
        {
          rivalId: 2,
          rivalName: "Jugador 2",
          rivalColor: "#000002",
          sharedMatches: 7,
          wins: 3,
          losses: 1,
        },
        {
          rivalId: 3,
          rivalName: "Jugador 3",
          rivalColor: "#000003",
          sharedMatches: 5,
          wins: 0,
          losses: 0,
        },
        {
          rivalId: 4,
          rivalName: "Jugador 4",
          rivalColor: "#000004",
          sharedMatches: 4,
          wins: 0,
          losses: 4,
        },
      ],
      relations,
    ),
    [
      {
        rivalId: 2,
        rivalName: "Jugador 2",
        rivalColor: "#000002",
        sharedMatches: 7,
        wins: 3,
        losses: 1,
        directMatches: 4,
        otherWinnerMatches: 3,
        winPercentage: 75,
        relationship: "child",
      },
      {
        rivalId: 3,
        rivalName: "Jugador 3",
        rivalColor: "#000003",
        sharedMatches: 5,
        wins: 0,
        losses: 0,
        directMatches: 0,
        otherWinnerMatches: 5,
        winPercentage: null,
        relationship: "rival",
      },
      {
        rivalId: 4,
        rivalName: "Jugador 4",
        rivalColor: "#000004",
        sharedMatches: 4,
        wins: 0,
        losses: 4,
        directMatches: 4,
        otherWinnerMatches: 0,
        winPercentage: 0,
        relationship: "parent",
      },
    ],
  );
});

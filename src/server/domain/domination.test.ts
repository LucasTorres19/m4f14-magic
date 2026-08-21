import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateDominationRelations,
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

import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateLeagueStandings,
  type LeagueResult,
  type LeagueResultPlayer,
} from "./league-standings";

const players = {
  a: { id: 1, name: "Ana", backgroundColor: "#111111" },
  b: { id: 2, name: "Beto", backgroundColor: "#222222" },
  c: { id: 3, name: "Carla", backgroundColor: "#333333" },
  d: { id: 4, name: "Diego", backgroundColor: "#444444" },
  e: { id: 5, name: "Elena", backgroundColor: "#555555" },
} as const;

function match(
  winner: Omit<LeagueResultPlayer, "placement">,
  loser: Omit<LeagueResultPlayer, "placement">,
): LeagueResult {
  return {
    players: [
      { ...winner, placement: 1 },
      { ...loser, placement: 2 },
    ],
  };
}

void test("orders a two-player points tie by their direct encounter", () => {
  const standings = calculateLeagueStandings([
    match(players.a, players.b),
    match(players.b, players.c),
  ]);

  assert.deepEqual(
    standings.map(({ name, points }) => [name, points]),
    [
      ["Ana", 3],
      ["Beto", 3],
      ["Carla", 0],
    ],
  );
});

void test("builds a mini-table for three or more players tied on points", () => {
  const standings = calculateLeagueStandings([
    match(players.a, players.b),
    match(players.a, players.c),
    match(players.b, players.c),
    match(players.b, players.d),
    match(players.c, players.d),
    match(players.c, players.e),
  ]);

  assert.deepEqual(
    standings.slice(0, 3).map(({ name, points }) => [name, points]),
    [
      ["Ana", 6],
      ["Beto", 6],
      ["Carla", 6],
    ],
  );
});

void test("reapplies head-to-head within subgroups of a multiple tie", () => {
  const standings = calculateLeagueStandings([
    match(players.a, players.b),
    match(players.a, players.c),
    match(players.d, players.a),
    match(players.b, players.c),
    match(players.b, players.d),
    match(players.c, players.d),
    match(players.c, players.e),
    match(players.d, players.e),
  ]);

  const tied = standings.filter((standing) => standing.points === 6);
  assert.deepEqual(
    tied.map(({ name }) => name),
    ["Ana", "Beto", "Carla", "Diego"],
  );
});

void test("falls back deterministically when every direct record is equal", () => {
  const standings = calculateLeagueStandings([
    match(players.a, players.b),
    match(players.b, players.c),
    match(players.c, players.a),
  ]);

  assert.deepEqual(
    standings.map(({ name }) => name),
    ["Ana", "Beto", "Carla"],
  );
});

void test("keeps alias and profile image metadata in league standings", () => {
  const standings = calculateLeagueStandings([
    match(
      {
        ...players.a,
        alias: "La Jefa",
        profileImageUrl: "https://example.com/ana.webp",
      },
      players.b,
    ),
  ]);

  assert.deepEqual(
    standings.find((standing) => standing.id === players.a.id),
    {
      id: players.a.id,
      name: players.a.name,
      alias: "La Jefa",
      color: players.a.backgroundColor,
      profileImageUrl: "https://example.com/ana.webp",
      points: 3,
      wins: 1,
      played: 1,
      last: ["W"],
    },
  );
});

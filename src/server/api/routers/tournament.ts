import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { tournaments, matches, playersToMatches, players } from "@/server/db/schema";
import { asc, desc, eq, inArray, count } from "drizzle-orm";

const leaguePlayerSchema = z.object({
  id: z.number().int().positive().nullable(),
  name: z.string().min(1),
  color: z.string().min(1),
});

const leagueMatchSchema = z.object({
  a: z.number().int().nonnegative(),
  b: z.number().int().nonnegative(),
  played: z.boolean(),
  id: z.number().int().positive().optional().nullable(),
});

const leagueStateSchema = z.object({
  players: z.array(leaguePlayerSchema),
  started: z.boolean(),
  matches: z.array(leagueMatchSchema),
  rounds: z.array(z.array(z.number().int().nonnegative())).optional().default([]),
  currentRound: z.number().int().nonnegative().optional().default(0),
  mode: z.enum(["single", "double"]).optional().default("double"),
  tiebreakerEnabled: z.boolean().optional().default(false),
});

function generateRoundRobinForIndices(
  playerIndices: number[],
): { matches: Array<z.infer<typeof leagueMatchSchema>>; rounds: number[][] } {
  const hasBye = playerIndices.length % 2 === 1;
  const N = hasBye ? playerIndices.length + 1 : playerIndices.length;
  const arr = [
    ...playerIndices,
    ...(hasBye ? [-1] : []),
  ];
  const rounds: number[][] = [];
  const matches: Array<z.infer<typeof leagueMatchSchema>> = [];
  const roundsCount = N - 1;
  for (let r = 0; r < roundsCount; r++) {
    const roundIdxs: number[] = [];
    for (let i = 0; i < N / 2; i++) {
      const a = arr[i]!;
      const b = arr[N - 1 - i]!;
      if (a === -1 || b === -1) continue;
      const idx = matches.length;
      matches.push({ a, b, played: false });
      roundIdxs.push(idx);
    }
    if (roundIdxs.length > 0) {
      rounds.push(roundIdxs);
    }
    const fixed = arr[0]!;
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }
  return { matches, rounds };
}

export const tournamentRouter = createTRPCRouter({
  getActive: publicProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ id: tournaments.id, name: tournaments.name, state: tournaments.state, finished: tournaments.finished })
      .from(tournaments)
      .where(eq(tournaments.finished, 0))
      .limit(1);

    if (!row) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(row.state ?? "{}");
    } catch {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid tournament state" });
    }

    const state = leagueStateSchema.parse(parsed);
    return { id: row.id, name: row.name, finished: row.finished === 1, state } as const;
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(256), state: leagueStateSchema }))
    .mutation(async ({ ctx, input }) => {
      const [inserted] = await ctx.db
        .insert(tournaments)
        .values({ name: input.name, state: JSON.stringify(input.state), finished: 0 })
        .returning({ id: tournaments.id, name: tournaments.name, state: tournaments.state, finished: tournaments.finished });

      if (!inserted) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create tournament" });

      const state = leagueStateSchema.parse(JSON.parse(inserted.state));
      return { id: inserted.id, name: inserted.name, finished: inserted.finished === 1, state } as const;
    }),

  markMatchPlayed: protectedProcedure
    .input(z.object({ tournamentId: z.number().int().positive(), matchIndex: z.number().int().nonnegative(), matchId: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ id: tournaments.id, state: tournaments.state, finished: tournaments.finished })
        .from(tournaments)
        .where(eq(tournaments.id, input.tournamentId))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Tournament not found" });
      if (row.finished === 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Tournament is finished" });

      const state = leagueStateSchema.parse(JSON.parse(row.state));
      if (input.matchIndex < 0 || input.matchIndex >= state.matches.length)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid match index" });

      state.matches[input.matchIndex]!.played = true;
      if (input.matchId) state.matches[input.matchIndex]!.id = input.matchId;

      await ctx.db
        .update(tournaments)
        .set({ state: JSON.stringify(state) })
        .where(eq(tournaments.id, row.id));

      return { ok: true } as const;
    }),

  finish: protectedProcedure
    .input(z.object({ tournamentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(tournaments)
        .set({ finished: 1 })
        .where(eq(tournaments.id, input.tournamentId));
      return { ok: true } as const;
    }),

  advanceRound: protectedProcedure
    .input(z.object({ tournamentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ id: tournaments.id, state: tournaments.state, finished: tournaments.finished })
        .from(tournaments)
        .where(eq(tournaments.id, input.tournamentId))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Tournament not found" });
      const state = leagueStateSchema.parse(JSON.parse(row.state));

      const rounds = state.rounds ?? [];
      const cr = state.currentRound ?? 0;
      if (rounds.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Rounds not defined" });
      if (cr >= rounds.length - 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Already at last round" });

      const roundMatches = rounds[cr] ?? [];
      const allPlayed = roundMatches.every((idx) => state.matches[idx]?.played === true);
      if (!allPlayed) throw new TRPCError({ code: "BAD_REQUEST", message: "Round has pending matches" });

      const nextState = { ...state, currentRound: cr + 1 };

      await ctx.db
        .update(tournaments)
        .set({ state: JSON.stringify(nextState) })
        .where(eq(tournaments.id, row.id));

      return { ok: true } as const;
    }),
  addTiebreakerRound: protectedProcedure
    .input(
      z.object({
        tournamentId: z.number().int().positive(),
        playerIndices: z.array(z.number().int().nonnegative()).min(2),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ id: tournaments.id, state: tournaments.state, finished: tournaments.finished })
        .from(tournaments)
        .where(eq(tournaments.id, input.tournamentId))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Tournament not found" });
      if (row.finished === 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Tournament is finished" });

      const state = leagueStateSchema.parse(JSON.parse(row.state));
      if (!state.tiebreakerEnabled) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tiebreaker is disabled" });
      }

      const unique = Array.from(new Set(input.playerIndices));
      if (unique.length !== input.playerIndices.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Duplicate player indices" });
      }

      if (unique.some((idx) => idx < 0 || idx >= state.players.length)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid player indices" });
      }

      if (!state.matches.every((m) => m.played)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tournament has pending matches" });
      }

      const { matches: newMatches, rounds: newRoundsRaw } =
        generateRoundRobinForIndices(unique);

      if (newMatches.length === 0 || newRoundsRaw.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No matches generated" });
      }

      const baseIndex = state.matches.length;
      const newRounds = newRoundsRaw.map((round) =>
        round.map((idx) => idx + baseIndex),
      );

      const nextState = {
        ...state,
        matches: [...state.matches, ...newMatches],
        rounds: [...(state.rounds ?? []), ...newRounds],
        currentRound: (state.rounds ?? []).length,
      };

      await ctx.db
        .update(tournaments)
        .set({ state: JSON.stringify(nextState) })
        .where(eq(tournaments.id, row.id));

      return { ok: true } as const;
    }),

  results: publicProcedure
    .input(z.object({ tournamentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const matchRows = await ctx.db
        .select({ id: matches.id, createdAt: matches.createdAt })
        .from(matches)
        .where(eq(matches.tournamentId, input.tournamentId))
        .orderBy(asc(matches.createdAt));

      if (matchRows.length === 0) return [] as const;
      const ids = matchRows.map((m) => m.id);
      const rows = await ctx.db
        .select({
          matchId: playersToMatches.matchId,
          placement: playersToMatches.placement,
          id: players.id,
          name: players.name,
          backgroundColor: players.backgroundColor,
        })
        .from(playersToMatches)
        .innerJoin(players, eq(players.id, playersToMatches.playerId))
        .where(inArray(playersToMatches.matchId, ids))
        .orderBy(asc(playersToMatches.matchId), asc(playersToMatches.placement));

      const byMatch = new Map<number, { id: number; name: string; backgroundColor: string; placement: number }[]>();
      for (const r of rows) {
        if (!byMatch.has(r.matchId)) byMatch.set(r.matchId, []);
        byMatch.get(r.matchId)!.push({ id: r.id, name: r.name ?? "Invocador", backgroundColor: r.backgroundColor ?? "#1f2937", placement: r.placement });
      }

      return matchRows.map((m) => ({ id: m.id, createdAt: m.createdAt, players: byMatch.get(m.id) ?? [] }));
    }),
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: tournaments.id,
        name: tournaments.name,
        finished: tournaments.finished,
        createdAt: tournaments.createdAt,
        state: tournaments.state,
        matchCount: count(matches.id).as("matchCount"),
      })
      .from(tournaments)
      .leftJoin(matches, eq(matches.tournamentId, tournaments.id))
      .groupBy(tournaments.id)
      .orderBy(desc(tournaments.createdAt), desc(tournaments.id));

    return rows.map((r) => {
      let planned = 0;
      try {
        const parsed: unknown = JSON.parse(r.state ?? "{}");
        if (typeof parsed === "object" && parsed !== null) {
          const candidate = parsed as { matches?: unknown };
          if (Array.isArray(candidate.matches)) {
            planned = candidate.matches.length;
          }
        }
      } catch {}
      return {
        id: r.id,
        name: r.name,
        finished: r.finished === 1,
        createdAt: r.createdAt,
        playedMatches: Number(r.matchCount ?? 0),
        plannedMatches: planned,
      } as const;
    });
  }),
  get: publicProcedure
    .input(z.object({ tournamentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ id: tournaments.id, name: tournaments.name, state: tournaments.state, finished: tournaments.finished, createdAt: tournaments.createdAt })
        .from(tournaments)
        .where(eq(tournaments.id, input.tournamentId))
        .limit(1);
      if (!row) return null;
      const state = leagueStateSchema.parse(JSON.parse(row.state));
      return { id: row.id, name: row.name, finished: row.finished === 1, createdAt: row.createdAt, state } as const;
    }),
});

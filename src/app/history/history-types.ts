import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/api/root";

export type MatchesOutput = inferRouterOutputs<AppRouter>["matches"]["findAll"];
export type MatchSummary = MatchesOutput["items"][number];
export type PlayerSummary = MatchSummary["players"][number];
export type LeaguesOutput = inferRouterOutputs<AppRouter>["tournament"]["list"];
export type LeagueSummary = LeaguesOutput[number];

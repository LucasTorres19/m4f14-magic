import { Crown, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/server/db";
import { matches, players, playersToMatches } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";

const numberFormatter = new Intl.NumberFormat("es-AR");
export function AllTimeChampionSkeleton() {
  return (
    <Card className="border-primary/40 bg-card/80 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-48" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="mt-2 h-4 w-64" />
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-6 md:px-0">
        <div className="flex h-full flex-col items-center justify-center gap-5 rounded-xl bg-muted/20 p-6 text-center sm:p-8">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </CardContent>
    </Card>
  );
}
export async function AllTimeChampion() {
  const winsPerPlayer = db.$with("wins_per_player").as(
    db
      .select({
        playerId: players.id,
        name: players.name,
        backgroundColor: players.backgroundColor,
        wins: sql<number>`count(*)`.as("wins"),
        lastWinAt: sql<number>`max(${matches.createdAt})`.as("lastWinAt"),
      })
      .from(playersToMatches)
      .innerJoin(players, eq(players.id, playersToMatches.playerId))
      .innerJoin(matches, eq(matches.id, playersToMatches.matchId))
      .where(eq(playersToMatches.placement, 1))
      .groupBy(players.id, players.name, players.backgroundColor),
  );

  const [allTimeChampion] = await db
    .with(winsPerPlayer)
    .select({
      playerId: winsPerPlayer.playerId,
      name: winsPerPlayer.name,
      backgroundColor: winsPerPlayer.backgroundColor,
      wins: winsPerPlayer.wins,
      lastWinAt: winsPerPlayer.lastWinAt,
    })
    .from(winsPerPlayer)
    .orderBy(
      sql`${winsPerPlayer.wins} desc`,
      sql`${winsPerPlayer.lastWinAt} desc`,
    )
    .limit(1);

  const championName = allTimeChampion?.name ?? "Invocador desconocido";
  const championColor = allTimeChampion?.backgroundColor ?? "#1f2937";
  const championWins = allTimeChampion?.wins ?? 0;

  return (
    <Card className="border-primary/40 bg-card/80 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="text-foreground text-lg font-semibold tracking-wide">
          Campeon de todos los tiempos
        </CardTitle>
        <CardDescription>
          Invocador con la mayor cantidad de victorias registradas.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-6 md:px-0">
        {allTimeChampion ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 rounded-xl bg-muted/20 p-6 text-center sm:p-8">
            <div className="flex flex-col items-center gap-3">
              <span
                className="flex size-16 items-center justify-center rounded-full border border-foreground/10 shadow-inner transition-all"
                style={{
                  backgroundColor: championColor,
                }}
                aria-hidden="true"
              >
                <Crown className="text-white/90 size-7 drop-shadow" />
              </span>
              <p className="text-foreground text-xl font-semibold tracking-tight">
                {championName}
              </p>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {`Reclamo ${numberFormatter.format(championWins)} victorias totales.`}
            </p>
          </div>
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center text-sm">
            <Sparkles className="text-primary size-6 animate-pulse" />
            <p>El oraculo aguarda al primer campeon historico.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

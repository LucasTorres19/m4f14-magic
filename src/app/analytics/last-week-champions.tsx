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
import { subDays } from "date-fns";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { EmptyChartState } from "./empty-chart-state";
import LastWeekChampionsChart from "./last-week-champions-chart";

export default async function LastWeekChampions() {
  const weeklyWinsData = await db
    .select({
      playerId: players.id,
      name: players.name,
      color: players.backgroundColor,
      wins: count(playersToMatches.playerId).as("wins"),
      lastWinAt: sql<Date>`max(${matches.createdAt})`,
    })
    .from(playersToMatches)
    .innerJoin(matches, eq(matches.id, playersToMatches.matchId))
    .innerJoin(players, eq(players.id, playersToMatches.playerId))
    .where(
      and(
        gte(matches.createdAt, subDays(new Date(), 7)),
        eq(playersToMatches.placement, 1),
      ),
    )
    .groupBy(players.id, players.name)
    .orderBy(desc(sql`wins`))
    .limit(5);

  return (
    <Card className="border-primary/40 bg-card/80 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="text-foreground text-lg font-semibold tracking-wide">
          Campeones de la semana
        </CardTitle>
        <CardDescription>
          Los 5 invocadores con más victorias en los últimos siete días.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-6 md:px-0">
        {weeklyWinsData.length > 0 ? (
          <LastWeekChampionsChart data={weeklyWinsData} />
        ) : (
          <EmptyChartState message="Ningún invocador reclamó victorias esta semana. El tablero aguarda." />
        )}
      </CardContent>
    </Card>
  );
}

export function LastWeekChampionsSkeleton() {
  return (
    <Card className="border-primary/40 bg-card/80 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-52" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="mt-2 h-4 w-72" />
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-6 md:px-0">
        <div className="flex flex-col gap-6">
          <div className="relative h-64 w-full overflow-hidden rounded-xl border border-border/40 bg-muted/20 p-4">
            <div className="absolute inset-0 -translate-x-2 translate-y-2">
              <div className="flex h-full w-full flex-col justify-between">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={`horizontal-${index}`}
                    className="border border-dashed w-full"
                  />
                ))}
              </div>
            </div>
            <div className="relative flex h-full items-end justify-between ">
              {[90, 50, 30, 20, 20].map((height, index) => (
                <Skeleton
                  key={`bar-${index}`}
                  className="rounded-t-lg bg-primary/30"
                  style={{ height: `${height}%`, width: "17%" }}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/server/db";
import {
  commanders,
  matches,
  players,
  playersToMatches,
} from "@/server/db/schema";
import { subDays } from "date-fns";
import { and, countDistinct, eq, gte } from "drizzle-orm";

export default async function OracleInsights() {
  const start = subDays(new Date(), 7);
  const [newSummoners, newCommanders] = await Promise.all([
    db
      .select({ count: countDistinct(players.id) })
      .from(playersToMatches)
      .innerJoin(matches, eq(matches.id, playersToMatches.matchId))
      .innerJoin(players, eq(players.id, playersToMatches.playerId))
      .where(and(gte(players.createdAt, start), gte(matches.createdAt, start)))
      .then((r) => r.at(0)?.count ?? 0),
    db
      .select({ count: countDistinct(commanders.id) })
      .from(playersToMatches)
      .innerJoin(matches, eq(matches.id, playersToMatches.matchId))
      .innerJoin(commanders, eq(commanders.id, playersToMatches.commanderId))
      .where(
        and(gte(commanders.createdAt, start), gte(matches.createdAt, start)),
      )
      .then((r) => r.at(0)?.count ?? 0),
  ]);
  return (
    <Card className="border-primary/40 bg-card/80 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="text-foreground text-lg font-semibold tracking-wide">
          Focos del oráculo
        </CardTitle>
        <CardDescription>
          Los indicadores clave de la semana mágica.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <ul className="text-muted-foreground space-y-4 text-sm leading-relaxed text-center sm:text-left">
          {newSummoners > 0 && (
            <li>
              <span className="text-foreground font-semibold">
                {newSummoners}&nbsp;
              </span>
              nuevos invocadores en la última semana
            </li>
          )}
          {newCommanders > 0 && (
            <li>
              <span className="text-foreground font-semibold">
                {newCommanders}&nbsp;
              </span>
              nuevos comandantes invocados en la última semana
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

export function OracleInsightsSkeleton() {
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
      <CardContent className="px-4 sm:px-6">
        <ul className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index} className="flex flex-col items-center gap-2 sm:items-start">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

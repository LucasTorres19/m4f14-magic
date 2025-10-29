import { addDays, format, subDays } from "date-fns";
import { es } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { db } from "@/server/db";
import { matches } from "@/server/db/schema";

import { count, gte, sql } from "drizzle-orm";
import { EmptyChartState } from "./empty-chart-state";
import LastWeekMatchesChart from "./last-week-matches-chart";

export default async function LastWeekMatches() {
  const dayExpr = sql<string>`
    strftime('%Y-%m-%d', ${matches.createdAt}, 'unixepoch', 'localtime')
  `;

  const start = subDays(new Date(), 10);

  const rows = await db
    .select({
      day: dayExpr,
      count: count(matches.id), // count(*) would also work
    })
    .from(matches)
    .where(gte(matches.createdAt, start))
    .groupBy(dayExpr);

  const days = Array.from({ length: 10 }, (_, i) => addDays(start, i));
  const data = days.map((d) => ({
    day: format(d, "EEE d MMM", { locale: es }),
    matches: rows.find((r) => r.day === format(d, "yyyy-MM-dd"))?.count ?? 0,
    fullLabel: format(d, "PPPP", { locale: es }),
  }));

  return (
    <Card className="border-primary/40 bg-card/80 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="text-foreground text-lg font-semibold tracking-wide">
          Ritmo de duelos
        </CardTitle>
        <CardDescription>
          Evolución de partidas registradas durante los últimos diez días.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-6 md:px-0">
        {data.some((entry) => entry.matches > 0) ? (
          <LastWeekMatchesChart data={data} />
        ) : (
          <EmptyChartState message="Todavía no hay duelos recientes para trazar la profecía." />
        )}
      </CardContent>
    </Card>
  );
}

export function LastWeekMatchesSkeleton() {
  return (
    <Card className="border-primary/40 bg-card/80 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-44" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="mt-2 h-4 w-64" />
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-6 md:px-0">
        <Skeleton className="h-56 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}

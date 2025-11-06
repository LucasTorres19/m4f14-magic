import { subDays } from "date-fns";

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

import { gte } from "drizzle-orm";
import { EmptyChartState } from "./empty-chart-state";
import LastWeekMatchesChart from "./last-week-matches-chart";

export default async function LastWeekMatches() {
  const start = subDays(new Date(), 10);

  const data = await db
    .select({
      createdAt: matches.createdAt,
    })
    .from(matches)
    .where(gte(matches.createdAt, start));

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
        {data.length > 0 ? (
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

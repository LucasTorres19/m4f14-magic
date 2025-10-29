import { Button } from "@/components/ui/button";
import { db } from "@/server/db";
import { matches, playersToMatches } from "@/server/db/schema";
import { subDays } from "date-fns";
import { count, countDistinct, eq, gte } from "drizzle-orm";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AllTimeChampion, AllTimeChampionSkeleton } from "./all-time-champion";
import LastWeekChampions, {
  LastWeekChampionsSkeleton,
} from "./last-week-champions";
import LastWeekMatches, { LastWeekMatchesSkeleton } from "./last-week-matches";
import { MetricCard, MetricSkeleton, type Metric } from "./metric";
import OracleInsights, { OracleInsightsSkeleton } from "./oracle-insights";
import StreakChampion, { StreakChampionSkeleton } from "./streak-champion";

export default async function AnalyticsPage() {
  const lastWeek = subDays(new Date(), 7);

  const weeklyMetrics: Metric[] = [
    {
      title: "Duelo semanal",
      value: db
        .select({ count: count() })
        .from(matches)
        .where(gte(matches.createdAt, lastWeek))
        .then((r) => r.at(0)?.count.toString() ?? "0"),
      description: "Partidas concretadas en los últimos 7 días.",
    },
    {
      title: "Magos activos",
      value: db
        .select({ count: countDistinct(playersToMatches.playerId) })
        .from(playersToMatches)
        .innerJoin(matches, eq(playersToMatches.matchId, matches.id))
        .where(gte(matches.createdAt, lastWeek))
        .then((r) => r.at(0)?.count.toString() ?? "0"),
      description:
        "Invocadores que disputaron al menos un duelo en los últimos 7 días.",
    },
    {
      title: "Comandantes activos",
      value: db
        .select({ count: countDistinct(playersToMatches.commanderId) })
        .from(playersToMatches)
        .innerJoin(matches, eq(playersToMatches.matchId, matches.id))
        .where(gte(matches.createdAt, lastWeek))
        .then((r) => r.at(0)?.count.toString() ?? "0"),
      description: "Compandantes que fueron invocados en los últimos 7 días.",
    },
  ];

  const totalMetrics: Metric[] = [
    {
      title: "Duelos registrados",
      value: db
        .select({ count: count() })
        .from(matches)
        .then((r) => r.at(0)?.count.toString() ?? "0"),
      description: "Total de enfrentamientos preservados en el grimorio.",
    },
    {
      title: "Magos enlistados",
      value: db
        .select({ count: countDistinct(playersToMatches.playerId) })
        .from(playersToMatches)
        .then((r) => r.at(0)?.count.toString() ?? "0"),
      description: "Total de invocadores únicos que participaron en partidas.",
    },
    {
      title: "Comandantes jugados",
      value: db
        .select({ count: countDistinct(playersToMatches.commanderId) })
        .from(playersToMatches)
        .then((r) => r.at(0)?.count.toString() ?? "0"),
      description: "Total de comandantes únicos que participaron en partidas.",
    },
  ];

  return (
    <main>
      <header className="mb-10 flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:justify-between md:text-left">
        <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center md:w-auto md:items-center md:justify-start">
          <Button
            asChild
            variant="outline"
            className="border-primary/40 bg-card/70 text-card-foreground hover:border-primary/60 hover:bg-card/80"
          >
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-start"
            >
              <ArrowLeft className="size-4" />
              Volver al menú
            </Link>
          </Button>
          <div className="text-primary hidden items-center gap-2 text-xs font-medium uppercase tracking-[0.4em] md:flex">
            <Sparkles className="size-4 animate-pulse" />
            Oráculo arcano
          </div>
        </div>

        <div className="text-primary flex flex-col items-center gap-2 uppercase tracking-[0.18em] sm:flex-row sm:gap-4 sm:tracking-[0.3em] md:flex-col md:items-end md:text-right md:tracking-[0.35em]">
          <span className="text-sm">Oráculo</span>
          <span className="text-muted-foreground text-xs tracking-[0.28em] sm:tracking-[0.4em] md:tracking-[0.5em]">
            Consejo de métricas mágicas
          </span>
        </div>
      </header>
      <Suspense fallback={<StreakChampionSkeleton />}>
        <StreakChampion />
      </Suspense>
      <section className="mb-12 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {weeklyMetrics.map((metric, i) => (
            <Suspense key={i} fallback={<MetricSkeleton />}>
              <MetricCard metric={metric} />
            </Suspense>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {totalMetrics.map((metric, i) => (
            <Suspense key={i} fallback={<MetricSkeleton />}>
              <MetricCard metric={metric} />
            </Suspense>
          ))}
        </div>
      </section>
      <section className="flex flex-1 flex-col gap-6 pb-12">
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Suspense fallback={<LastWeekMatchesSkeleton />}>
            <LastWeekMatches />
          </Suspense>
          <Suspense fallback={<OracleInsightsSkeleton />}>
            <OracleInsights />
          </Suspense>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Suspense fallback={<LastWeekChampionsSkeleton />}>
            <LastWeekChampions />
          </Suspense>

          <Suspense fallback={<AllTimeChampionSkeleton />}>
            <AllTimeChampion />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

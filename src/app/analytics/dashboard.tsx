"use client";

import { ArrowLeft, BarChart3, Crown, Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AnalyticsSnapshot } from "@/server/services/analytics";

const numberFormatter = new Intl.NumberFormat("es-AR");
const dayFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const longDateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "full",
});

const matchesPerDayConfig: ChartConfig = {
  matches: {
    label: "Duelos",
    color: "hsla(var(--primary), 0.9)",
  },
};

const weeklyWinsConfig: ChartConfig = {
  wins: {
    label: "Victorias",
    color: "hsla(var(--accent), 0.9)",
  },
};

const buildMatchesPerDayData = (snapshot: AnalyticsSnapshot) =>
  snapshot.matchesPerDay.map((bucket) => {
    const date = new Date(`${bucket.day}T00:00:00`);
    return {
      day: dayFormatter.format(date),
      matches: bucket.matches,
      fullLabel: longDateFormatter.format(date),
    };
  });

const buildWeeklyWinsData = (snapshot: AnalyticsSnapshot) =>
  snapshot.weeklyTopPlayers.map((player) => ({
    name: player.name,
    wins: player.wins,
    color: player.backgroundColor,
  }));

type AnalyticsDashboardProps = {
  analytics: AnalyticsSnapshot;
};

type Metric = {
  title: string;
  value: string;
  description: string;
};

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <Card
      key={metric.title}
      className="border-primary/40 bg-card/75 shadow-xl backdrop-blur transition-transform duration-200 hover:-translate-y-1"
    >
      <CardHeader className="gap-4 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-between">
          <CardTitle className="text-muted-foreground text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em]">
            {metric.title}
          </CardTitle>
          <BarChart3 className="text-primary/70 size-4" />
        </div>
        <p className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
          {metric.value}
        </p>
        <CardDescription className="text-muted-foreground text-xs leading-relaxed">
          {metric.description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  const matchesPerDayData = buildMatchesPerDayData(analytics);
  const weeklyWinsData = buildWeeklyWinsData(analytics);
  const allTimeChampion = analytics.allTimeTopPlayer;
  const streakChampion = analytics.currentWinningStreak;
  const streakChampionLastWin = streakChampion
    ? longDateFormatter.format(new Date(streakChampion.lastWinAt))
    : null;

  const weeklyMetrics: Metric[] = [
    {
      title: "Duelo semanal",
      value: numberFormatter.format(analytics.totals.matchesThisWeek),
      description: "Partidas concretadas en los últimos 7 días.",
    },
    {
      title: "Magos activos",
      value: numberFormatter.format(analytics.totals.activePlayersThisWeek),
      description: "Invocadores que disputaron al menos un duelo esta semana.",
    },
  ];

  const totalMetrics: Metric[] = [
    {
      title: "Duelos registrados",
      value: numberFormatter.format(analytics.totals.totalMatches),
      description: "Total de enfrentamientos preservados en el grimorio.",
    },
    {
      title: "Magos enlistados",
      value: numberFormatter.format(analytics.totals.totalPlayers),
      description: "Invocadores únicos que participaron en partidas.",
    },
  ];

  return (
    <>
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

      {streakChampion && (
        <div className="relative mb-12 overflow-hidden rounded-3xl border border-primary/50 bg-linear-to-br from-primary/30 via-background to-background p-px shadow-[0_25px_80px_-45px_rgba(56,189,248,0.8)]">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
            <div className="absolute -bottom-20 left-6 h-60 w-60 rounded-full bg-accent/30 blur-3xl" />
          </div>
          <div className="relative flex flex-col gap-6 rounded-[calc(var(--radius-3xl)-1px)] bg-card/90 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <div className="flex flex-col gap-5 text-center sm:flex-row sm:items-center sm:text-left">
              <span
                className="relative flex size-20 items-center justify-center rounded-2xl border border-white/20 shadow-[0_0_35px_rgba(250,204,21,0.35)] transition-transform duration-200 hover:-translate-y-1"
                style={{ backgroundColor: streakChampion.backgroundColor }}
                aria-hidden="true"
              >
                <Flame className="text-white size-10 drop-shadow-lg" />
              </span>
              <div className="flex flex-col gap-2">
                <span className="text-primary text-xs font-semibold uppercase tracking-[0.4em]">
                  Racha legendaria
                </span>
                <p className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
                  {streakChampion.name}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {streakChampionLastWin
                    ? `Último triunfo sellado el ${streakChampionLastWin}.`
                    : "El fuego de la victoria sigue encendido."}
                </p>
              </div>
            </div>
            <div className="flex flex-1 flex-col items-center gap-2 sm:items-end">
              <div className="text-foreground text-5xl font-black tracking-tight sm:text-6xl">
                {numberFormatter.format(streakChampion.streak)}
              </div>
              <div className="text-muted-foreground text-sm uppercase tracking-[0.4em]">
                Victorias seguidas
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="mb-12 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {weeklyMetrics.map((metric, i) => (
            <MetricCard key={i} metric={metric} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {totalMetrics.map((metric, i) => (
            <MetricCard key={i} metric={metric} />
          ))}
        </div>
      </section>

      <section className="flex flex-1 flex-col gap-6 pb-12">
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
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
              {matchesPerDayData.some((entry) => entry.matches > 0) ? (
                <ChartContainer
                  config={matchesPerDayConfig}
                  className="min-h-40 w-full sm:h-[280px] md:h-64"
                >
                  <AreaChart data={matchesPerDayData}>
                    <defs>
                      <linearGradient
                        id="duels-gradient"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--color-matches)"
                          stopOpacity={0.7}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--color-matches)"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={46}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          indicator="line"
                          labelKey="fullLabel"
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="matches"
                      stroke="var(--color-matches)"
                      strokeWidth={3}
                      fill="url(#duels-gradient)"
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <EmptyChartState message="Todavía no hay duelos recientes para trazar la profecía." />
              )}
            </CardContent>
          </Card>

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
                <li>
                  <span className="text-foreground font-semibold">
                    {numberFormatter.format(
                      analytics.totals.matchesThisWeek,
                    )}{" "}
                  </span>
                  duelos trazados desde el último amanecer.
                </li>
                <li>
                  <span className="text-foreground font-semibold">
                    {numberFormatter.format(
                      analytics.totals.activePlayersThisWeek,
                    )}{" "}
                  </span>
                  invocadores consultaron el oráculo esta semana.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-primary/40 bg-card/80 shadow-xl backdrop-blur">
            <CardHeader>
              <CardTitle className="text-foreground text-lg font-semibold tracking-wide">
                Campeones de la semana
              </CardTitle>
              <CardDescription>
                Invocadores con más victorias en los últimos siete días.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-6 md:px-0">
              {weeklyWinsData.length > 0 ? (
                <ChartContainer
                  config={weeklyWinsConfig}
                  className="min-h-40 w-full sm:h-[280px] md:h-64"
                >
                  <BarChart data={weeklyWinsData}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={46}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="wins" radius={[10, 10, 0, 0]}>
                      {weeklyWinsData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                          stroke="rgba(15, 23, 42, 0.12)"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <EmptyChartState message="Ningún invocador reclamó victorias esta semana. El tablero aguarda." />
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/40 bg-card/80 shadow-xl backdrop-blur">
            <CardHeader>
              <CardTitle className="text-foreground text-lg font-semibold tracking-wide">
                Campeón de todos los tiempos
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
                        backgroundColor: allTimeChampion.backgroundColor,
                      }}
                      aria-hidden="true"
                    >
                      <Crown className="text-white/90 size-7 drop-shadow" />
                    </span>
                    <p className="text-foreground text-xl font-semibold tracking-tight">
                      {allTimeChampion.name}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {`Reclamó ${numberFormatter.format(allTimeChampion.wins)} victorias totales.`}
                  </p>
                </div>
              ) : (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center text-sm">
                  <Sparkles className="text-primary size-6 animate-pulse" />
                  <p>El oráculo aguarda al primer campeón histórico.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

const EmptyChartState = ({ message }: { message: string }) => (
  <div className="text-muted-foreground flex min-h-40 w-full flex-col items-center justify-center gap-3 px-6 text-center text-sm sm:h-[280px] md:h-64">
    <Sparkles className="text-primary size-6 animate-pulse" />
    <p>{message}</p>
  </div>
);

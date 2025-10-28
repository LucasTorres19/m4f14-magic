"use client";

import { ArrowLeft, BarChart3, Sparkles } from "lucide-react";
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

const startingHpConfig: ChartConfig = {
  matches: {
    label: "Partidas",
    color: "hsla(var(--secondary), 0.9)",
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

const buildStartingHpData = (snapshot: AnalyticsSnapshot) =>
  snapshot.startingHpDistribution.map((entry) => ({
    startingHp: entry.startingHp,
    matches: entry.matches,
  }));

type AnalyticsDashboardProps = {
  analytics: AnalyticsSnapshot;
};

export function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  const matchesPerDayData = buildMatchesPerDayData(analytics);
  const weeklyWinsData = buildWeeklyWinsData(analytics);
  const startingHpData = buildStartingHpData(analytics);

  const metrics = [
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
    {
      title: "Compañeros por duelo",
      value: analytics.totals.averagePlayersPerMatch.toLocaleString("es-AR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
      description: "Promedio de participantes en cada enfrentamiento.",
    },
  ];

  return (
    <>
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            className="border-primary/40 bg-card/70 text-card-foreground hover:border-primary/60 hover:bg-card/80"
          >
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="size-4" />
              Volver al menú
            </Link>
          </Button>
          <div className="text-primary hidden items-center gap-2 text-xs font-medium uppercase tracking-[0.4em] md:flex">
            <Sparkles className="size-4 animate-pulse" />
            Oráculo arcano
          </div>
        </div>

        <div className="text-primary flex flex-col gap-2 text-right uppercase tracking-[0.35em]">
          <span className="text-sm">Oráculo</span>
          <span className="text-muted-foreground text-xs tracking-[0.5em]">
            Consejo de métricas mágicas
          </span>
        </div>
      </header>

      <section className="mb-12 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <Card
              key={metric.title}
              className="border-primary/40 bg-card/75 shadow-xl backdrop-blur"
            >
              <CardHeader className="gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-muted-foreground text-xs uppercase tracking-[0.45em]">
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
            <CardContent className="px-0">
              {matchesPerDayData.some((entry) => entry.matches > 0) ? (
                <ChartContainer
                  config={matchesPerDayConfig}
                  className="h-64 w-full"
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
            <CardContent className="px-6">
              <ul className="text-muted-foreground space-y-4 text-sm leading-relaxed">
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
                <li>
                  Promedio de{" "}
                  <span className="text-foreground font-semibold">
                    {analytics.totals.averagePlayersPerMatch.toLocaleString(
                      "es-AR",
                      {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      },
                    )}{" "}
                    magos
                  </span>{" "}
                  por enfrentamiento.
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
            <CardContent className="px-0">
              {weeklyWinsData.length > 0 ? (
                <ChartContainer
                  config={weeklyWinsConfig}
                  className="h-64 w-full"
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
                Rituales de vida inicial
              </CardTitle>
              <CardDescription>
                Distribución de puntos de vida inicial utilizados en las
                partidas.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {startingHpData.length > 0 ? (
                <ChartContainer
                  config={startingHpConfig}
                  className="h-64 w-full"
                >
                  <BarChart data={startingHpData}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="startingHp"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
                      label={{
                        value: "Vida inicial",
                        position: "insideBottom",
                        offset: -6,
                        style: { fill: "var(--muted-foreground)" },
                      }}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={46}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent indicator="line" />}
                    />
                    <Bar
                      dataKey="matches"
                      radius={[10, 10, 0, 0]}
                      fill="var(--color-matches)"
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <EmptyChartState message="Todavía no hay rituales registrados para revelar la distribución de vida inicial." />
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

const EmptyChartState = ({ message }: { message: string }) => (
  <div className="text-muted-foreground flex h-64 w-full flex-col items-center justify-center gap-3 px-6 text-center text-sm">
    <Sparkles className="text-primary size-6 animate-pulse" />
    <p>{message}</p>
  </div>
);

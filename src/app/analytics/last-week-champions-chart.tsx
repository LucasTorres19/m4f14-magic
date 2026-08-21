"use client";
import { InvokerAvatar } from "@/components/invoker-avatar";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

const weeklyWinsConfig: ChartConfig = {
  wins: {
    label: "Victorias",
    color: "hsla(var(--accent), 0.9)",
  },
};

export default function LastWeekChampionsChart({
  data,
}: {
  data: {
    playerId: number;
    name: string | null;
    alias: string | null;
    wins: number;
    color: string;
    profileImageUrl: string | null;
  }[];
}) {
  return (
    <div className="space-y-4">
      <ChartContainer
        config={weeklyWinsConfig}
        className="min-h-40 w-full sm:h-[280px] md:h-64"
      >
        <BarChart data={data}>
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
          <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="wins" radius={[10, 10, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.playerId}
                fill={entry.color}
                stroke="rgba(15, 23, 42, 0.12)"
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <ul className="grid gap-2 px-3 sm:grid-cols-2">
        {data.map((entry) => (
          <li key={entry.playerId}>
            <Link
              href={`/summoner/${entry.playerId}`}
              className="flex min-h-12 items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <InvokerAvatar
                name={entry.name}
                imageUrl={entry.profileImageUrl}
                backgroundColor={entry.color}
                size="compact"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {entry.name ?? "Invocador desconocido"}
                </span>
                {entry.alias ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {entry.alias}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

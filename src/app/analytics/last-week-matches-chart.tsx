"use client";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const matchesPerDayConfig: ChartConfig = {
  matches: {
    label: "Duelos",
    color: "hsla(var(--success))",
  },
};
export default function LastWeekMatchesChart({
  data,
}: {
  data: {
    day: string;
    matches: number;
    fullLabel: string;
  }[];
}) {
  return (
    <ChartContainer
      config={matchesPerDayConfig}
      className="min-h-40 w-full sm:h-[280px] md:h-64"
    >
      <AreaChart data={data}>
        <defs>
          <linearGradient id="duels-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-success)"
              stopOpacity={0.7}
            />
            <stop
              offset="100%"
              stopColor="var(--color-success)"
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
            <ChartTooltipContent indicator="line" labelKey="fullLabel" />
          }
        />
        <Area
          type="monotone"
          dataKey="matches"
          stroke="var(--color-success)"
          strokeWidth={3}
          fill="url(#duels-gradient)"
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

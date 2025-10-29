"use client";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
    name: string | null;
    wins: number;
    color: string;
  }[];
}) {
  return (
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
              key={entry.name}
              fill={entry.color}
              stroke="rgba(15, 23, 42, 0.12)"
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

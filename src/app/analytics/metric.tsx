import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
export type Metric = {
  title: string;
  value: Promise<string> | string;
  description: string;
};

export function MetricSkeleton() {
  return (
    <div className="border-primary/40 bg-card/75 shadow-xl backdrop-blur">
      <div className="grid gap-4 p-6 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );
}

export async function MetricCard({ metric }: { metric: Metric }) {
  const value =
    typeof metric.value === "string" ? metric.value : await metric.value;
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
          {value}
        </p>
        <CardDescription className="text-muted-foreground text-xs leading-relaxed">
          {metric.description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

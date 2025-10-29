import { Sparkles } from "lucide-react";

export const EmptyChartState = ({ message }: { message: string }) => (
  <div className="text-muted-foreground flex min-h-40 w-full flex-col items-center justify-center gap-3 px-6 text-center text-sm sm:h-[280px] md:h-64">
    <Sparkles className="text-primary size-6 animate-pulse" />
    <p>{message}</p>
  </div>
);

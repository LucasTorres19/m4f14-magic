import { Skeleton } from "@/components/ui/skeleton";

const metricPlaceholders = Array.from({ length: 5 });

export default function AnalyticsLoading() {
  return (
    <>
      <header className="mb-10 flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:justify-between md:text-left">
        <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center md:w-auto md:items-center md:justify-start">
          <Skeleton className="h-10 w-full max-w-xs rounded-full sm:w-44" />
          <Skeleton className="hidden h-4 w-48 md:block" />
        </div>

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4 md:flex-col md:items-end">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
      </header>

      <section className="mb-12 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metricPlaceholders.map((_, index) => (
            <div
              key={`metric-${index}`}
              className="border-primary/40 bg-card/75 shadow-xl backdrop-blur"
            >
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
          ))}
        </div>
      </section>

      <section className="flex flex-1 flex-col gap-6 pb-12">
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="border-primary/40 bg-card/80 shadow-xl backdrop-blur">
            <div className="space-y-4 p-6">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="flex h-[260px] items-center justify-center px-4 pb-6 sm:h-[280px] md:px-6 md:pb-6">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
          </div>

          <div className="border-primary/40 bg-card/80 shadow-xl backdrop-blur">
            <div className="space-y-4 px-4 pt-6 sm:px-6">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="space-y-4 px-4 pb-6 sm:px-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {[0, 1].map((index) => (
            <div
              key={`chart-${index}`}
              className="border-primary/40 bg-card/80 shadow-xl backdrop-blur"
            >
              <div className="space-y-4 px-4 pt-6 sm:px-6">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <div className="flex h-[260px] items-center justify-center px-4 pb-6 sm:h-[280px] md:px-6 md:pb-6">
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

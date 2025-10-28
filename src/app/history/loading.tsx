import { Skeleton } from "@/components/ui/skeleton";

const cardPlaceholders = Array.from({ length: 3 });

export default function HistoryLoading() {
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-36 rounded-full border border-primary/20" />
        <Skeleton className="h-6 w-48 rounded-full border border-primary/20" />
      </div>

      <header className="mb-12 space-y-4">
        <Skeleton className="h-10 w-64 rounded-full md:w-80" />
        <Skeleton className="h-4 w-full max-w-xl rounded-full" />
        <Skeleton className="h-4 w-3/4 max-w-lg rounded-full" />
      </header>

      <section className="flex flex-1 flex-col gap-6 pb-12">
        {cardPlaceholders.map((_, index) => (
          <article
            key={`history-card-skeleton-${index}`}
            className="ornate-border relative overflow-hidden rounded-3xl border border-primary/20 bg-card/70 p-6 shadow-xl backdrop-blur"
          >
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-secondary/10 to-accent/20 opacity-50 blur-2xl" />
            <div className="relative flex flex-col gap-6">
              <header className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-3">
                  <Skeleton className="h-3 w-28 rounded-full" />
                  <Skeleton className="h-6 w-40 rounded-full md:w-56" />
                </div>

                <div className="flex items-end gap-6 text-sm">
                  <div className="space-y-2 text-right">
                    <Skeleton className="ml-auto h-3 w-24 rounded-full" />
                    <Skeleton className="ml-auto h-6 w-12 rounded-full" />
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className="ml-auto h-3 w-28 rounded-full" />
                    <Skeleton className="ml-auto h-6 w-16 rounded-full" />
                  </div>
                </div>
              </header>

              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((__, playerIndex) => (
                  <div
                    key={`history-card-player-${index}-${playerIndex}`}
                    className="border-border/60 flex items-center justify-between rounded-2xl border bg-background/60 px-4 py-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32 rounded-full" />
                        <Skeleton className="h-3 w-20 rounded-full" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

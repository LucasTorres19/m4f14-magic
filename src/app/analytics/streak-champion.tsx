import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/server/db";
import { matches, players, playersToMatches } from "@/server/db/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { eq, sql } from "drizzle-orm";
import { Flame } from "lucide-react";

const numberFormatter = new Intl.NumberFormat("es-AR");

export default async function StreakChampion() {
  const orderedMatches = db.$with("ordered_matches").as(
    db
      .select({
        playerId: playersToMatches.playerId,
        name: players.name,
        backgroundColor: players.backgroundColor,
        createdAt: matches.createdAt,
        placement: playersToMatches.placement,
        lossGroup: sql<number>`
          sum(case when ${playersToMatches.placement} <> 1 then 1 else 0 end)
            over (
              partition by ${playersToMatches.playerId}
              order by ${matches.createdAt}, ${matches.id}
            )
        `.as("lossGroup"),
      })
      .from(playersToMatches)
      .innerJoin(matches, eq(playersToMatches.matchId, matches.id))
      .innerJoin(players, eq(playersToMatches.playerId, players.id)),
  );

  const latestMatches = db.$with("latest_matches").as(
    db
      .select({
        playerId: playersToMatches.playerId,
        latestMatchAt: sql<string>`
          strftime('%Y-%m-%dT%H:%M:%fZ', max(${matches.createdAt}), 'unixepoch', 'utc')
        `.as("latestMatchAt"),
      })
      .from(playersToMatches)
      .innerJoin(matches, eq(playersToMatches.matchId, matches.id))
      .groupBy(playersToMatches.playerId),
  );

  const [streakChampion] = await db
    .with(orderedMatches, latestMatches)
    .select({
      playerId: orderedMatches.playerId,
      name: orderedMatches.name,
      backgroundColor: orderedMatches.backgroundColor,
      streak: sql<number>`count(*)`,
      lastWinAt: sql<string>`
        strftime('%Y-%m-%dT%H:%M:%fZ', max(${orderedMatches.createdAt}), 'unixepoch', 'utc')
      `.as("lastWinAt"),
      latestMatchAt: latestMatches.latestMatchAt,
    })
    .from(orderedMatches)
    .innerJoin(
      latestMatches,
      eq(orderedMatches.playerId, latestMatches.playerId),
    )
    .where(eq(orderedMatches.placement, 1))
    .groupBy(
      orderedMatches.playerId,
      orderedMatches.name,
      orderedMatches.backgroundColor,
      sql`${orderedMatches.lossGroup}`,
      sql`${latestMatches.latestMatchAt}`,
    )
    .orderBy(sql`count(*) desc`, sql`max(${orderedMatches.createdAt}) desc`)
    .limit(1);

  if (!streakChampion) return null;

  const lastWinDate = streakChampion.lastWinAt
    ? new Date(streakChampion.lastWinAt)
    : null;
  const latestMatchDate = streakChampion.latestMatchAt
    ? new Date(streakChampion.latestMatchAt)
    : null;

  const streakChampionLastWin =
    lastWinDate && !Number.isNaN(lastWinDate.getTime())
      ? format(lastWinDate, "PPPP", { locale: es })
      : null;
  const isActive =
    lastWinDate &&
    latestMatchDate &&
    !Number.isNaN(lastWinDate.getTime()) &&
    !Number.isNaN(latestMatchDate.getTime()) &&
    lastWinDate.getTime() === latestMatchDate.getTime();

  const name = streakChampion.name ?? "Invocador desconocido";
  const backgroundColor = streakChampion.backgroundColor ?? "#1f2937";
  const streak = Number(streakChampion.streak ?? 0);
  const statusMessage = isActive
    ? "El fuego de la victoria sigue encendido."
    : streakChampionLastWin
      ? `Último triunfo sellado el ${streakChampionLastWin}.`
      : "La leyenda de la racha perdura en los registros.";

  return (
    <div className="relative mb-12 overflow-hidden rounded-3xl border border-primary/50 bg-linear-to-br from-primary/30 via-background to-background p-px shadow-[0_25px_80px_-45px_rgba(56,189,248,0.8)]">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute -bottom-20 left-6 h-60 w-60 rounded-full bg-accent/30 blur-3xl" />
      </div>
      <div className="relative flex flex-col gap-6 rounded-[calc(var(--radius-3xl)-1px)] bg-card/90 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex flex-col gap-5 text-center sm:flex-row sm:items-center sm:text-left">
          <span
            className="relative flex size-20 items-center justify-center rounded-2xl border border-white/20 shadow-[0_0_35px_rgba(250,204,21,0.35)] transition-transform duration-200 hover:-translate-y-1"
            style={{ backgroundColor }}
            aria-hidden="true"
          >
            <Flame className="text-white size-10 drop-shadow-lg" />
          </span>
          <div className="flex flex-col gap-2">
            <span className="text-primary text-xs font-semibold uppercase tracking-[0.4em]">
              Racha legendaria
            </span>
            <p className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
              {name}
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {statusMessage}
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-2 sm:items-end">
          <div className="text-foreground text-5xl font-black tracking-tight sm:text-6xl">
            {numberFormatter.format(streak)}
          </div>
          <div className="text-muted-foreground text-sm uppercase tracking-[0.4em]">
            Victorias seguidas
          </div>
        </div>
      </div>
    </div>
  );
}

export function StreakChampionSkeleton() {
  return (
    <div className="relative mb-12 overflow-hidden rounded-3xl border border-primary/50 bg-linear-to-br from-primary/20 via-background to-background p-px shadow-[0_25px_80px_-45px_rgba(56,189,248,0.6)]">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-20 left-6 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />
      </div>
      <div className="relative flex flex-col gap-6 rounded-[calc(var(--radius-3xl)-1px)] bg-card/90 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex flex-col gap-5 text-center sm:flex-row sm:items-center sm:text-left">
          <span
            className="relative flex size-20 items-center justify-center rounded-2xl border border-white/10 bg-primary/30 shadow-[0_0_35px_rgba(250,204,21,0.25)]"
            aria-hidden="true"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
          </span>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-3 sm:items-end">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-4 w-44" />
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/server";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import type { AppRouter } from "@/server/api/root";

type MatchesOutput = inferRouterOutputs<AppRouter>["matches"]["findAll"];
type MatchSummary = MatchesOutput[number];

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
});

const gradientPalettes: [string, ...string[]] = [
  "from-amber-500/15 via-rose-500/10 to-purple-700/20",
  "from-emerald-500/15 via-sky-500/10 to-indigo-700/20",
  "from-amber-400/15 via-amber-600/10 to-red-700/20",
];

const placementTitles: Record<number, string> = {
  1: "Campeón",
  2: "Subcampeón",
  3: "Tercero",
};

const toInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("") || "??";

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  if (!(normalized.length === 3 || normalized.length === 6)) {
    return null;
  }

  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return null;
  }

  return { r, g, b };
};

const contrastColor = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return "rgba(15, 23, 42, 0.95)";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6
    ? "rgba(15, 23, 42, 0.95)"
    : "rgba(248, 250, 252, 0.95)";
};

const placementBadge = (placement: number) => {
  const title = placementTitles[placement] ?? `Posición ${placement}`;
  const ordinal =
    placement === 1
      ? "1ro"
      : placement === 2
        ? "2do"
        : placement === 3
          ? "3ro"
          : `${placement}to`;
  return { title, ordinal };
};

export default async function HistoryPage() {
  const matches: MatchesOutput = await api.matches.findAll({ limit: 50 });

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
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

        <div className="text-primary flex items-center gap-2 text-sm font-medium uppercase tracking-[0.35em]">
          <Sparkles className="size-4 animate-pulse" />
          Crónicas mágicas
        </div>
      </div>

      <header className="mb-12 text-center md:text-left">
        <h1 className="text-primary mb-4 text-3xl font-bold tracking-widest md:text-5xl">
          Archivo de Duelo
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed md:text-base">
          Cada partida guardada queda inscripta en este grimorio. Reviví las
          gestas de tus invocadores y recordá quién se coronó en cada duelo de
          Magic.
        </p>
      </header>

      <section className="flex flex-1 flex-col gap-6 pb-12">
        {matches.length === 0 ? (
          <EmptyHistoryState />
        ) : (
          matches.map((match, index) => (
            <MatchCard
              key={`match-${match.id}`}
              match={match}
              gradient={
                gradientPalettes[index % gradientPalettes.length] ??
                gradientPalettes[0]
              }
            />
          ))
        )}
      </section>
    </>
  );
}

const EmptyHistoryState = () => (
  <div className="ornate-border relative mx-auto mt-12 flex max-w-xl flex-col items-center gap-4 rounded-3xl border border-primary/30 bg-card/70 px-6 py-12 text-center shadow-lg backdrop-blur">
    <Sparkles className="text-primary size-10 animate-pulse" />
    <h2 className="text-foreground text-2xl font-semibold tracking-wide">
      Aun no hay duelos registrados
    </h2>
    <p className="text-muted-foreground text-sm leading-relaxed">
      Guarda una partida desde el tablero principal para comenzar a construir la
      leyenda de tus invocadores.
    </p>
  </div>
);

interface MatchCardProps {
  match: MatchSummary;
  gradient: string;
}

const MatchCard = ({ match, gradient }: MatchCardProps) => {
  const playerCount = match.players.length;
  const createdAt = dateFormatter.format(match.createdAt);

  return (
    <article className="ornate-border relative overflow-hidden rounded-3xl border border-primary/30 bg-card/70 p-6 shadow-xl backdrop-blur">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-60 blur-2xl transition-opacity",
          playerCount > 0 ? "opacity-60" : "opacity-30",
          `bg-linear-to-br ${gradient}`,
        )}
      />
      <div className="relative flex flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-[0.4em]">
              Duelo #{match.id}
            </p>
            <h2 className="text-foreground mt-2 text-xl font-semibold">
              {createdAt}
            </h2>
          </div>

          <div className="flex items-end gap-6 text-sm">
            <div className="text-right">
              <p className="text-muted-foreground uppercase tracking-wider">
                Invocadores
              </p>
              <p className="text-foreground text-2xl font-bold">
                {playerCount}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground uppercase tracking-wider">
                Vida Inicial
              </p>
              <p className="text-foreground text-2xl font-bold">
                {match.startingHp}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-3">
          {match.players.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">
              Esta partida no tiene invocadores registrados.
            </p>
          ) : (
            match.players.map((player) => (
              <PlayerRow key={`${match.id}-${player.id}`} player={player} />
            ))
          )}
        </div>
      </div>
    </article>
  );
};

type PlayerSummary = MatchSummary["players"][number];

const PlayerRow = ({ player }: { player: PlayerSummary }) => {
  const { ordinal, title } = placementBadge(player.placement);
  const textColor = contrastColor(player.backgroundColor);
  const safeName = player.name ?? "Invocador desconocido";
  const initials = toInitials(safeName);
  const placementToMedal = [null, "🏆", "🥈", "🥉"];

  return (
    <div className="border-border/60 bg-background/60 flex items-center justify-between rounded-2xl border px-4 py-3 shadow-sm transition-transform duration-200 hover:-translate-y-px hover:border-primary/60 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "border-primary/40 flex size-10 items-center justify-center rounded-full border text-sm font-semibold uppercase shadow",
            player.placement === 1
              ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-background"
              : "",
          )}
          style={{
            backgroundColor: player.backgroundColor ?? "#f8fafc",
            color: textColor,
          }}
          title={title}
        >
          {initials}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {placementToMedal[player.placement]}
            <p className="text-foreground text-base font-semibold">
              {safeName}
            </p>
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
            {title}
          </p>
        </div>
      </div>

      <div className="bg-muted/60 text-muted-foreground flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.25em]">
        {ordinal}
      </div>
    </div>
  );
};

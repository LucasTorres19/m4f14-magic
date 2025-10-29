import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/server";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Camera, ImageOff, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { AppRouter } from "@/server/api/root";

type MatchesOutput = inferRouterOutputs<AppRouter>["matches"]["findAll"];
type MatchSummary = MatchesOutput[number];
type PlayerSummary = MatchSummary["players"][number];
type MatchImage = MatchSummary["images"][number];

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
  const title = placementTitles[placement] ?? `Posicion ${placement}`;
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
      <div className="mb-8 flex flex-col-reverse gap-6 md:flex-row md:items-center md:justify-between">
        <Button
          asChild
          variant="outline"
          className="border-primary/40 bg-card/70 text-card-foreground hover:border-primary/60 hover:bg-card/80"
        >
          <Link href="/" className="inline-flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Volver al menu
          </Link>
        </Button>

        <div className="text-primary flex items-center gap-2 text-xs font-medium uppercase tracking-[0.4em]">
          <Sparkles className="size-4 animate-pulse" />
          Cronicas de la mesa
        </div>
      </div>

      <header className="mb-12 space-y-4 text-center md:text-left">
        <h1 className="text-foreground text-4xl font-bold tracking-tight md:text-5xl">
          Archivo de duelos
        </h1>
        <p className="text-muted-foreground mx-auto max-w-3xl text-sm leading-relaxed md:mx-0 md:text-base">
          Revive cada mesa con las fotografias guardadas y recuerda quien piloto
          a cada comandante hasta la victoria.
        </p>
      </header>

      <section className="flex flex-1 flex-col gap-8 pb-12">
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
      Guarda una partida desde el tablero principal para construir la coleccion
      de comandantes y fotografias de tu grupo.
    </p>
  </div>
);

interface MatchCardProps {
  match: MatchSummary;
  gradient: string;
}

const MatchCard = ({ match, gradient }: MatchCardProps) => {
  const createdAt = new Date(match.createdAt);
  const matchDate = format(createdAt, "EEEE d 'de' MMMM yyyy", { locale: es });
  const matchTime = format(createdAt, "HH:mm 'hs'", { locale: es });
  const playerCount = match.players.length;

  return (
    <article className="ornate-border relative overflow-hidden rounded-3xl border border-primary/30 bg-card/70 shadow-xl backdrop-blur">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-60 blur-2xl transition-opacity",
          `bg-linear-to-br ${gradient}`,
        )}
      />

      <div className="relative flex flex-col gap-8 p-6 md:p-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-muted-foreground/80 text-xs uppercase tracking-[0.4em]">
              Duelo #{match.id}
            </p>
            <h2 className="text-foreground text-2xl font-semibold md:text-3xl">
              {matchDate}
            </h2>
            <p className="text-muted-foreground text-sm">
              Registro tomado a las {matchTime}.
            </p>
          </div>
          <div className="flex items-end gap-6 text-sm">
            <div className=" grow text-center md:text-right">
              <p className="text-muted-foreground uppercase tracking-wider">
                Invocadores
              </p>
              <p className="text-foreground text-2xl font-bold">
                {playerCount}
              </p>
            </div>
            <div className="grow text-center md:text-right">
              <p className="text-muted-foreground uppercase tracking-wider">
                Vida Inicial
              </p>
              <p className="text-foreground text-2xl font-bold">
                {match.startingHp}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.8fr)]">
          <MatchGallery matchId={match.id} images={match.images} />

          <div className="grid gap-4 sm:grid-cols-2">
            {match.players.length === 0 ? (
              <div className="col-span-2 flex h-full min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-background/60 p-6 text-center text-sm text-muted-foreground">
                <Camera className="size-8 text-muted-foreground/70" />
                <p>Esta partida no tiene invocadores registrados.</p>
              </div>
            ) : (
              match.players.map((player) => (
                <PlayerCommanderCard
                  key={`${match.id}-${player.id}`}
                  player={player}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

const MatchGallery = ({
  matchId,
  images,
}: {
  matchId: number;
  images: MatchImage[];
}) => {
  if (!images || images.length === 0) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-background/60 p-8 text-center text-sm text-muted-foreground">
        <ImageOff className="size-8 text-muted-foreground/70" />
        <p>Aun no se cargaron fotografias para este duelo.</p>
      </div>
    );
  }

  const [primary, ...secondary] = images;

  if (!primary) return null;
  return (
    <div className="space-y-3">
      <div className="relative h-56 overflow-hidden rounded-2xl border border-white/12 bg-background/60 shadow-lg sm:h-72">
        <Image
          src={primary.url}
          alt={
            primary.name
              ? `Foto principal: ${primary.name}`
              : `Foto del duelo ${matchId}`
          }
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 480px, 100vw"
          unoptimized
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-start gap-3 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/80">
          <span>Registro visual</span>
        </div>
      </div>

      {secondary.length > 0 ? (
        <div className="-mx-1 flex items-center gap-3 overflow-x-auto pb-2">
          {secondary.map((image) => (
            <div
              key={image.id}
              className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-background/70"
            >
              <Image
                src={image.url}
                alt={
                  image.name
                    ? `Foto adicional: ${image.name}`
                    : `Foto adicional del duelo ${matchId}`
                }
                fill
                className="object-cover"
                sizes="128px"
                unoptimized
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const PlayerCommanderCard = ({ player }: { player: PlayerSummary }) => {
  const { ordinal, title } = placementBadge(player.placement);
  const safeName = player.name ?? "Invocador desconocido";
  const initials = toInitials(safeName);
  const textColor = contrastColor(player.backgroundColor);
  const commander = player.commander ?? null;
  const commanderName = commander?.name ?? "Comandante desconocido";
  const commanderImageUrl =
    commander?.artImageUrl ?? commander?.imageUrl ?? null;
  const showCommanderImage =
    typeof commanderImageUrl === "string" && commanderImageUrl.length > 0;
  const auraColor = hexToRgb(player.backgroundColor ?? "#1f2937");
  const auraShadow = auraColor
    ? `0 24px 45px -28px rgba(${auraColor.r}, ${auraColor.g}, ${auraColor.b}, 0.7)`
    : undefined;
  const auraTint = auraColor
    ? `linear-gradient(135deg, rgba(${auraColor.r}, ${auraColor.g}, ${auraColor.b}, 0.3) 0%, rgba(15,23,42,0.85) 100%)`
    : undefined;

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/12 bg-card/70 shadow-lg transition-transform duration-200 hover:-translate-y-1",
        player.placement === 1
          ? "ring-2 ring-amber-300/60 ring-offset-2 ring-offset-background"
          : "",
      )}
      style={auraShadow ? { boxShadow: auraShadow } : undefined}
    >
      {showCommanderImage ? (
        <Image
          src={commanderImageUrl}
          alt={`Comandante ${commanderName}`}
          fill
          className="object-cover object-top opacity-70 transition duration-300 group-hover:scale-105"
          sizes="240px"
          unoptimized
        />
      ) : auraTint ? (
        <div
          className="absolute inset-0 opacity-80"
          style={{ background: auraTint }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/70" />
      )}
      <div className="absolute inset-0 bg-linear-to-br from-slate-950/85 via-slate-950/75 to-slate-950/60" />

      <div className="relative flex h-full flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex relative h-11 w-11 items-center justify-center rounded-full border border-white/20 text-sm font-semibold uppercase shadow"
              style={{
                backgroundColor: player.backgroundColor ?? "#f8fafc",
                color: textColor,
              }}
              title={title}
            >
              {initials}
            </div>
            <div>
              <p className="text-foreground text-lg font-semibold tracking-tight">
                {safeName}
              </p>
              <p className="text-muted-foreground text-[10px] uppercase tracking-[0.35em]">
                {title}
              </p>
            </div>
          </div>

          <span className="rounded-full border border-white/20 px-3 py-1 text-[11px] bg-slate-900/70 font-semibold uppercase tracking-[0.3em] text-white/80">
            {ordinal}
          </span>
        </div>

        <div className="mt-auto space-y-1">
          <p className="text-muted-foreground text-[10px] uppercase tracking-[0.35em]">
            Comandante
          </p>
          <p className="text-foreground text-sm font-medium">{commanderName}</p>
        </div>
      </div>
    </div>
  );
};

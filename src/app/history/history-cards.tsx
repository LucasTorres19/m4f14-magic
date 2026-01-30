"use client";

import { ArrowRight, Camera, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { LocalizedDate } from "@/components/localized-date";
import { cn } from "@/lib/utils";
import { MatchGallery } from "./match-gallery";
import type { LeagueSummary, MatchSummary, PlayerSummary } from "./history-types";

export const gradientPalettes: [string, ...string[]] = [
  "from-amber-500/15 via-rose-500/10 to-purple-700/20",
  "from-emerald-500/15 via-sky-500/10 to-indigo-700/20",
  "from-amber-400/15 via-amber-600/10 to-red-700/20",
];

const matchDateOptions: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

const leagueDateOptions: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

const matchTimeOptions: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

const placementTitles: Record<number, string> = {
  1: "CampeÃ³n",
  2: "SubcampeÃ³n",
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
  const title = placementTitles[placement] ?? `PosiciÃ³n ${placement}`;
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

export const EmptyHistoryState = () => (
  <div className="ornate-border relative mx-auto mt-12 flex max-w-xl flex-col items-center gap-4 rounded-3xl border border-primary/30 bg-card/70 px-6 py-12 text-center shadow-lg backdrop-blur">
    <Sparkles className="text-primary size-10 animate-pulse" />
    <h2 className="text-foreground text-2xl font-semibold tracking-wide">
      AÃºn no hay duelos registrados
    </h2>
    <p className="text-muted-foreground text-sm leading-relaxed">
      Guarda una partida desde el tablero principal para construir la colecciÃ³n
      de comandantes y fotografÃ­as de tu grupo.
    </p>
  </div>
);

interface LeagueFeedCardProps {
  league: LeagueSummary;
  gradient: string;
}

export const LeagueFeedCard = ({ league, gradient }: LeagueFeedCardProps) => {
  const createdAt =
    league.createdAt instanceof Date
      ? league.createdAt.toISOString()
      : league.createdAt;
  const statusLabel = league.finished ? "Finalizada" : "En curso";
  const hasPlannedMatches = league.plannedMatches > 0;
  const progress = hasPlannedMatches
    ? Math.round((league.playedMatches / league.plannedMatches) * 100)
    : 0;

  return (
    <Link
      href={`/history/tournament/${league.id}`}
      className="group block h-full"
    >
      <article className="ornate-border relative overflow-hidden rounded-3xl border border-primary/30 bg-card/70 shadow-xl backdrop-blur">
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-60 blur-2xl transition-opacity group-hover:opacity-80",
            `bg-linear-to-br ${gradient}`,
          )}
        />
        <div className="relative flex flex-col gap-8 p-6 md:p-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground/80 text-xs uppercase tracking-[0.4em]">
                Liga
              </p>
              <h2 className="text-foreground text-2xl font-semibold md:text-3xl">
                {league.name}
              </h2>
              <p className="text-muted-foreground text-sm">
                <LocalizedDate
                  value={createdAt}
                  options={leagueDateOptions}
                  className="capitalize"
                  fallback="Fecha desconocida"
                />
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span
                className={cn(
                  "rounded-full border border-white/20 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em]",
                  league.finished
                    ? "bg-emerald-900/70 text-emerald-200"
                    : "bg-amber-900/70 text-amber-200",
                )}
              >
                {statusLabel}
              </span>
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary/80">
                Ver detalle <ArrowRight className="size-3" />
              </span>
            </div>
          </header>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-[10px] uppercase tracking-[0.35em]">
                Partidos
              </dt>
              <dd className="text-foreground text-2xl font-bold">
                {league.playedMatches}
                <span className="text-muted-foreground text-xs">
                  {" "}
                  / {league.plannedMatches}
                </span>
              </dd>
            </div>
            <div className="text-left sm:text-right">
              <dt className="text-muted-foreground text-[10px] uppercase tracking-[0.35em]">
                Progreso
              </dt>
              <dd className="text-foreground text-lg font-semibold">
                {hasPlannedMatches ? `${progress}%` : "-"}
              </dd>
            </div>
          </dl>
        </div>
      </article>
    </Link>
  );
};

interface MatchCardProps {
  match: MatchSummary;
  gradient: string;
}

export const MatchCard = ({ match, gradient }: MatchCardProps) => {
  const createdAt =
    match.createdAt instanceof Date
      ? match.createdAt.toISOString()
      : match.createdAt;
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
              <LocalizedDate
                value={createdAt}
                options={matchDateOptions}
                className="capitalize"
                fallback="Fecha desconocida"
              />
            </h2>
            <p className="text-muted-foreground text-sm">
              Registro tomado a las{" "}
              <LocalizedDate
                value={createdAt}
                options={matchTimeOptions}
                suffix=" hs"
                fallback="--:-- hs"
              />
              .
            </p>
          </div>
          <div className="flex items-end gap-6 text-sm">
            <div className="grow text-center md:text-right">
              <p className="text-muted-foreground uppercase tracking-wider">
                Invocadores
              </p>
              <p className="text-foreground text-2xl font-bold">
                {playerCount}
              </p>
            </div>
            <div className="grow text-center md:text-right">
              <p className="text-muted-foreground uppercase tracking-wider">
                Vida inicial
              </p>
              <p className="text-foreground text-2xl font-bold">
                {match.startingHp}
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-6">
          <MatchGallery
            matchId={match.id}
            image={match.image}
            croppedImage={match.croppedImage}
          />

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
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-sm font-semibold uppercase shadow"
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

          <span className="rounded-full border border-white/20 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80">
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

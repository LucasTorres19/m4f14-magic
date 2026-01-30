import { Button } from "@/components/ui/button";
import { api } from "@/trpc/server";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import { HistoryFeed } from "./history-feed";
import type { LeaguesOutput, MatchesOutput } from "./history-types";

export default async function HistoryPage() {
  const matches: MatchesOutput = await api.matches.findAll({ limit: 10 });
  const leagues: LeaguesOutput = await api.tournament.list();

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
            Volver al menú
          </Link>
        </Button>

        <div className="text-primary flex items-center gap-2 text-xs font-medium uppercase tracking-[0.4em]">
          <Sparkles className="size-4 animate-pulse" />
          Crónicas de la mesa
        </div>
      </div>

      <header className="mb-12 space-y-4 text-center md:text-left">
        <h1 className="text-foreground text-4xl font-bold tracking-tight md:text-5xl">
          Archivo de duelos
        </h1>
        <p className="text-muted-foreground mx-auto max-w-3xl text-sm leading-relaxed md:mx-0 md:text-base">
          Revive cada mesa con las fotografías guardadas y recuerda quién
          pilotó a cada comandante hasta la victoria.
        </p>
      </header>

      <HistoryFeed
        initialMatches={matches.items}
        initialCursor={matches.nextCursor}
        leagues={leagues}
      />
    </>
  );
}

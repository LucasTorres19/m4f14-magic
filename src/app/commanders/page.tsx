"use client"

import { useMemo, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Crown, X } from "lucide-react"
import Link from "next/link"
import { api } from "@/trpc/react"
import FlyingCards from "@/components/Flying-cards"
import Image from "next/image"
import { Swords,Trophy,Medal,Boxes,Droplets  } from 'lucide-react';

type ApiCommander = {
  id: number
  name: string | null
  imageUrl: string | null
  description: string | null
  scryfallUri: string | null
  matchCount: number | string | null
  wins: number | string | null
  podiums: number | string | null
  seconds: number | string | null
  lastSecondAt: number | string | null
  isCebollita: 0 | 1 | boolean | null
  otpPlayerId?: number | null
  otpPlayerName?: string | null  
}

type CommanderUI = ApiCommander & {
  matchCount: number
  wins: number
  podiums: number
  seconds: number
  lastSecondAt: number
  isCebollita: boolean
  otpPlayerId?: number | null 
  otpPlayerName?: string | null    
}


export default function ComandantesPage() {
  const { data, isLoading, isError } = api.commanders.list.useQuery({
    query: "",
    limit: 50,
  })

    const list = useMemo<CommanderUI[]>(() => {
    const rows = (data ?? []) as ApiCommander[]
      return rows.map((c) => ({
        ...c,
        matchCount: Number(c.matchCount ?? 0),
        wins: Number(c.wins ?? 0),
        podiums: Number(c.podiums ?? 0),
        seconds: Number(c.seconds ?? 0),
        lastSecondAt: Number(c.lastSecondAt ?? 0),
        isCebollita: Boolean(c.isCebollita),
      }))
    }, [data])

    const pct = (wins?: number, total?: number) => total && total > 0 ? Math.round(((wins ?? 0) / total) * 100) : 0

  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightbox])

  const getColorBadges = (colors: string | null | undefined) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      W: { bg: "bg-amber-100", text: "text-amber-900" },
      U: { bg: "bg-blue-500", text: "text-white" },
      B: { bg: "bg-gray-900", text: "text-white" },
      R: { bg: "bg-red-600", text: "text-white" },
      G: { bg: "bg-green-600", text: "text-white" },
    }

    return (colors ?? "")
      .split("")
      .map((color, i) => {
        const style = colorMap[color] ?? { bg: "bg-gray-500", text: "text-white" }
        return (
          <span
            key={`${color}-${i}`}
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${style.bg} ${style.text}`}
          >
            {color}
          </span>
        )
      })
  }

  type SortKey = "name" | "matches" | "winrate";
  type SortDir = "asc" | "desc";

  const [sortKey, setSortKey] = useState<SortKey>("winrate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const collator = useMemo(
    () => new Intl.Collator("es", { sensitivity: "base" }),
    []
  );

  const safe = (s: string | null | undefined) => s ?? "";
  const winrate = (w: number, t: number) => (t > 0 ? (w / t) * 100 : 0);

  const sorted = useMemo(() => {
    const arr = [...list];
    arr.sort((a, b) => {
      if (sortKey === "name") {
        const cmp = collator.compare(safe(a.name), safe(b.name));
        return sortDir === "asc" ? cmp : -cmp;
      }

      let va = 0, vb = 0;
      if (sortKey === "matches") {
        va = a.matchCount; vb = b.matchCount;
      } else {
        va = winrate(a.wins, a.matchCount);
        vb = winrate(b.wins, b.matchCount);
      }

      if (va === vb) {
        const byName = collator.compare(safe(a.name), safe(b.name));
        if (byName !== 0) return byName;
        return a.id - b.id;
      }

      const cmp = va < vb ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [list, sortKey, sortDir, collator]);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <FlyingCards />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/">
              <Button variant="outline" size="sm" className="mb-4 bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al menú
              </Button>
            </Link>
            <h1 className="text-2xl md:text-5xl font-bold mb-2">Colección de Comandantes</h1>
            <p className="text-muted-foreground">Gestiona tu colección de comandantes.</p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm text-muted-foreground tracking-widest flex">
              <Crown className="mr-2 h-4 w-4" /> GRANDES LÍDERES
            </p>
          </div>
        </div>

        {isLoading && (
          <div
            className="flex items-center justify-center gap-3 py-20 text-muted-foreground"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Crown className="w-20 h-20 animate-spin origin-center" />
          </div>
        )}

        {isError && (
          <div className="text-center py-20 text-destructive">Error al cargar los comandantes.</div>
        )}

        {!isLoading && !isError && (     
          <>
            <div className="mb-4 flex items-center justify-end gap-2">
              <label htmlFor="sortKey" className="text-sm text-muted-foreground">Ordenar por:</label>
              <select
                id="sortKey"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="name">Nombre</option>
                <option value="matches">Partidas</option>
                <option value="winrate">Winrate</option>
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="ml-2"
                title={sortDir === "asc" ? "Ascendente" : "Descendente"}
              >
                {sortDir === "asc" ? "↑" : "↓"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sorted.map((commander) => (
                <Card
                  key={commander.id}
                  className="overflow-hidden group hover:ring-2 hover:ring-primary transition-all pb-0 pt-0"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox({
                        src: commander.imageUrl ?? "/placeholder.svg",
                        alt: commander.name ?? "Commander",
                      })
                    }
                    className="relative aspect-5/7 overflow-hidden bg-muted w-full cursor-zoom-in"
                    aria-label={`Abrir ${commander.name ?? "imagen"} en grande`}
                  >
                    <Image
                      src={commander.imageUrl ?? "/placeholder.svg"}
                      alt={commander.name ?? "Commander"}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      className="object-cover"
                      unoptimized 
                    />
                  </button>

                  <div className="p-4 space-y-2">
                    
                    <div className="flex justify-between items-center">
                    
                        <h3 className="font-bold text-lg leading-tight">{commander.name}</h3>
        
                        {commander.scryfallUri && (
                            <Link href={commander.scryfallUri ?? ""} target="_blank">
                                <Image
                                src={"https://artgame.scryfall.com/scryfall.svg"}
                                alt={"Scryfall link"}
                                width={20}
                                height={20}
                                className="object-cover cursor-pointer"
                                unoptimized 
                                />
                            </Link>
                        )} 
                    </div>
           
                    <div className="flex gap-2 mt-5 flex-wrap gap-y-3 ">

                        <span className="otp-badge">
                            <Medal width={20} />
                            <span className="label">
                                Mas jugado por {commander.otpPlayerName ?? "—"}
                            </span>
                            <span aria-hidden className="heat" />
                        </span>

                        {commander.isCebollita && (
                          <span className="cebolla-badge">
                            <Droplets width={16} height={16} className="tear" />
                            <span className="label">Cebollita</span>
                            <span aria-hidden className="blue-heat" />
                          </span>
                        )}

                        <span className="text-xs py-1 rounded-full bg-primary/10 text-primary flex w-fit items-center px-3">
                            <Swords className="mr-2" width={20}/>  {commander.matchCount} combates 
                        </span>

                        <span className="text-xs py-1 rounded-full bg-primary/10 text-primary flex w-fit items-center px-3">
                          <Trophy className="mr-2" width={20} />
                              {pct(commander.wins, commander.matchCount)}% Winrate
                        </span>

                        <span className="text-xs py-1 rounded-full bg-primary/10 text-primary flex w-fit items-center px-3">
                          <Boxes className="mr-2" width={20} />
                          {pct(commander.podiums, commander.matchCount)}% Podio
                        </span>

                    </div>

                  </div>
                </Card>
              ))}
            </div>

            {sorted.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">No hay comandantes cargados.</p>
              </div>
            )}
          </>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-[95vw] h-[90vh] max-w-[95vw] max-h-[90vh] rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightbox.src ?? "/placeholder.svg"}
              alt={lightbox.alt ?? "Commander"}
              fill
              className="object-contain"
              sizes="100vw"
              priority
              unoptimized 
            />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-2 text-sm shadow hover:bg-background"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

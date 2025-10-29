"use client"

import { useMemo, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Crown, X } from "lucide-react"
import Link from "next/link"
import { api } from "@/trpc/react"
import FlyingCards from "@/components/Flying-cards"
import Image from "next/image"

type Commander = {
  id: number
  name: string | null
  colors?: string | null
  imageUrl: string | null
  description: string | null
  scryfallUri?: string | null
}

export default function ComandantesPage() {
  const { data, isLoading, isError } = api.commanders.list.useQuery({
    query: "",
    limit: 50,
  })

  const list = useMemo<Commander[]>(() => data ?? [], [data])

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
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Colección de Comandantes</h1>
            <p className="text-muted-foreground">Gestiona tu colección de comandantes.</p>
          </div>
          <div className="text-right">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {list.map((commander) => (
                <Card
                  key={commander.id}
                  className="overflow-hidden group hover:ring-2 hover:ring-primary transition-all"
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
                                width={30}
                                height={30}
                                className="object-cover cursor-pointer"
                                unoptimized 
                                />
                            </Link>
                        )} 
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {list.length === 0 && (
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

"use client"

import { Button } from "@/components/ui/button"
import { Sparkles,Layers, Users,LibraryBig,Dices   } from "lucide-react"
import Link from "next/link"

export function MagicMenu() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute flying-card"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          >
            <div className="w-20 h-28 md:w-24 md:h-32 bg-linear-to-br from-card/60 to-card/40 backdrop-blur-sm rounded-lg border-2 border-primary/30 shadow-lg ornate-border opacity-40" />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px] float-animation" />
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-[120px] float-animation"
          style={{ animationDelay: "2s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[150px]" />
      </div>

      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-primary/40" />
      <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-primary/40" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-primary/40" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-primary/40" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-0">
        <div className="mb-6 text-center">
          <h1 className="text-2xl md:text-7xl font-bold text-primary mb-4 tracking-wider text-balance">
            Las Magicas
          </h1>
          <div className="h-1 w-64 mx-auto bg-linear-to-r from-transparent via-primary to-transparent" />
        </div>

        <div className="w-full max-w-md">
          <div className="ornate-border bg-card/80 backdrop-blur-sm p-8 rounded-lg space-y-4">
           
              <Button className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground ornate-border magical-glow transition-all duration-300 hover:scale-105">
                <Link href="/match" className="flex items-center w-full justify-center">
                  <Dices className="w-5 h-5 mr-2" />     
                  Nuevo
                </Link>
              </Button>


            <Button className="w-full h-14 text-lg font-semibold bg-secondary hover:bg-secondary/90 text-secondary-foreground border-2 border-secondary/50 transition-all duration-300 hover:scale-105">
                <Link href="/match" className="flex items-center w-full justify-center">
                  <Sparkles className="w-5 h-5 mr-2" />   
                  Continuar
                </Link>
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-4 text-sm text-muted-foreground">Opciones</span>
              </div>
            </div>

            {/* Other menu options */}
            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium bg-muted/30 hover:bg-muted/50 text-foreground border-border hover:border-primary/50 transition-all duration-300 hover:scale-105"
            >
              <LibraryBig className="w-4 h-4 mr-2" />
              Historia
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium bg-muted/30 hover:bg-muted/50 text-foreground border-border hover:border-primary/50 transition-all duration-300 hover:scale-105"
            >
              <Layers className="w-4 h-4 mr-2" />
              Barajas
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium bg-muted/30 hover:bg-muted/50 text-foreground border-border hover:border-primary/50 transition-all duration-300 hover:scale-105"
            >
              <Users className="w-4 h-4 mr-2" />
              Invocadores
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6 tracking-widest">✦ INVOCA TU DESTINO ✦</p>
        </div>
      </div>
    </div>
  )
}

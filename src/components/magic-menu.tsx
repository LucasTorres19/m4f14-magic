"use client";

import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Dices,
  Crown,
  LibraryBig,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import FlyingCards from "./Flying-cards";
import { NewMatchButton } from "./NewMatchButton";

export function MagicMenu() {
  return (
    <div className="bg-background relative min-h-screen overflow-hidden">
      
      <FlyingCards />

      <div className="absolute inset-0 opacity-30">
        <div className="bg-primary/20 float-animation absolute top-20 left-20 h-96 w-96 rounded-full blur-[120px]" />
        <div
          className="bg-accent/20 float-animation absolute right-20 bottom-20 h-96 w-96 rounded-full blur-[120px]"
          style={{ animationDelay: "2s" }}
        />
        <div className="bg-secondary/10 absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[150px]" />
      </div>

      <div className="border-primary/40 absolute top-0 left-0 h-32 w-32 border-t-2 border-l-2" />
      <div className="border-primary/40 absolute top-0 right-0 h-32 w-32 border-t-2 border-r-2" />
      <div className="border-primary/40 absolute bottom-0 left-0 h-32 w-32 border-b-2 border-l-2" />
      <div className="border-primary/40 absolute right-0 bottom-0 h-32 w-32 border-r-2 border-b-2" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-0">
        <div className="mb-6 text-center">
          <h1 className="text-primary mb-4 text-2xl font-bold tracking-wider text-balance md:text-7xl">
            Las Mágicas
          </h1>
          <div className="via-primary mx-auto h-1 w-64 bg-linear-to-r from-transparent to-transparent" />
        </div>

        <div className="w-full max-w-md">
          <div className="ornate-border bg-card/80 space-y-4 rounded-lg p-8 backdrop-blur-sm">
            
            <NewMatchButton />

            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground border-secondary/50 h-14 w-full border-2 text-lg font-semibold transition-all duration-300 hover:scale-105">
              <Link
                href="/match"
                className="flex w-full items-center justify-center"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Continuar
              </Link>
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="border-border w-full border-t" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card text-muted-foreground px-4 text-sm">
                </span>
              </div>
            </div>

            {/* Other menu options */}
            <Button
              asChild
              variant="outline"
              className="bg-muted/30 hover:bg-muted/50 text-foreground border-border hover:border-primary/50 h-12 w-full text-base font-medium transition-all duration-300 hover:scale-105"
            >
              <Link
                href="/history"
                className="flex w-full items-center justify-center"
              >
                <LibraryBig className="mr-2 h-4 w-4" />
                Historia
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="bg-muted/30 hover:bg-muted/50 text-foreground border-border hover:border-primary/50 h-12 w-full text-base font-medium transition-all duration-300 hover:scale-105"
            >
              <Link
                href="/analytics"
                className="flex w-full items-center justify-center"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Oráculo
              </Link>
            </Button>

            <Button
              variant="outline"
              className="bg-muted/30 hover:bg-muted/50 text-foreground border-border hover:border-primary/50 h-12 w-full text-base font-medium transition-all duration-300 hover:scale-105"
            >
              <Link
                href="/commanders"
                className="flex w-full items-center justify-center"
              >
                <Crown className="mr-2 h-4 w-4" />
                Comandantes
              </Link>
            </Button>

            <Button
              variant="outline"
              className="bg-muted/30 hover:bg-muted/50 text-foreground border-border hover:border-primary/50 h-12 w-full text-base font-medium transition-all duration-300 hover:scale-105"
            >
              <Users className="mr-2 h-4 w-4" />
              Invocadores
            </Button>
          </div>

          <p className="text-muted-foreground mt-6 text-center text-sm tracking-widest">
            ✦ INVOCÁ TU DESTINO ✦
          </p>
        </div>
      </div>
    </div>
  );
}

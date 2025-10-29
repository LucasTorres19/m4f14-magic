"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentMatch } from "@/app/_stores/current-match-provider";
import { useSettings } from "@/app/_stores/settings-provider";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const STORAGE_KEY = "current-match-store";

function hasExistingMatch(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const state = parsed?.state ?? parsed;
    return Array.isArray(state?.players) && state.players.length > 0;
  } catch {
    return true;
  }
}

export function NewMatchButton() {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resetMatch = useCurrentMatch((s) => s.resetMatch);

  const startingHp = useSettings((s) => s.startingHp);
  const playersCount = useSettings((s) => s.playersCount);

  const newGame = useCallback(() => {
    try {
      resetMatch(startingHp, playersCount);
    } finally {
      router.push("/match");
    }
  }, [resetMatch, startingHp, playersCount, router]);

  const handleClick = () => {
    if (hasExistingMatch()) {
      setConfirmOpen(true);
    } else {
      newGame();
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        className="bg-primary hover:bg-primary/90 text-primary-foreground ornate-border magical-glow h-14 w-full text-lg font-semibold transition-all duration-300 hover:scale-105"
      >
        <Link
          href="/match"
          onClick={(e) => e.preventDefault()}
          className="flex w-full items-center justify-center"
        >
          <Dices className="mr-2 h-5 w-5" />
          Nuevo
        </Link>
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Empezar una nueva partida?</AlertDialogTitle>
            <AlertDialogDescription>
              Tenés una partida guardada. Si empezás una nueva, se
              reiniciarán los puntos de vida y el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                newGame();
              }}
            >
              Sí, reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

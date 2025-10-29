"use client";

import { useCurrentMatch } from "@/app/_stores/current-match-provider";
import { useSettings } from "@/app/_stores/settings-provider";
import { Button } from "@/components/ui/button";
import { Dices } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STORAGE_KEY = "current-match-store";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function hasNonEmptyPlayers(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}

function hasExistingMatch(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) return false;

    const maybeEnvelope = parsed;
    const maybeState = isRecord(maybeEnvelope.state)
      ? maybeEnvelope.state
      : maybeEnvelope;

    if (!isRecord(maybeState)) return false;

    const players = maybeState.players;
    return hasNonEmptyPlayers(players);
  } catch {
    return false;
  }
}

export function NewMatchButton() {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resetMatch = useCurrentMatch((s) => s.resetMatch);
  const settings = useSettings((s) => s);

  const newGame = useCallback(() => {
    try {
      resetMatch(settings.startingHp, settings.playersCount, settings);
    } finally {
      router.push("/match");
    }
  }, [resetMatch, settings, router]);

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
              Tenés una partida guardada. Si empezás una nueva, se reiniciarán
              los puntos de vida y el historial.
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

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useSettings } from "@/app/_stores/use-settings";
import { useCurrentMatch } from "@/app/_stores/use-current-match";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type ResetMatchButtonProps = {
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onReset?: (hp: number, players: number) => void;
};

export default function ResetButton({
  trigger,
  title = "Reiniciar partida",
  description,
  confirmLabel = "Reiniciar",
  cancelLabel = "Cancelar",
  onReset,
}: ResetMatchButtonProps) {
  const startingHp = useSettings((s) => s.startingHp);
  const playersCount = useSettings((s) => s.playersCount);
  const resetMatch = useCurrentMatch((s) => s.resetMatch);

  const desc =
    description ??
    `Esto reiniciará la partida con ${startingHp} de vida inicial y ${playersCount} invocadores. ¿Querés continuar?`;

  const handleReset = () => {
    resetMatch(startingHp, playersCount);
    onReset?.(startingHp, playersCount);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button
            size="sm"
            variant="destructive"
            className="pointer-events-auto"
          >
            <RotateCcw className="size-5" />
          </Button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

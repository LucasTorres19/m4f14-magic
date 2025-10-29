"use client";

import { useCurrentMatch } from "@/app/_stores/current-match-provider";
import { useSettings } from "@/app/_stores/settings-provider";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import * as React from "react";

type ResetMatchButtonProps = {
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export default function ResetButton({
  trigger,
  title = "Reiniciar partida",
  description,
  confirmLabel = "Reiniciar",
  cancelLabel = "Cancelar",
}: ResetMatchButtonProps) {
  const settings = useSettings((s) => s);
  const startingHp = settings.startingHp;
  const playersCount = settings.playersCount;
  const resetMatch = useCurrentMatch((s) => s.resetMatch);

  const desc =
    description ??
    `Esto reiniciará la partida con ${startingHp} de vida inicial y ${playersCount} invocadores. ¿Querés continuar?`;

  const handleReset = () => {
    resetMatch(startingHp, playersCount, settings);
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

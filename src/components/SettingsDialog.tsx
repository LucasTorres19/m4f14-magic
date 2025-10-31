"use client";

import { useCurrentMatch } from "@/app/_stores/current-match-provider";
import { useSettings } from "@/app/_stores/settings-provider";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as React from "react";

type SettingsDialogProps = {
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  minHp?: number;
  maxHp?: number;
  minPlayers?: number;
  maxPlayers?: number;
  onSaved?: (hp: number) => void;
};

export default function SettingsDialog({
  trigger,
  open,
  onOpenChange,
  minHp = 1,
  maxHp = 200,
  onSaved,
}: SettingsDialogProps) {
  const settingsSet = useSettings((s) => s.set);
  const settings = useSettings((s) => s);

  const [localOpen, setLocalOpen] = React.useState(false);
  const controlled = typeof open === "boolean";
  const isOpen = controlled ? open : localOpen;

  // Evita la unión de tipos en setOpen y asegura callable siempre
  const setOpen = React.useCallback(
    (v: boolean) => {
      if (controlled) {
        onOpenChange?.(v);
      } else {
        setLocalOpen(v);
      }
    },
    [controlled, onOpenChange],
  );

  const [startingHp, setStartingHp] = React.useState<number>(
    settings.startingHp ?? 40,
  );
  const [timerLimit, setTimerLimit] = React.useState<number>(
    settings.timerLimit ?? 120,
  );

  React.useEffect(() => {
    if (isOpen) {
      setStartingHp(settings.startingHp ?? 40);
      setTimerLimit(settings.timerLimit ?? 120);
    }
  }, [isOpen, settings]);

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));
  // firma gpt premiun
  const restartMatch = useCurrentMatch((s) => s.restartMatch);

  const onSave = () => {
    const hp = clamp(
      Number.isFinite(startingHp) ? startingHp : (settings.startingHp ?? 40),
      minHp,
      maxHp,
    );
    const timer = clamp(
      Number.isFinite(timerLimit) ? timerLimit : (settings.timerLimit ?? 120),
      10,
      600,
    );

    settingsSet("startingHp", hp);
    settingsSet("timerLimit", timer);

    // 🔹 Resetea la partida con los invocadores definidos
    restartMatch({ startingHp: hp, timerLimit: timer });

    onSaved?.(hp);
    setOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-scroll sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva partida</DialogTitle>
          <DialogDescription>
            Ajustá la vida inicial y la cantidad de invocadores.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="startingHp" className="col-span-2">
              Vida inicial
            </Label>
            <Input
              id="startingHp"
              type="number"
              min={minHp}
              max={maxHp}
              value={startingHp}
              onChange={(e) =>
                setStartingHp(Number.parseInt(e.target.value, 10) || minHp)
              }
              className="col-span-2"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="timerLimit" className="col-span-2">
              Tiempo límite (segundos)
            </Label>
            <Input
              id="timerLimit"
              type="number"
              min={10}
              max={600}
              value={timerLimit}
              onChange={(e) =>
                setTimerLimit(Number.parseInt(e.target.value, 10) || 120)
              }
              className="col-span-2"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={onSave} className="sm:ml-3">
            Guardar y jugar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

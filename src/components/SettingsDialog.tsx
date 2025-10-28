"use client";

import * as React from "react";
import { useSettings } from "@/app/_stores/use-settings";
import { useCurrentMatch } from "@/app/_stores/use-current-match";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SettingsDialogProps = {
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  minHp?: number;
  maxHp?: number;
  minPlayers?: number;
  maxPlayers?: number;
  onSaved?: (hp: number, players: number) => void;
};

export default function SettingsDialog({
  trigger,
  open,
  onOpenChange,
  minHp = 1,
  maxHp = 200,
  minPlayers = 2,
  maxPlayers = 8,
  onSaved,
}: SettingsDialogProps) {
  const settingsSet = useSettings((s) => s.set);
  const startingHpStore = useSettings((s) => s.startingHp);
  const playersCountStore = useSettings((s) => s.playersCount);

  const resetMatch = useCurrentMatch((s) => s.resetMatch);

  const [localOpen, setLocalOpen] = React.useState(false);
  const controlled = typeof open === "boolean";
  const isOpen = controlled ? open : localOpen;
  const setOpen = controlled ? onOpenChange! : setLocalOpen;

  const [startingHp, setStartingHp] = React.useState<number>(startingHpStore ?? 40);
  const [playersCount, setPlayersCount] = React.useState<number>(playersCountStore ?? 4);

  React.useEffect(() => {
    if (isOpen) {
      setStartingHp(startingHpStore);
      setPlayersCount(playersCountStore);
    }
  }, [isOpen, startingHpStore, playersCountStore]);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const onSave = () => {
    const hp = clamp(Number.isFinite(startingHp) ? startingHp : startingHpStore, minHp, maxHp);
    const count = clamp(Number.isFinite(playersCount) ? playersCount : playersCountStore, minPlayers, maxPlayers);

    settingsSet("startingHp", hp);
    settingsSet("playersCount", count);

    resetMatch(hp, count);

    onSaved?.(hp, count);
    setOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva partida</DialogTitle>
          <DialogDescription>
            Ajustá la vida inicial y la cantidad de jugadores.    
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
              onChange={(e) => setStartingHp(parseInt(e.target.value, 10))}
              className="col-span-2"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="playersCount" className="col-span-2">
              Jugadores
            </Label>
            <Input
              id="playersCount"
              type="number"
              min={minPlayers}
              max={maxPlayers}
              value={playersCount}
              onChange={(e) => setPlayersCount(parseInt(e.target.value, 10))}
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
          <Button type="button" onClick={onSave} className="ml-3">
            Guardar y jugar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

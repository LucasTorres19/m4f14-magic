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
import { randomHexColor } from "@/utils/gen";
import * as React from "react";

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

type Player = {
  id: string;
  name: string;
  hp: number;
  color: string;
};

export default function SettingsDialog({
  trigger,
  open,
  onOpenChange,
  minHp = 1,
  maxHp = 200,
  minPlayers = 2,
  maxPlayers = 10,
  onSaved,
}: SettingsDialogProps) {
  const settingsSet = useSettings((s) => s.set);
  const startingHpStore = useSettings((s) => s.startingHp);
  const playersCountStore = useSettings((s) => s.playersCount);
  const timerLimitStore = useSettings((s) => s.timerLimit);

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
    startingHpStore ?? 40,
  );
  const [playersCount, setPlayersCount] = React.useState<number>(
    playersCountStore ?? 4,
  );
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [timerLimit, setTimerLimit] = React.useState<number>(
    timerLimitStore ?? 120,
  );

  React.useEffect(() => {
    if (isOpen) {
      setStartingHp(startingHpStore ?? 40);
      setPlayersCount(playersCountStore ?? 4);
      setTimerLimit(timerLimitStore ?? 120);
    }
  }, [isOpen, startingHpStore, playersCountStore, timerLimitStore]);

  React.useEffect(() => {
    setPlayers((prev) => {
      const next: Player[] = [];
      for (let i = 0; i < playersCount; i++) {
        const existing = prev[i];
        next.push({
          id: existing?.id ?? `player-${i + 1}`,
          name: existing?.name ?? `invocador ${i + 1}`,
          hp: startingHp,
          color: existing?.color ?? randomHexColor(i),
        });
      }
      return next;
    });
  }, [startingHp, playersCount]);

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));
  // firma gpt premiun
  const resetMatchWithPlayers = useCurrentMatch((s) => s.resetMatchWithPlayers);

  const onSave = () => {
    const hp = clamp(
      Number.isFinite(startingHp) ? startingHp : (startingHpStore ?? 40),
      minHp,
      maxHp,
    );
    const count = clamp(
      Number.isFinite(playersCount) ? playersCount : (playersCountStore ?? 4),
      minPlayers,
      maxPlayers,
    );
    const timer = clamp(
      Number.isFinite(timerLimit) ? timerLimit : (timerLimitStore ?? 120),
      10,
      600,
    );

    settingsSet("startingHp", hp);
    settingsSet("playersCount", count);
    settingsSet("timerLimit", timer);

    // Tomá solo tantos invocadores como 'count'
    const selected = players.slice(0, count).map((p, i) => ({
      id: p.id, // si no tenés id en el modal, podés omitirlo
      name: p.name?.trim() || `P${i + 1}`,
      color: p.color,
    }));

    // 🔹 Resetea la partida con los invocadores definidos
    resetMatchWithPlayers(hp, selected, {
      startingHp: hp,
      playersCount: count,
      timerLimit: timer,
    });

    onSaved?.(hp, count);
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

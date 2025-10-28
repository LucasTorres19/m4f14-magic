"use client";

import { useCurrentMatch } from "@/app/_stores/use-current-match";
import { useSettings } from "@/app/_stores/use-settings";
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
import { randomHexColor } from "@/utils/random";
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

  React.useEffect(() => {
    if (isOpen) {
      setStartingHp(startingHpStore ?? 40);
      setPlayersCount(playersCountStore ?? 4);
    }
  }, [isOpen, startingHpStore, playersCountStore]);

  React.useEffect(() => {
    setPlayers((prev) => {
      const next: Player[] = [];
      for (let i = 0; i < playersCount; i++) {
        const existing = prev[i];
        next.push({
          id: existing?.id ?? `player-${i + 1}`,
          name: existing?.name ?? `invocador ${i + 1}`,
          hp: startingHp,
          color: existing?.color ?? randomHexColor(),
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

    settingsSet("startingHp", hp);
    settingsSet("playersCount", count);

    // Tomá solo tantos invocadores como 'count'
    const selected = players.slice(0, count).map((p, i) => ({
      id: p.id, // si no tenés id en el modal, podés omitirlo
      name: p.name?.trim() || `P${i + 1}`,
      color: p.color,
    }));

    // 🔹 Resetea la partida con los invocadores definidos
    resetMatchWithPlayers(hp, selected);

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
            <Label htmlFor="playersCount" className="col-span-2">
              invocadores
            </Label>
            <Input
              id="playersCount"
              type="number"
              min={minPlayers}
              max={maxPlayers}
              value={playersCount}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                setPlayersCount(Number.isFinite(n) ? n : minPlayers);
              }}
              className="col-span-2"
            />
          </div>

          {/* Nombres y colores opcionales */}
          <div className="flex flex-col gap-4">
            <Label className="col-span-4 text-center">
              Configuracion de los magistas
            </Label>
            {players.map((p, i) => (
              <div className="flex flex-row gap-2" key={p.id}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`playerName_${i}`}>Nombre</Label>
                  <Input
                    id={`playerName_${i}`}
                    type="text"
                    value={p.name}
                    onChange={(e) =>
                      setPlayers((prev) =>
                        prev.map((pp, idx) =>
                          idx === i ? { ...pp, name: e.target.value } : pp,
                        ),
                      )
                    }
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={`playerColor_${i}`}>Color</Label>
                  <Input
                    id={`playerColor_${i}`}
                    type="color"
                    value={p.color || "#000000"} // ✅ color válido siempre
                    className="w-[150px]"
                    onChange={(e) =>
                      setPlayers((prev) =>
                        prev.map((pp, idx) =>
                          idx === i ? { ...pp, color: e.target.value } : pp,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}
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

"use client";

import Wizard from "@/app/_icons/wizard.svg";
import { CommanderCombobox } from "@/components/commander-combobox";
import { PlayerCombobox } from "@/components/player-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/trpc/react";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useCurrentMatch } from "../_stores/current-match-provider";
import { useSettings } from "../_stores/settings-provider";

export default function PlayersDialog() {
  const { players, updatePlayer, addPlayer, removePlayer } = useCurrentMatch(
    useShallow((state) => ({
      players: state.players,
      updatePlayer: state.updatePlayer,
      addPlayer: state.addPlayer,
      removePlayer: state.removePlayer,
    })),
  );
  const settings = useSettings((s) => s);

  const playersQuery = api.players.findAll.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });
  const playerSuggestions = useMemo(
    () => playersQuery.data ?? [],
    [playersQuery.data],
  );
  const [dragging, setDragging] = useState<{
    id: string;
    pointerId: number;
    startX: number;
  } | null>(null);
  const [offsets, setOffsets] = useState<Record<string, number>>({});

  useEffect(() => {
    setOffsets((previous) => {
      const next: Record<string, number> = {};
      for (const player of players) {
        next[player.id] = previous[player.id] ?? 0;
      }
      return next;
    });
  }, [players]);

  const handlePointerDown = useCallback(
    (playerId: string, event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, input, textarea, select, [data-no-drag]")) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging({
        id: playerId,
        pointerId: event.pointerId,
        startX: event.clientX,
      });
    },
    [],
  );

  const handlePointerMove = useCallback(
    (playerId: string, event: React.PointerEvent<HTMLDivElement>) => {
      if (dragging?.id !== playerId || dragging.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragging.startX;
      setOffsets((previous) => ({
        ...previous,
        [playerId]: deltaX,
      }));
    },
    [dragging],
  );

  const handlePointerEnd = useCallback(
    (playerId: string, event: React.PointerEvent<HTMLDivElement>) => {
      if (dragging?.id !== playerId || dragging.pointerId !== event.pointerId) {
        return;
      }

      event.currentTarget.releasePointerCapture(event.pointerId);

      const offset = offsets[playerId] ?? 0;
      const shouldRemove = Math.abs(offset) > 100 && players.length > 2;

      setDragging(null);

      if (shouldRemove) {
        setOffsets((previous) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [playerId]: _, ...rest } = previous;
          return rest;
        });
        removePlayer(playerId);
        return;
      }

      setOffsets((previous) => ({
        ...previous,
        [playerId]: 0,
      }));
    },
    [dragging, offsets, players.length, removePlayer],
  );

  const handlePointerCancel = useCallback(
    (playerId: string, event: React.PointerEvent<HTMLDivElement>) => {
      if (dragging?.id !== playerId || dragging.pointerId !== event.pointerId) {
        return;
      }

      event.currentTarget.releasePointerCapture(event.pointerId);
      setDragging(null);
      setOffsets((previous) => ({
        ...previous,
        [playerId]: 0,
      }));
    },
    [dragging],
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" className="pointer-events-auto px-4">
          <Wizard className="size-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] sm:max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>Invocadores</DialogTitle>
          <DialogDescription>
            Ajusta a los invocadores antes de comenzar la partida.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-96">
          <div className="flex flex-col gap-4">
            {players.map((player, index) => (
              <div
                key={player.id}
                className="relative"
                style={{
                  transform: `translateX(${offsets[player.id] ?? 0}px)`,
                  transition:
                    dragging?.id === player.id ? "none" : "transform 0.2s ease",
                  touchAction: dragging?.id === player.id ? "none" : "pan-y",
                }}
                onPointerDown={(event) => handlePointerDown(player.id, event)}
                onPointerMove={(event) => handlePointerMove(player.id, event)}
                onPointerUp={(event) => handlePointerEnd(player.id, event)}
                onPointerCancel={(event) =>
                  handlePointerCancel(player.id, event)
                }
              >
                <div className="border-border/40 relative flex flex-col gap-4 rounded-lg border bg-background p-3">
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">Nombre</Label>
                      <PlayerCombobox
                        className="grow"
                        value={{
                          id: player.playerId ?? null,
                          name: player.displayName,
                          backgroundColor: player.backgroundColor,
                        }}
                        onChange={(selection) =>
                          updatePlayer(player.id, {
                            displayName: selection.name,
                            playerId: selection.id ?? null,
                          })
                        }
                        placeholder="Elegi o escribi un invocador"
                        ariaLabel={`Nombre del invocador ${index + 1}`}
                        suggestions={playerSuggestions}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">Comandante</Label>
                      <CommanderCombobox
                        className="grow"
                        value={player.commander}
                        onSelect={(commander) =>
                          updatePlayer(player.id, { commander })
                        }
                        placeholder="Elegi un comandante"
                        playerId={player.playerId ?? null}
                        ariaLabel={`Comandante del invocador ${index + 1}`}
                      />
                    </div>

                    <div className="flex flex-col gap-2 sm:items-center sm:justify-end">
                      <Label
                        htmlFor={`playerColor_${index}`}
                        className="text-sm font-medium"
                      >
                        Color
                      </Label>
                      <Input
                        id={`playerColor_${index}`}
                        type="color"
                        value={player.backgroundColor}
                        className="h-10 w-full sm:w-24"
                        onChange={(event) =>
                          updatePlayer(player.id, {
                            backgroundColor: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {players.length > 2 ? (
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold uppercase tracking-wide text-destructive/80 sm:right-auto sm:left-3">
                      <span
                        className={`transition-opacity duration-200 ${
                          Math.abs(offsets[player.id] ?? 0) > 40
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                      >
                        Desliza para eliminar
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => addPlayer(settings)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 size-4" />
            Agregar invocador
          </Button>

          <DialogClose asChild>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
            >
              Cerrar
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

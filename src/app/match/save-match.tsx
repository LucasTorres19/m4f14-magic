"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { Trophy, GripVertical, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useCurrentMatch } from "../_stores/use-current-match";
import { useSettings } from "../_stores/use-settings";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type RankedPlayer = {
  id: string;
  displayName: string;
  backgroundColor: string;
  hp: number;
};

type OrderedPlayer = Pick<
  RankedPlayer,
  "id" | "displayName" | "backgroundColor"
>;

function computeInitialRanking(
  players: RankedPlayer[],
  hpHistory: Array<{ playerId: string; currentHp: number }>,
) {
  const eliminationOrder = new Map<string, number>();

  hpHistory.forEach((entry, index) => {
    if (entry.currentHp <= 0 && !eliminationOrder.has(entry.playerId)) {
      eliminationOrder.set(entry.playerId, index);
    }
  });

  const sorted = [...players].sort((a, b) => {
    const aliveA = a.hp > 0;
    const aliveB = b.hp > 0;

    if (aliveA !== aliveB) return aliveA ? -1 : 1;

    const elimA = eliminationOrder.get(a.id);
    const elimB = eliminationOrder.get(b.id);

    const scoreA =
      elimA === undefined
        ? aliveA
          ? Number.POSITIVE_INFINITY
          : Number.NEGATIVE_INFINITY
        : elimA;
    const scoreB =
      elimB === undefined
        ? aliveB
          ? Number.POSITIVE_INFINITY
          : Number.NEGATIVE_INFINITY
        : elimB;

    if (scoreA !== scoreB) return scoreB - scoreA;

    return b.hp - a.hp;
  });

  return sorted.map<OrderedPlayer>((player) => ({
    id: player.id,
    displayName: player.displayName,
    backgroundColor: player.backgroundColor,
  }));
}

export default function SaveMatch() {
  const { players, hpHistory, resetMatch } = useCurrentMatch(
    useShallow((state) => ({
      players: state.players,
      hpHistory: state.hpHistory,
      resetMatch: state.resetMatch,
    })),
  );

  const { startingHp, playersCount } = useSettings(
    useShallow((state) => ({
      startingHp: state.startingHp,
      playersCount: state.playersCount,
    })),
  );

  const isMatchFinished = useMemo(
    () => players.filter((player) => player.hp > 0).length === 1,
    [players],
  );

  const initialOrder = useMemo(
    () => computeInitialRanking(players, hpHistory),
    [players, hpHistory],
  );

  const [open, setOpen] = useState(false);
  const [orderedPlayers, setOrderedPlayers] =
    useState<OrderedPlayer[]>(initialOrder);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activePointer, setActivePointer] = useState<{
    pointerId: number;
    playerId: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setOrderedPlayers(initialOrder);
      setDraggingId(null);
      setActivePointer(null);
    }
  }, [initialOrder, open]);

  useEffect(() => {
    if (open) {
      setOrderedPlayers(initialOrder);
      setErrorMessage(null);
      setDraggingId(null);
      setActivePointer(null);
    }
  }, [open, initialOrder]);

  const matchSave = api.match.save.useMutation({
    onSuccess: () => {
      toast.success("Partida guardada");
      resetMatch(startingHp, playersCount);
    },
  });

  const handleDisplayNameChange = useCallback(
    (id: string, value: string) => {
      setOrderedPlayers((previous) =>
        previous.map((player) =>
          player.id === id ? { ...player, displayName: value } : player,
        ),
      );
      setErrorMessage(null);
    },
    [setErrorMessage],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (matchSave.isPending) return;

      try {
        const sanitizedPlayers = orderedPlayers.map((player, index) => ({
          name: player.displayName.trim(),
          backgroundColor: player.backgroundColor,
          placement: index + 1,
        }));

        const hasEmptyNames = sanitizedPlayers.some(
          (player) => player.name.length === 0,
        );
        if (hasEmptyNames) {
          setErrorMessage("Todos los invocadores necesitan un nombre.");
          return;
        }

        const hasDuplicateNames =
          new Set(sanitizedPlayers.map((player) => player.name)).size !==
          sanitizedPlayers.length;
        if (hasDuplicateNames) {
          setErrorMessage("Cada invocador debe tener un nombre unico.");
          return;
        }

        setErrorMessage(null);

        await matchSave.mutateAsync({
          startingHp,
          players: sanitizedPlayers,
        });

        setOpen(false);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No pudimos guardar la partida. Intenta nuevamente.",
        );
        console.error(error);
      }
    },
    [matchSave, orderedPlayers, startingHp],
  );

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLLIElement>, id: string) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, button, textarea, select, [contenteditable='true']",
        )
      ) {
        event.preventDefault();
        return;
      }

      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
      setDraggingId(id);
    },
    [],
  );

  const reorderPlayers = useCallback(
    (sourceId: string, targetId: string | null) => {
      setOrderedPlayers((previous) => {
        const sourceIndex = previous.findIndex(
          (player) => player.id === sourceId,
        );
        if (sourceIndex === -1) return previous;

        if (targetId === null) {
          if (sourceIndex === previous.length - 1) return previous;
          const updated = [...previous];
          const [moved] = updated.splice(sourceIndex, 1);
          if (moved) updated.push(moved);
          return updated;
        }

        const targetIndexOriginal = previous.findIndex(
          (player) => player.id === targetId,
        );
        if (targetIndexOriginal === -1) return previous;

        if (
          sourceIndex === targetIndexOriginal ||
          sourceIndex === targetIndexOriginal - 1
        ) {
          return previous;
        }

        const updated = [...previous];
        const [moved] = updated.splice(sourceIndex, 1);
        const targetIndexAdjusted =
          sourceIndex < targetIndexOriginal
            ? targetIndexOriginal - 1
            : targetIndexOriginal;
        if (moved) updated.splice(targetIndexAdjusted, 0, moved);
        return updated;
      });
    },
    [],
  );

  const handleDragOverItem = useCallback(
    (event: DragEvent<HTMLLIElement>, targetId: string) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (!draggingId || draggingId === targetId) return;
      reorderPlayers(draggingId, targetId);
    },
    [draggingId, reorderPlayers],
  );

  const handleDropItem = useCallback(
    (event: DragEvent<HTMLLIElement>, targetId: string) => {
      event.preventDefault();
      const droppedId = event.dataTransfer.getData("text/plain") || draggingId;
      if (droppedId && droppedId !== targetId) {
        reorderPlayers(droppedId, targetId);
      }
      setDraggingId(null);
    },
    [draggingId, reorderPlayers],
  );

  const handleDropToEnd = useCallback(
    (event: DragEvent<HTMLLIElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const droppedId = event.dataTransfer.getData("text/plain") || draggingId;
      if (!droppedId) return;
      reorderPlayers(droppedId, null);
      setDraggingId(null);
    },
    [draggingId, reorderPlayers],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLLIElement>, playerId: string) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, button, textarea, select, [contenteditable='true']",
        )
      ) {
        return;
      }

      if (event.pointerType === "mouse") return;
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Some browsers might not support pointer capture on this element.
      }
      setActivePointer({ pointerId: event.pointerId, playerId });
      setDraggingId(playerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLLIElement>) => {
      if (!activePointer || activePointer.pointerId !== event.pointerId) return;
      if (event.pointerType === "mouse") return;
      if (typeof window === "undefined" || typeof document === "undefined")
        return;

      event.preventDefault();

      const targetElement = document.elementFromPoint(
        event.clientX,
        event.clientY,
      );
      if (!targetElement) return;

      const dropTarget = targetElement.closest(
        "[data-player-id]",
      ) as HTMLElement | null;
      if (!dropTarget) return;

      const targetId = dropTarget.dataset.playerId ?? null;
      if (!targetId || targetId === activePointer.playerId) return;

      if (targetId === "__drop-end") {
        reorderPlayers(activePointer.playerId, null);
        return;
      }

      reorderPlayers(activePointer.playerId, targetId);
    },
    [activePointer, reorderPlayers],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLLIElement>) => {
      if (!activePointer || activePointer.pointerId !== event.pointerId) return;
      if (event.pointerType === "mouse") return;

      event.preventDefault();
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Ignore if pointer capture is not supported.
      }
      setActivePointer(null);
      setDraggingId(null);
    },
    [activePointer],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  if (!isMatchFinished) return null;

  const orderedWithPlacements = orderedPlayers.map((player, index) => {
    const initials = player.displayName.trim().slice(0, 2).toUpperCase();
    return {
      ...player,
      placement: index + 1,
      initials: initials.length > 0 ? initials : "??",
    };
  });

  return (
    <div className="absolute right-0">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="success"
            size="sm"
            className="pointer-events-auto"
            disabled={matchSave.isPending}
          >
            {matchSave.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save />
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar partida</DialogTitle>
            <DialogDescription>
              Ajustá el podio arrastrando a los invocadores si queres cambiar la
              posicion final.
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <ul className="flex flex-col gap-2">
              {orderedWithPlacements.map((player) => (
                <li
                  key={player.id}
                  draggable
                  onDragStart={(event) => handleDragStart(event, player.id)}
                  onDrop={(event) => handleDropItem(event, player.id)}
                  onDragOver={(event) => handleDragOverItem(event, player.id)}
                  onPointerDown={(event) => handlePointerDown(event, player.id)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onDragEnd={handleDragEnd}
                  data-player-id={player.id}
                  style={{ touchAction: "none" }}
                  className={cn(
                    "border-border bg-muted/50 flex cursor-grab touch-none items-center gap-3 rounded-lg border px-3 py-2 transition-colors active:cursor-grabbing",
                    draggingId === player.id && "opacity-60",
                  )}
                >
                  <span className="w-[1ch] text-lg font-semibold">
                    {player.placement}
                  </span>

                  <div
                    className="text-background flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                    style={{ backgroundColor: player.backgroundColor }}
                  >
                    {player.initials}
                  </div>

                  <div className="flex grow flex-col gap-1">
                    <Input
                      value={player.displayName}
                      onChange={(event) =>
                        handleDisplayNameChange(player.id, event.target.value)
                      }
                      aria-label={`Nombre del invocador en posicion ${player.placement}`}
                      placeholder="Nombre del invocador"
                      className="h-8 w-full px-2 text-sm"
                    />
                  </div>

                  <GripVertical className="text-muted-foreground size-4" />
                </li>
              ))}
              <li
                onDrop={handleDropToEnd}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                data-player-id="__drop-end"
                style={{ touchAction: "none" }}
                className="border-border/70 text-muted-foreground flex touch-none items-center justify-center rounded-lg border border-dashed px-3 py-2 text-xs"
              >
                Soltá acá para mover al final
              </li>
            </ul>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={matchSave.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={matchSave.isPending}>
                {matchSave.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Guardar
              </Button>
            </DialogFooter>

            {errorMessage ? (
              <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                {errorMessage}
              </p>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

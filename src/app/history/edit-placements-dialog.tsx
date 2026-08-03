"use client";

import { ArrowDown, ArrowUp, Loader2, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { PlayerSummary } from "./history-types";

type EditPlacementsDialogProps = {
  matchId: number;
  players: PlayerSummary[];
  onSaved: (players: PlayerSummary[]) => void;
};

const toInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("") || "??";

export default function EditPlacementsDialog({
  matchId,
  players,
  onSaved,
}: EditPlacementsDialogProps) {
  const [open, setOpen] = useState(false);
  const [ordered, setOrdered] = useState<PlayerSummary[]>(() =>
    [...players].sort((a, b) => a.placement - b.placement),
  );
  const utils = api.useUtils();

  const mutation = api.match.updatePlacements.useMutation({
    onSuccess: (res) => {
      const byId = new Map(res.placements.map((p) => [p.playerId, p.placement]));
      const next = [...players]
        .map((player) => ({
          ...player,
          placement: byId.get(player.id) ?? player.placement,
        }))
        .sort((a, b) => a.placement - b.placement);
      onSaved(next);
      void utils.matches.findAll.invalidate();
      toast.success("Posiciones actualizadas");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message ?? "No se pudieron guardar las posiciones");
    },
  });

  useEffect(() => {
    if (open) {
      setOrdered([...players].sort((a, b) => a.placement - b.placement));
    }
  }, [open, players]);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    setOrdered((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      if (!item) return prev;
      next.splice(target, 0, item);
      return next;
    });
  };

  const handleSave = () => {
    mutation.mutate({
      matchId,
      placements: ordered.map((player, index) => ({
        playerId: player.id,
        placement: index + 1,
      })),
    });
  };

  if (players.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <Trophy className="size-4" />
          Editar posiciones
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar posiciones</DialogTitle>
          <DialogDescription>
            Reordená el podio con las flechas. El primero es el campeón.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2 py-2">
          {ordered.map((player, index) => {
            const safeName = player.name ?? "Invocador desconocido";
            return (
              <li
                key={player.id}
                className={cn(
                  "border-border bg-muted/50 flex items-center gap-3 rounded-lg border px-3 py-2",
                  index === 0 && "ring-1 ring-amber-300/50",
                )}
              >
                <span className="w-[1.5ch] shrink-0 text-lg font-semibold">
                  {index + 1}
                </span>
                <div
                  className="text-background flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={{ backgroundColor: player.backgroundColor }}
                >
                  {toInitials(safeName)}
                </div>
                <div className="min-w-0 grow">
                  <p className="truncate font-medium">{safeName}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {player.commander?.name ?? "Sin comandante"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={index === 0 || mutation.isPending}
                    onClick={() => move(index, -1)}
                    aria-label={`Subir a ${safeName}`}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={
                      index === ordered.length - 1 || mutation.isPending
                    }
                    onClick={() => move(index, 1)}
                    aria-label={`Bajar a ${safeName}`}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>

        <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

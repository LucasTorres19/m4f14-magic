"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, ChevronUp, ChevronDown, Users, Swords, Trophy, Boxes, Flame } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ApiPlayer = {
  id: number;
  name: string | null;
  backgroundColor: string | null;
  matchCount?: number | string | null;
  wins?: number | string | null;
  podiums?: number | string | null;
  isLastWinner?: boolean | null;
  isStreakChampion?: boolean | null;
  topDecks?: { commanderId: number; name: string | null; artImageUrl: string | null; count: number | string | null }[];
};

type PlayerUI = Required<Pick<ApiPlayer, "id">> & {
  name: string;
  backgroundColor: string;
  matchCount: number;
  wins: number;
  podiums: number;
  isLastWinner: boolean;
  isStreakChampion: boolean;
  topDecks: { commanderId: number; name: string; artImageUrl: string | null; count: number }[];
};

export default function SummonerPage() {
  const { data, isLoading, isError } = api.players.listWithStats.useQuery();
  const utils = api.useUtils();
  const [colorDialog, setColorDialog] = useState<
    { id: number; name: string; color: string } | null
  >(null);
  const [colorInput, setColorInput] = useState<string>("#000000");
  const updateColor = api.players.updateColor.useMutation({
    onSuccess: async () => {
      toast.success("Color actualizado");
      await utils.players.listWithStats.invalidate();
      setColorDialog(null);
    },
    onError: (e) => {
      toast.error(e?.message ?? "No se pudo actualizar el color");
    },
  });

  const list = useMemo<PlayerUI[]>(() => {
    const rows = (data ?? []) as ApiPlayer[];
    return rows.map((p) => ({
      id: p.id,
      name: (p.name ?? "Sin nombre").trim(),
      backgroundColor: p.backgroundColor ?? "#CBD5E1",
      matchCount: Number(p.matchCount ?? 0),
      wins: Number(p.wins ?? 0),
      podiums: Number(p.podiums ?? 0),
      isLastWinner: Boolean(p.isLastWinner),
      isStreakChampion: Boolean(p.isStreakChampion),
      topDecks: (p.topDecks ?? []).map((d) => ({
        commanderId: d.commanderId,
        name: (d.name ?? "Desconocido").trim(),
        artImageUrl: d.artImageUrl ?? null,
        count: Number(d.count ?? 0),
      })),
    }));
  }, [data]);

  type SortKey = "name" | "id" | "winrate" | "matches";
  type SortDir = "asc" | "desc";

  const [sortKey, setSortKey] = useState<SortKey>("winrate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const collator = useMemo(
    () => new Intl.Collator("es", { sensitivity: "base" }),
    [],
  );

  const winrate = (w: number, t: number) => (t > 0 ? (w / t) * 100 : 0);
  const podiumPct = (p: number, t: number) => (t > 0 ? (p / t) * 100 : 0);

  const sorted = useMemo(() => {
    const arr = [...list];
    arr.sort((a, b) => {
      if (sortKey === "name") {
        const cmp = collator.compare(a.name, b.name);
        return sortDir === "asc" ? cmp : -cmp;
      }

      let va = 0;
      let vb = 0;
      if (sortKey === "id") {
        va = a.id;
        vb = b.id;
      } else if (sortKey === "matches") {
        va = a.matchCount;
        vb = b.matchCount;
      } else {
        va = winrate(a.wins, a.matchCount);
        vb = winrate(b.wins, b.matchCount);
      }
      const cmp = va === vb ? collator.compare(a.name, b.name) : va < vb ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [list, sortKey, sortDir, collator]);

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="mb-4 bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al menú
              </Button>
            </Link>
            <h1 className="text-2xl md:text-5xl font-bold mb-2">Invocadores</h1>
            <p className="text-muted-foreground">

            </p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm text-muted-foreground tracking-widest flex">
              <Users className="mr-2 h-4 w-4" /> Grandes magos
            </p>
          </div>
        </div>

        {isLoading && (
          <div
            className="flex items-center justify-center gap-3 py-20 text-muted-foreground"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Users className="w-20 h-20 animate-pulse" />
          </div>
        )}

        {isError && (
          <div className="text-center py-20 text-destructive">
            Error al cargar los jugadores.
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <div className="mb-4 flex items-center justify-end gap-2">
              <label htmlFor="sortKey" className="text-sm text-muted-foreground">
                Ordenar por:
              </label>
              <select
                id="sortKey"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="name">Nombre</option>
                <option value="matches">Partidas</option>
                <option value="winrate">Winrate</option>
                <option value="id">Registro</option>
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="ml-2"
                title={sortDir === "asc" ? "Ascendente" : "Descendente"}
              >
                {sortDir === "asc" ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            <TooltipProvider>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sorted.map((player) => (
                  <Card
                    key={player.id}
                    className="overflow-hidden group hover:ring-2 hover:ring-primary transition-all"
                  >
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg leading-tight">
                          {player.name}
                        </h3>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 rounded-full border cursor-pointer"
                              style={{ backgroundColor: player.backgroundColor }}
                              title={player.backgroundColor}
                              aria-label={`Cambiar color de ${player.name}`}
                              onClick={() => {
                                setColorInput(player.backgroundColor);
                                setColorDialog({
                                  id: player.id,
                                  name: player.name,
                                  color: player.backgroundColor,
                                });
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            Cambiar color: {player.backgroundColor}
                          </TooltipContent>
                        </Tooltip>

                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1 py-1 px-2 rounded-full bg-primary/10 text-primary">
                          <Swords className="h-4 w-4 mr-1" /> {player.matchCount} partidas
                        </span>
                        <span className="inline-flex items-center gap-1 py-1 px-2 rounded-full bg-primary/10 text-primary">
                          <Trophy className="h-4 w-4 mr-1" /> {Math.round(winrate(player.wins, player.matchCount))}% winrate
                        </span>
                        <span className="inline-flex items-center gap-1 py-1 px-2 rounded-full bg-primary/10 text-primary">
                          <Boxes className="h-4 w-4 mr-1" /> {Math.round(podiumPct(player.podiums, player.matchCount))}% podio
                        </span>

                          {player.isLastWinner && (
                            <span className="text-[11px] py-1 rounded-full bg-emerald-500/15 text-emerald-600 flex w-fit items-center px-3 font-semibold">
                              <Trophy className="mr-1 h-4 w-4" /> Último ganador
                            </span>
                          )}
                          {player.isStreakChampion && (
                            <span className="text-[11px] py-1 rounded-full bg-amber-500/15 text-amber-600 flex w-fit items-center px-3 font-semibold">
                              <Flame className="mr-1 h-4 w-4" /> Racha actual
                            </span>
                          )}

                      </div>


                      {player.topDecks.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium mb-1">Comandantes mas jugados</p>
                          <ul className="text-sm text-muted-foreground space-y-2">
                            {player.topDecks.map((d, idx) => (
                              <li
                                key={`${player.id}-${d.commanderId}-${idx}`}
                                className="flex items-center justify-between gap-3"
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  {d.artImageUrl ? (
                                    <Image
                                      src={d.artImageUrl}
                                      alt={d.name}
                                      width={28}
                                      height={40}
                                      className="rounded-sm object-cover h-10 w-7 shrink-0"
                                      unoptimized
                                    />
                                  ) : (
                                    <span className="h-10 w-7 bg-muted rounded-sm shrink-0" />
                                  )}
                                  <span className="truncate">{idx + 1}. {d.name}</span>
                                </span>
                                <span className="ml-3 text-xs whitespace-nowrap">{d.count} partidas</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </TooltipProvider>

            {sorted.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">
                  No hay jugadores cargados.
                </p>
              </div>
            )}
          </>
        )}
      </div>
      <ColorDialog
        data={colorDialog ? { id: colorDialog.id, name: colorDialog.name } : null}
        value={colorInput}
        setValue={setColorInput}
        onClose={() => setColorDialog(null)}
        onConfirm={() => {
          if (!colorDialog) return;
          updateColor.mutate({ playerId: colorDialog.id, color: colorInput });
        }}
      />
    </div>
  );
}

function ColorDialog({
  data,
  onClose,
  onConfirm,
  value,
  setValue,
}: {
  data: { id: number; name: string } | null;
  value: string;
  setValue: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={!!data} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar color</DialogTitle>
          <DialogDescription>
            Ajusta el color de fondo del invocador {data?.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 items-center gap-3">
            <Label htmlFor="colorPicker">Selector</Label>
            <Input
              id="colorPicker"
              type="color"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-9 w-16 p-1"
              aria-label="Selector de color"
            />
          </div>
          <div className="grid grid-cols-2 items-center gap-3">
            <Label htmlFor="colorHex">Hex</Label>
            <Input
              id="colorHex"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="#000000"
              aria-label="Código de color en HEX"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

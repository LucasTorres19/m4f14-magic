"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Swords, Trophy, Boxes, Droplets, Users, Layers, Flame, ChevronDown, ChevronUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CommanderRow = {
  commanderId: number;
  name: string | null;
  matchCount: number | null;
  wins: number | null;
  podiums: number | null;
  imageUrl?: string | null;
  artImageUrl?: string | null;
};

type PlayerDetail = {
  id: number;
  name: string | null;
  backgroundColor?: string | null;
  commanders: CommanderRow[];
};

type PlayerListStatsRow = {
  id: number;
  matchCount: number;
  wins: number;
  podiums: number;
  isCebollita?: boolean;
  isLastWinner?: boolean;
  isStreakChampion?: boolean;
  isMostDiverse?: boolean;
  uniqueCommanderCount?: number;
};

type HistoryCommander = {
  name?: string | null;
  imageUrl?: string | null;
  artImageUrl?: string | null;
};

type HistoryPlayer = {
  playerId: number;
  name: string;
  placement: number;
  backgroundColor?: string | null;
  commander?: HistoryCommander | null;
};

type HistoryEntry = {
  matchId: number;
  createdAt: number; // epoch ms
  startingHp?: number | null;
  players: HistoryPlayer[];
  self?: { commander?: HistoryCommander | null; placement?: number | null } | null;
  image?: { url: string } | null;
  croppedImage?: { url: string } | null;
};

export default function SummonerDetailPage() {
  const params = useParams();
  const idParam = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string | undefined);
  const playerId = useMemo(() => {
    const n = Number(idParam);
    return Number.isFinite(n) ? n : NaN;
  }, [idParam]);

  const { data: rawDetail, isLoading, isError } = api.players.detail.useQuery(
    { playerId },
    { enabled: Number.isFinite(playerId) }
  );
  const detail = rawDetail as unknown as PlayerDetail | undefined;

  const { data: rawListStats } = api.players.listWithStats.useQuery(undefined, { refetchOnWindowFocus: false });
  const listStats = (rawListStats ?? []) as PlayerListStatsRow[];
  const playerStats = useMemo(
    () => listStats.find((r) => r.id === playerId),
    [listStats, playerId]
  );

  const pct = (num?: number | null, den?: number | null) =>
    den && den > 0 ? Math.round(((num ?? 0) / den) * 100) : 0;

  type SortKey = "name" | "matches" | "winrate" | "podio";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("winrate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const collator = useMemo(() => new Intl.Collator("es", { sensitivity: "base" }), []);
  const winrate = (w: number, t: number) => (t > 0 ? (w / t) * 100 : 0);

  const sortedRows = useMemo(() => {
    const rows = [...(detail?.commanders ?? [])];
    rows.sort((a, b) => {
      if (sortKey === "name") {
        const cmp = collator.compare(a.name ?? "", b.name ?? "");
        return sortDir === "asc" ? cmp : -cmp;
      }
      let va = 0,
        vb = 0;
      if (sortKey === "matches") {
        va = a.matchCount ?? 0;
        vb = b.matchCount ?? 0;
      } else if (sortKey === "winrate") {
        va = winrate(a.wins ?? 0, a.matchCount ?? 0);
        vb = winrate(b.wins ?? 0, b.matchCount ?? 0);
      } else {
        va = (a.podiums ?? 0) / Math.max(1, a.matchCount ?? 0);
        vb = (b.podiums ?? 0) / Math.max(1, b.matchCount ?? 0);
      }
      if (va === vb) {
        const byName = collator.compare(a.name ?? "", b.name ?? "");
        if (byName !== 0) return byName;
        return (a.commanderId ?? 0) - (b.commanderId ?? 0);
      }
      const cmp = va < vb ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [detail?.commanders, sortKey, sortDir, collator]);

  const { data: rawHistory, isLoading: historyLoading } = api.players.history.useQuery(
    { playerId, limit: 100 },
    { enabled: Number.isFinite(playerId) }
  );

  const history = useMemo<HistoryEntry[]>(() => {
    if (!Array.isArray(rawHistory)) return [];

    return rawHistory.map((h) => ({
      matchId: h.matchId,
      createdAt:
        h.createdAt instanceof Date
          ? h.createdAt.getTime()
          : typeof h.createdAt === "number"
          ? h.createdAt
          : Date.parse(String(h.createdAt)),
      startingHp: h.startingHp ?? null,
      self: h.self ?? null,
      image: h.image ?? null,
      croppedImage: h.croppedImage ?? null,
      players: h.players ?? [],
    }));
  }, [rawHistory]);

  const [openMatchId, setOpenMatchId] = useState<number | null>(null);
  const openEntry = useMemo(
    () => history?.find((h) => h.matchId === openMatchId) ?? null,
    [history, openMatchId]
  );
  const fmt = (ts?: number | null) => (ts ? new Date(ts).toLocaleString() : "");

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/summoner">
              <Button variant="outline" size="sm" className="mb-4 bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver al menú
              </Button>
            </Link>
            {detail && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-5xl font-bold mb-2">{detail.name ?? `#${detail.id}`}</h1>
                  <span
                    className="inline-flex h-4 w-4 rounded-full border"
                    style={{ backgroundColor: detail.backgroundColor ?? "#CBD5E1" }}
                    aria-hidden
                  />
                </div>
                {playerStats && (
                  <TooltipProvider>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {Boolean(playerStats.isMostDiverse) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[11px] py-1 rounded-full bg-indigo-500/15 text-indigo-600 flex w-fit items-center px-3 font-semibold">
                              <Layers className="mr-1 h-4 w-4" /> Mas comandantes distintos
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="center">
                            {playerStats.uniqueCommanderCount} comandantes diferentes
                          </TooltipContent>
                        </Tooltip>
                      )}

                      <span className="inline-flex items-center gap-1 py-1 px-2 rounded-full bg-primary/10 text-primary">
                        <Swords className="h-4 w-4 mr-1" /> {playerStats.matchCount} partidas
                      </span>
                      <span className="inline-flex items-center gap-1 py-1 px-2 rounded-full bg-primary/10 text-primary">
                        <Trophy className="h-4 w-4 mr-1" /> {pct(playerStats.wins, playerStats.matchCount)}% winrate
                      </span>
                      <span className="inline-flex items-center gap-1 py-1 px-2 rounded-full bg-primary/10 text-primary">
                        <Boxes className="h-4 w-4 mr-1" /> {pct(playerStats.podiums, playerStats.matchCount)}% podio
                      </span>

                      {Boolean(playerStats.isCebollita) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cebolla-badge" role="img" aria-label="Cebollita">
                              <Droplets width={16} height={16} className="tear" />
                              <span className="label">Cebollita</span>
                              <span aria-hidden className="blue-heat" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="center" className="max-w-[280px] leading-relaxed">
                            <p className="font-semibold">¿Cebollita?</p>
                            <p className="text-sm">Mayor cantidad de segundos puestos.</p>
                            <div className="mt-2 text-xs">
                              cantidad:{" "}
                              <strong>
                                {Math.max(0, (playerStats.podiums ?? 0) - (playerStats.wins ?? 0))}
                              </strong>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {Boolean(playerStats.isLastWinner) && (
                        <span className="text-[11px] py-1 rounded-full bg-emerald-500/15 text-emerald-600 flex w-fit items-center px-3 font-semibold">
                          <Trophy className="mr-1 h-4 w-4" /> Último ganador
                        </span>
                      )}
                      {Boolean(playerStats.isStreakChampion) && (
                        <span className="text-[11px] py-1 rounded-full bg-amber-500/15 text-amber-600 flex w-fit items-center px-3 font-semibold">
                          <Flame className="mr-1 h-4 w-4" /> Racha actual
                        </span>
                      )}
                    </div>
                  </TooltipProvider>
                )}
              </div>
            )}
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

        {isError && <div className="text-center py-20 text-destructive">Error al cargar el invocador.</div>}

        {!isLoading && !isError && !detail && <div className="text-center py-20">Jugador no encontrado.</div>}

        {!isLoading && !isError && detail && (
          <>
            <div className="mb-3 flex items-start gap-5 md:gap-0 md:items-center justify-between flex-col md:flex-row">
              <h2 className="text-xl font-semibold">Comandantes jugados</h2>
              <div className="flex items-center gap-2">
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
                  <option value="podio">Podio</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  title={sortDir === "asc" ? "Ascendente" : "Descendente"}
                >
                  {sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Card className="p-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3">Foto</th>
                    <th className="py-2 pr-3">Comandante</th>
                    <th className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1">
                        <Swords className="h-4 w-4" /> Partidas
                      </span>
                    </th>
                    <th className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="h-4 w-4" /> Winrate
                      </span>
                    </th>
                    <th className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1">
                        <Boxes className="h-4 w-4" /> Podios
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr key={row.commanderId} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-3">
                        <div className="relative h-12 w-12 rounded overflow-hidden bg-muted">
                          <Image
                            src={row.artImageUrl ?? row.imageUrl ?? "/placeholder.svg"}
                            alt={row.name ?? "Commander"}
                            fill
                            className="object-cover"
                            sizes="48px"
                            unoptimized
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-medium">{row.name ?? "Desconocido"}</td>
                      <td className="py-2 pr-3">{row.matchCount ?? 0}</td>
                      <td className="py-2 pr-3">{pct(row.wins, row.matchCount)}%</td>
                      <td className="py-2 pr-3">
                        {row.podiums ?? 0} ({pct(row.podiums, row.matchCount)}%)
                      </td>
                    </tr>
                  ))}
                  {sortedRows.length === 0 && (
                    <tr>
                      <td className="py-6 text-center text-muted-foreground" colSpan={5}>
                        Aún no hay partidas con comandantes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </>
        )}

        {!isLoading && !isError && (
          <div className="mt-10 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Historial de partidas</h2>
              {historyLoading && <span className="text-sm text-muted-foreground">Cargando…</span>}
            </div>

            <Card className="p-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Comandante</th>
                    <th className="py-2 pr-3">Puesto</th>
                    <th className="py-2 pr-3">Jugadores</th>
                    <th className="py-2 pr-3">Vida inicial</th>
                  </tr>
                </thead>
                <tbody>
                  {(history ?? []).map((row) => (
                    <tr
                      key={row.matchId}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => setOpenMatchId(row.matchId)}
                    >
                      <td className="py-2 pr-3 whitespace-nowrap">{fmt(row.createdAt)}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                            <Image
                              src={row.self?.commander?.artImageUrl ?? row.self?.commander?.imageUrl ?? "/placeholder.svg"}
                              alt={row.self?.commander?.name ?? "Commander"}
                              fill
                              className="object-cover"
                              sizes="40px"
                              unoptimized
                            />
                          </div>
                          <span className="truncate">{row.self?.commander?.name ?? "Desconocido"}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3">{row.self?.placement ?? "-"}</td>
                      <td className="py-2 pr-3">{row.players?.length ?? 0}</td>
                      <td className="py-2 pr-3">{row.startingHp ?? "-"}</td>
                    </tr>
                  ))}
                  {(history?.length ?? 0) === 0 && (
                    <tr>
                      <td className="py-6 text-center text-muted-foreground" colSpan={5}>
                        Aún no hay partidas registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        <Dialog open={openMatchId != null} onOpenChange={() => setOpenMatchId(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalles del duelo</DialogTitle>
            </DialogHeader>
            {openEntry && (
              <div className="space-y-4">
                <div className="relative w-full aspect-video bg-muted rounded overflow-hidden">
                  <Image
                    src={openEntry.croppedImage?.url ?? openEntry.image?.url ?? "/placeholder.svg"}
                    alt="Imagen del duelo"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 800px"
                    unoptimized
                  />
                </div>
                <div>
                  <h3 className="font-medium mb-2">Participantes</h3>
                  <ul className="divide-y">
                    {openEntry.players.map((p) => (
                      <li key={p.playerId} className="py-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-flex h-3 w-3 rounded-full border"
                            style={{ backgroundColor: p.backgroundColor ?? "#CBD5E1" }}
                            aria-hidden
                          />
                          <span className="truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">Puesto {p.placement}</span>
                          <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                            <Image
                              src={p.commander?.artImageUrl ?? p.commander?.imageUrl ?? "/placeholder.svg"}
                              alt={p.commander?.name ?? "Commander"}
                              fill
                              className="object-cover"
                              sizes="40px"
                              unoptimized
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

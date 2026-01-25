"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PlayerCombobox,
  type PlayerSelection,
} from "@/components/player-combobox";
import {
  CurrentMatchContext,
  useCurrentMatch,
} from "@/app/_stores/current-match-provider";
import { useSettings } from "@/app/_stores/settings-provider";
import { randomHexColor } from "@/utils/gen";
import { cn } from "@/lib/utils";

type LeaguePlayer = {
  id: number | null;
  name: string;
  color: string;
};

type LeagueMatch = {
  a: number;
  b: number;
  played: boolean;
  id?: number | null;
};

type LeagueState = {
  players: LeaguePlayer[];
  started: boolean;
  matches: LeagueMatch[];
  rounds?: number[][];
  currentRound?: number;
  mode?: "single" | "double";
};

const STORAGE_KEY = "tournament-league-v1";

function loadState(): LeagueState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      const candidate = parsed as { players?: unknown; matches?: unknown };
      if (
        Array.isArray(candidate.players) &&
        Array.isArray(candidate.matches)
      ) {
        return parsed as LeagueState;
      }
    }
  } catch {}
  return null;
}

function saveState(state: LeagueState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function generateDoubleRoundRobinWithRounds(
  n: number,
): { matches: LeagueMatch[]; rounds: number[][] } {
  const hasBye = n % 2 === 1;
  const N = hasBye ? n + 1 : n;
  const arr = Array.from({ length: N }, (_, i) =>
    hasBye && i === N - 1 ? -1 : i,
  );
  const roundsA: number[][] = [];
  const matches: LeagueMatch[] = [];
  const roundsCount = N - 1;
  for (let r = 0; r < roundsCount; r++) {
    const roundIdxs: number[] = [];
    for (let i = 0; i < N / 2; i++) {
      const a = arr[i]!;
      const b = arr[N - 1 - i]!;
      if (a === -1 || b === -1) continue;
      const idx = matches.length;
      matches.push({ a, b, played: false });
      roundIdxs.push(idx);
    }
    roundsA.push(roundIdxs);
    const fixed = arr[0]!;
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }
  const roundsB: number[][] = [];
  for (const leg of roundsA) {
    const roundIdxs: number[] = [];
    for (const idxA of leg) {
      const matchA = matches[idxA]!;
      const idx = matches.length;
      matches.push({ a: matchA.b, b: matchA.a, played: false });
      roundIdxs.push(idx);
    }
    roundsB.push(roundIdxs);
  }
  const combinedRounds = [...roundsA, ...roundsB];
  const expected = n * Math.max(0, n - 1);
  if (matches.length > expected) {
    matches.length = expected;
  }
  const cleanedRounds = combinedRounds
    .map((r) => r.filter((idx) => idx < matches.length))
    .filter((r) => r.length > 0);
  return { matches, rounds: cleanedRounds };
}

function generateSingleRoundRobinWithRounds(
  n: number,
): { matches: LeagueMatch[]; rounds: number[][] } {
  const hasBye = n % 2 === 1;
  const N = hasBye ? n + 1 : n;
  const arr = Array.from({ length: N }, (_, i) =>
    hasBye && i === N - 1 ? -1 : i,
  );
  const rounds: number[][] = [];
  const matches: LeagueMatch[] = [];
  const roundsCount = N - 1;
  for (let r = 0; r < roundsCount; r++) {
    const roundIdxs: number[] = [];
    for (let i = 0; i < N / 2; i++) {
      const a = arr[i]!;
      const b = arr[N - 1 - i]!;
      if (a === -1 || b === -1) continue;
      const idx = matches.length;
      matches.push({ a, b, played: false });
      roundIdxs.push(idx);
    }
    rounds.push(roundIdxs);
    const fixed = arr[0]!;
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }
  return { matches, rounds };
}

export default function TournamentPage() {
  const router = useRouter();
  const settings = useSettings((s) => s);
  const restartMatch = useCurrentMatch((s) => s.restartMatch);
  const currentPlayers = useCurrentMatch((s) => s.players);
  const addPlayerToMatch = useCurrentMatch((s) => s.addPlayer);
  const removePlayerFromMatch = useCurrentMatch((s) => s.removePlayer);
  const updatePlayerInMatch = useCurrentMatch((s) => s.updatePlayer);
  const currentMatchStore = useContext(CurrentMatchContext);
  const setTournamentCtx = useCurrentMatch((s) => s.setTournamentId);
  const setTournamentMatchIndex = useCurrentMatch(
    (s) => s.setTournamentMatchIndex,
  );

  const { data: suggestedPlayers = [] } = api.players.findAll.useQuery();
  const {
    data: activeTournament,
    refetch: refetchActive,
    isLoading: isCheckingActive,
  } = api.tournament.getActive.useQuery();
  const createTournament = api.tournament.create.useMutation({
    onSuccess: () => {
      void refetchActive();
      setLeagueName("");
    },
  });
  const finishTournament = api.tournament.finish.useMutation({
    onSuccess: () => {
      void refetchActive();
    },
  });
  const advanceRound = api.tournament.advanceRound.useMutation({
    onSuccess: () => {
      void refetchActive();
    },
  });
  const { data: results = [] } = api.tournament.results.useQuery(
    { tournamentId: activeTournament?.id ?? 0 },
    { enabled: !!activeTournament },
  );

  const [state, setState] = useState<LeagueState>({
    players: [],
    started: false,
    matches: [],
    mode: "double",
  });
  const [leagueName, setLeagueName] = useState<string>("");

  const [toAdd, setToAdd] = useState<PlayerSelection>({
    id: null,
    name: "",
    backgroundColor: undefined,
    source: "custom",
  });

  useEffect(() => {
    if (!activeTournament) {
      const stored = loadState();
      if (stored) setState(stored);
    }
  }, [activeTournament]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const canStart =
    state.players.length >= 2 &&
    !activeTournament &&
    leagueName.trim().length > 0;

  const effectiveState: LeagueState = activeTournament?.state ?? state;

  const currentRoundIndex = activeTournament?.state.currentRound ?? 0;
  const rounds = activeTournament?.state.rounds ?? [];
  const currentRoundMatchIdxs = rounds[currentRoundIndex] ?? [];
  const pendingCurrentRound = currentRoundMatchIdxs.filter(
    (idx) => !(effectiveState.matches[idx]?.played ?? false),
  );
  const isCurrentRoundComplete =
    pendingCurrentRound.length === 0 &&
    (currentRoundMatchIdxs.length > 0 || rounds.length === 0);

  const resultsByMatchId = useMemo(() => {
    const map = new Map<number, { winnerName: string; loserName: string }>();
    for (const r of results) {
      const sorted = [...r.players].sort((a, b) => a.placement - b.placement);
      const w = sorted[0];
      const l = sorted[1];
      if (!w || !l) continue;
      map.set(r.id, { winnerName: w.name, loserName: l.name });
    }
    return map;
  }, [results]);

  function addLeaguePlayer(sel: PlayerSelection) {
    const name = sel.name.trim();
    if (name.length === 0) return;
    const normalized = name.toLowerCase();
    const already = state.players.some(
      (p) => p.name.trim().toLowerCase() === normalized,
    );
    if (already) return;
    const color = sel.backgroundColor ?? randomHexColor(state.players.length);
    setState((s) => ({
      ...s,
      players: [...s.players, { id: sel.id, name, color }],
    }));
    setToAdd({
      id: null,
      name: "",
      backgroundColor: undefined,
      source: "custom",
    });
  }

  function removeLeaguePlayer(idx: number) {
    setState((s) => ({
      ...s,
      players: s.players.filter((_, i) => i !== idx),
    }));
  }

  async function startLeague() {
    const n = state.players.length;
    if (n < 2 || activeTournament) return;
    const isSingle = (state.mode ?? "double") === "single";
    const { matches: schedule, rounds } = isSingle
      ? generateSingleRoundRobinWithRounds(n)
      : generateDoubleRoundRobinWithRounds(n);

    await createTournament.mutateAsync({
      name: leagueName.trim(),
      state: {
        players: state.players,
        started: true,
        matches: schedule,
        rounds,
        currentRound: 0,
        mode: state.mode ?? "double",
      },
    });
  }

  function endLeague() {
    if (activeTournament) {
      void finishTournament.mutate({ tournamentId: activeTournament.id });
    } else {
      setState({ players: [], started: false, matches: [] });
    }
  }

  async function openScheduledMatch(match: LeagueMatch, index: number) {
    const a = effectiveState.players[match.a];
    const b = effectiveState.players[match.b];
    if (!a || !b) return;

    try {
      restartMatch(settings);
    } catch {}

    try {
      const initialPlayers = [...currentPlayers];
      for (let i = initialPlayers.length - 1; i >= 2; i--) {
        const player = initialPlayers[i];
        if (player) {
          removePlayerFromMatch(player.id);
        }
      }
      let playerCount = currentMatchStore?.getState().players.length ?? 0;
      while (playerCount < 2) {
        addPlayerToMatch(settings);
        playerCount++;
      }
    } catch {}

    const refreshed = currentMatchStore?.getState().players ?? [];
    const first = refreshed[0];
    const second = refreshed[1];
    if (first) {
      updatePlayerInMatch(first.id, {
        displayName: a.name,
        playerId: a.id ?? null,
        backgroundColor: a.color,
        commander: null,
      });
    }
    if (second) {
      updatePlayerInMatch(second.id, {
        displayName: b.name,
        playerId: b.id ?? null,
        backgroundColor: b.color,
        commander: null,
      });
    }

    if (activeTournament) {
      setTournamentCtx(activeTournament.id);
      setTournamentMatchIndex(index);
    } else {
      setState((s) => {
        const copy = { ...s, matches: [...s.matches] };
        const m = copy.matches[index];
        if (m) m.played = true;
        return copy;
      });
    }

    router.push("/match");
  }

  if (isCheckingActive) {
    return (
      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <div
          className="flex min-h-[50vh] items-center justify-center text-muted-foreground"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="size-8 animate-spin" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <div className="mb-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/")}
        >
          Volver al menú
        </Button>
      </div>
      <h1 className="mb-2 text-2xl font-bold">Liga mágica</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Donde las grandes leyendas se enfrentan...
      </p>
      {activeTournament && (
        <div className="mb-6 flex justify-end">
          <Button type="button" variant="secondary" onClick={endLeague}>
            Finalizar torneo
          </Button>
        </div>
      )}

      {!activeTournament && (
        <section className="mb-6">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/70 p-4 shadow-xl backdrop-blur">
            <div
              className={cn(
                "pointer-events-none absolute inset-0 opacity-60 blur-2xl",
                "bg-linear-to-br from-emerald-500/15 via-sky-500/10 to-indigo-700/20",
              )}
            />
            <div className="relative">
              <h2 className="mb-2 text-lg font-semibold">Jugadores</h2>
              <div className="mb-3 flex md:items-center gap-2 flex-col md:flex-row">
                <PlayerCombobox
                  value={toAdd}
                  onChange={setToAdd}
                  placeholder="Agregar jugador…" ariaLabel="Jugador"
                  suggestions={suggestedPlayers}
                  className="max-w-sm"
                />
                <Button
                  type="button"
                  onClick={() => addLeaguePlayer(toAdd)}
                  disabled={toAdd.name.trim().length === 0}
                  className="my-3 md:my-0"
                >
                  Agregar
                </Button>
              </div>

              {state.players.length > 0 ? (
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {state.players.map((p, idx) => (
                    <li
                      key={`${p.id ?? "custom"}-${p.name}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="inline-block size-3 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="truncate">{p.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLeaguePlayer(idx)}
                        disabled={false}
                      >
                        Quitar
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay jugadores aún. Agregá algunos para empezar.
                </p>
              )}
            </div>


             <section className="mb-6 mt-10">
              <div className="mb-3 grid grid-cols-1 items-end gap-3">
                {!activeTournament && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="league-name">Nombre de la liga</Label>
                    <Input
                      id="league-name"
                      placeholder="Ej: Liga de verano"
                      value={leagueName}
                      onChange={(e) => setLeagueName(e.currentTarget.value)}
                      className="md:w-100"
                    />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {!activeTournament && (
                    <>
                      <span className="text-sm text-muted-foreground">Formato:</span>
                      <Button
                        type="button"
                        variant={
                          (state.mode ?? "double") === "single" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setState((s) => ({ ...s, mode: "single" }))
                        }
                      >
                        Ida
                      </Button>
                      <Button
                        type="button"
                        variant={
                          (state.mode ?? "double") === "double" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setState((s) => ({ ...s, mode: "double" }))
                        }
                      >
                        Ida y vuelta
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!activeTournament && (
                  <Button type="button" onClick={startLeague} disabled={!canStart}>
                    Empezar liga
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={endLeague}
                  disabled={!activeTournament && state.players.length === 0}
                >
                  Terminar / Reiniciar
                </Button>
              </div>
            </section>
            
          </div>
        </section>
      )}

     

      <section>
        {!effectiveState.started ? (
          <></>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/70 p-4 shadow-xl backdrop-blur">
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 opacity-60 blur-2xl",
                  "bg-linear-to-br from-emerald-500/15 via-sky-500/10 to-indigo-700/20",
                )}
              />
              <div className="relative">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold uppercase tracking-wide">
                    Puntuaciones
                  </h2>
                </div>
                {(() => {
                  const pts = new Map<
                    number,
                    {
                      name: string;
                      color: string;
                      points: number;
                      wins: number;
                      played: number;
                      last: ("W" | "L")[];
                    }
                  >();
                  for (const r of results) {
                    const sorted = [...r.players].sort(
                      (a, b) => a.placement - b.placement,
                    );
                    const w = sorted[0];
                    const l = sorted[1];
                    if (!w || !l) continue;
                    for (const p of [w, l]) {
                      const entry =
                        pts.get(p.id) ?? {
                          name: p.name,
                          color: p.backgroundColor,
                          points: 0,
                          wins: 0,
                          played: 0,
                          last: [],
                        };
                      entry.played += 1;
                      if (p.id === w.id) {
                        entry.wins += 1;
                        entry.points += 3;
                        entry.last.unshift("W");
                      } else {
                        entry.last.unshift("L");
                      }
                      entry.last = entry.last.slice(0, 5);
                      pts.set(p.id, entry);
                    }
                  }
                  const rows = Array.from(pts.entries())
                    .map(([id, v]) => ({ id, ...v }))
                    .sort(
                      (a, b) =>
                        b.points - a.points ||
                        b.wins - a.wins ||
                        a.name.localeCompare(b.name),
                    );
                  if (rows.length === 0)
                    return (
                      <p className="text-sm text-muted-foreground">
                        Aún no hay resultados.
                      </p>
                    );
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-muted-foreground">
                          <tr className="border-b">
                            <th className="py-2 pr-3 text-right">#</th>
                            <th className="py-2 pr-3 text-left">Invocadores</th>
                            <th className="py-2 pr-3 text-right">PTS</th>
                            <th className="py-2 pr-3 text-right">J</th>
                            <th className="py-2 pr-3 text-right">G</th>
                            <th className="py-2 pr-3 text-right">P</th>
                            <th className="py-2 text-right">Últimas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, idx) => (
                            <tr
                              key={`tb-${row.id}`}
                              className="border-b last:border-0"
                            >
                              <td className="py-2 pr-3 text-right text-muted-foreground">
                                {idx + 1}
                              </td>
                              <td className="py-2 pr-3">
                                <span className="flex items-center gap-2">
                                  <span
                                    aria-hidden
                                    className="inline-block size-3 rounded-full"
                                    style={{ backgroundColor: row.color }}
                                  />
                                  <span>{row.name}</span>
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-right font-semibold">
                                {row.points}
                              </td>
                              <td className="py-2 pr-3 text-right">
                                {row.played}
                              </td>
                              <td className="py-2 pr-3 text-right">
                                {row.wins}
                              </td>
                              <td className="py-2 pr-3 text-right">
                                {Math.max(0, row.played - row.wins)}
                              </td>
                              <td className="py-2 text-right">
                                <span className="inline-flex items-center gap-1">
                                  {row.last.map((r, i) => (
                                    <span
                                      key={i}
                                      className={
                                        "inline-flex size-6 items-center justify-center rounded text-xs font-semibold " +
                                        (r === "W"
                                          ? "bg-green-600/20 text-green-600"
                                          : "bg-red-600/20 text-red-600")
                                      }
                                    >
                                      {r}
                                    </span>
                                  ))}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/70 p-4 shadow-xl backdrop-blur">
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 opacity-60 blur-2xl",
                  "bg-linear-to-br from-amber-500/15 via-rose-500/10 to-purple-700/20",
                )}
              />
              <div className="relative">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold uppercase tracking-wide">
                    Duelos
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Rondas {currentRoundIndex + 1}
                      {rounds.length ? `/${rounds.length}` : ""}
                    </span>
                    {activeTournament &&
                      rounds.length > 0 &&
                      currentRoundIndex < rounds.length - 1 && (
                        <Button
                          size="sm"
                          onClick={() =>
                            advanceRound.mutate({
                              tournamentId: activeTournament.id,
                            })
                          }
                          disabled={!isCurrentRoundComplete}
                        >
                          Siguiente ronda
                        </Button>
                      )}
                  </div>
                </div>
                <ul className="grid grid-cols-1 gap-2">
                  {currentRoundMatchIdxs.map((i) => {
                    const m = effectiveState.matches[i]!;
                    const a = effectiveState.players[m.a];
                    const b = effectiveState.players[m.b];
                    if (!a || !b) return null;
                    const isPlayed = m.played;
                    const res = m.id ? resultsByMatchId.get(m.id) : undefined;
                    return (
                      <li key={`rd-${i}`}>
                        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground hidden md:block">
                            {isPlayed ? "Jugado" : "Pendiente"}
                          </span>
                          <button
                            type="button"
                            className="h-auto w-full justify-between p-0 text-left disabled:cursor-not-allowed"
                            onClick={() =>
                              !isPlayed && openScheduledMatch(m, i)
                            }
                            disabled={isPlayed}
                          >
                            <div className="mx-3 grid grid-cols-2 items-center">
                              <span className="flex items-center gap-2">
                                <span
                                  aria-hidden
                                  className="inline-block size-3 rounded-full"
                                  style={{ backgroundColor: a.color }}
                                />
                                <span className="truncate font-medium">
                                  {a.name}
                                </span>
                                {res && res.winnerName === a.name && (
                                  <span className="ml-2 inline-block rounded bg-green-600/15 px-2 py-0.5 text-xs text-green-600">
                                    W
                                  </span>
                                )}
                                {res && res.loserName === a.name && (
                                  <span className="ml-2 inline-block rounded bg-red-600/15 px-2 py-0.5 text-xs text-red-600">
                                    L
                                  </span>
                                )}
                              </span>
                              <span className="flex items-center justify-end gap-2">
                                {res && res.winnerName === b.name && (
                                  <span className="mr-2 inline-block rounded bg-green-600/15 px-2 py-0.5 text-xs text-green-600">
                                    W
                                  </span>
                                )}
                                {res && res.loserName === b.name && (
                                  <span className="mr-2 inline-block rounded bg-red-600/15 px-2 py-0.5 text-xs text-red-600">
                                    L
                                  </span>
                                )}
                                <span className="truncate">{b.name}</span>
                                <span
                                  aria-hidden
                                  className="inline-block size-3 rounded-full"
                                  style={{ backgroundColor: b.color }}
                                />
                              </span>
                            </div>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>

      {activeTournament && results.length > 0 && (
        <section className="mt-8">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/70 p-4 shadow-xl backdrop-blur">
            <div
              className={cn(
                "pointer-events-none absolute inset-0 opacity-60 blur-2xl",
                "bg-linear-to-br from-amber-400/15 via-amber-600/10 to-red-700/20",
              )}
            />
            <div className="relative">
              <h2 className="mb-2 text-lg font-semibold">Resultados</h2>
              <ul className="grid grid-cols-1 gap-2">
                {results.map((r) => {
                  const sorted = [...r.players].sort(
                    (a, b) => a.placement - b.placement,
                  );
                  const winner = sorted[0];
                  const loser = sorted[1];
                  if (!winner || !loser) return null;
                  return (
                    <li
                      key={`res-${r.id}`}
                      className="rounded-2xl border border-white/10 bg-slate-950/40 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="inline-block size-3 rounded-full"
                            style={{
                              backgroundColor: winner.backgroundColor,
                            }}
                          />
                          <span className="truncate font-medium">
                            {winner.name}
                          </span>
                          <span className="ml-2 inline-block rounded bg-green-600/15 px-2 py-0.5 text-xs text-green-600">
                            W
                          </span>
                        </span>
                        <span className="mx-2 text-muted-foreground">vs</span>
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="inline-block size-3 rounded-full"
                            style={{
                              backgroundColor: loser.backgroundColor,
                            }}
                          />
                          <span className="truncate">{loser.name}</span>
                          <span className="ml-2 inline-block rounded bg-red-600/15 px-2 py-0.5 text-xs text-red-600">
                            L
                          </span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}


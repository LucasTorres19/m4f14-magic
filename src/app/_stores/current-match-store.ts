import { INITIAL_PLAYERS } from "@/lib/constants";
import type { RouterOutputs } from "@/trpc/react";
import { randomHexColor } from "@/utils/gen";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import type { SettingsState } from "./settings-store";

type CommanderOption = RouterOutputs["commanders"]["search"][number];

export interface Player {
  id: string;
  displayName: string;
  hp: number;
  hpUpdated: number;
  hpUpdatedTimeout: ReturnType<typeof setTimeout> | null;
  backgroundColor: string;
  commander: CommanderOption | null;
}

export type CurrentMatchState = {
  players: Player[];
  hpHistory: { playerId: string; hpUpdated: number; currentHp: number }[];
  currentPlayerIndex: number;
  timerRemaining: number;
  isTimerPaused: boolean;
};

export type CurrentMatchActions = {
  updatePlayer: (
    playerId: string,
    data:
      | Partial<Omit<Player, "id">>
      | ((player: Player) => Partial<Omit<Player, "id">>),
  ) => void;
  addPlayer: (player?: {
    id?: string;
    displayName?: string;
    backgroundColor?: string;
    hp?: number;
    commander?: CommanderOption | null;
  }) => void;
  removePlayer: (playerId: string) => void;
  reorderPlayers: (playerIds: string[]) => void;

  findPlayer: (playerId: string) => Player | undefined;

  updateHp: (playerId: string, amount: number) => void;
  setHp: (playerId: string, hp: number) => void;

  restartMatch: (settings: SettingsState) => void;

  // 🔹 Nuevo: resetea con una lista concreta de invocadores (nombre + color)

  nextTurn: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: (timeLimit: number) => void;
  updateTimer: (remaining: number) => void;
};

export type CurrentMatchStore = CurrentMatchState & CurrentMatchActions;

const defaultInitState: CurrentMatchState = {
  players: [],
  hpHistory: [],
  currentPlayerIndex: 0,
  timerRemaining: 0,
  isTimerPaused: false,
};

export const initCurrentMatchStore = (
  settings: SettingsState,
): CurrentMatchState => {
  return {
    players: Array.from({ length: INITIAL_PLAYERS }).map((_, i) => ({
      id: `local-${i}`,
      displayName: `Invocador ${i + 1}`,
      hp: settings.startingHp,
      backgroundColor: randomHexColor(i),
      hpUpdated: 0,
      hpUpdatedTimeout: null,
      commander: null,
    })),
    hpHistory: [],
    currentPlayerIndex: 0,
    timerRemaining: settings.timerLimit,
    isTimerPaused: true,
  };
};

export const createCurrentMatchStore = (
  initState: CurrentMatchState = defaultInitState,
) => {
  return createStore<CurrentMatchStore>()(
    persist(
      (set, get) => ({
        ...initState,
        updatePlayer: (playerId, data) =>
          set((state) => ({
            players: state.players.map((player) =>
              player.id === playerId
                ? typeof data === "function"
                  ? { ...player, ...data(player) }
                  : { ...player, ...data }
                : player,
            ),
          })),
        addPlayer: (player) =>
          set((state) => {
            const nextIndex = state.players.length;
            const baseHp = player?.hp ?? state.players[0]?.hp ?? 40;
            const providedName = player?.displayName?.trim() ?? "";
            const displayName =
              providedName.length > 0
                ? providedName
                : `Invocador ${nextIndex + 1}`;
            const backgroundColor =
              player?.backgroundColor ?? randomHexColor(nextIndex);
            const newPlayer: Player = {
              id:
                player?.id ??
                `local-${Date.now().toString(16)}-${Math.random()
                  .toString(16)
                  .slice(2)}`,
              displayName,
              hp: baseHp,
              backgroundColor,
              hpUpdated: 0,
              hpUpdatedTimeout: null,
              commander: player?.commander ?? null,
            };
            return {
              players: [...state.players, newPlayer],
            };
          }),
        removePlayer: (playerId) =>
          set((state) => {
            const playerToRemove = state.players.find(
              (player) => player.id === playerId,
            );
            if (!playerToRemove) return {};
            if (playerToRemove.hpUpdatedTimeout) {
              clearTimeout(playerToRemove.hpUpdatedTimeout);
            }
            const remaining = state.players.filter(
              (player) => player.id !== playerId,
            );
            return {
              players: remaining,
              hpHistory: state.hpHistory.filter(
                (entry) => entry.playerId !== playerId,
              ),
              currentPlayerIndex:
                remaining.length === 0
                  ? 0
                  : Math.min(state.currentPlayerIndex, remaining.length - 1),
            };
          }),
        reorderPlayers: (playerIds) =>
          set((state) => {
            if (playerIds.length === 0) return {};
            const playerById = new Map(state.players.map((p) => [p.id, p]));
            const ordered = playerIds
              .map((id) => playerById.get(id))
              .filter((player): player is Player => Boolean(player));
            if (ordered.length === 0) return {};
            const seen = new Set(ordered.map((player) => player.id));
            const remaining = state.players.filter(
              (player) => !seen.has(player.id),
            );
            const nextPlayers = [...ordered, ...remaining];
            const changed =
              nextPlayers.length !== state.players.length ||
              nextPlayers.some(
                (player, index) => player.id !== state.players[index]?.id,
              );
            if (!changed) return {};
            return { players: nextPlayers };
          }),

        findPlayer: (playerId) => get().players.find((p) => p.id === playerId),

        updateHp: (playerId, amount) => {
          get().updatePlayer(playerId, (player) => {
            if (player.hpUpdatedTimeout) clearTimeout(player.hpUpdatedTimeout);
            return {
              hp: player.hp + amount,
              hpUpdated: player.hpUpdated + amount,
              hpUpdatedTimeout: setTimeout(() => {
                set((state) => {
                  const p = state.findPlayer(playerId);
                  if (!p || p.hpUpdated === 0) return {};
                  return {
                    hpHistory: [
                      ...state.hpHistory,
                      { playerId, hpUpdated: p.hpUpdated, currentHp: p.hp },
                    ],
                  };
                });
                get().updatePlayer(playerId, {
                  hpUpdated: 0,
                  hpUpdatedTimeout: null,
                });
              }, 1500),
            };
          });
        },

        setHp: (playerId, hp) => get().updatePlayer(playerId, { hp }),

        restartMatch: (settings: SettingsState) =>
          set(() => ({
            players: get().players.map((p) => {
              if (p.hpUpdatedTimeout) clearTimeout(p.hpUpdatedTimeout);
              return {
                id: p.id,
                displayName: p.displayName,
                hp: settings.startingHp,
                commander: p.commander,
                backgroundColor: p.backgroundColor,
                hpUpdated: 0,
                hpUpdatedTimeout: null,
              };
            }),
            hpHistory: [],
            currentPlayerIndex: 0,
            timerRemaining: settings?.timerLimit ?? 120,
            isTimerPaused: true,
          })),

        nextTurn: () =>
          set((state) => {
            const nextIndex =
              (state.currentPlayerIndex + 1) % state.players.length;
            return {
              currentPlayerIndex: nextIndex,
              timerRemaining: state.isTimerPaused ? state.timerRemaining : 0,
              isTimerPaused: true, // Pause the timer when starting a new turn
            };
          }),

        pauseTimer: () =>
          set((state) => ({ isTimerPaused: !state.isTimerPaused })),

        resumeTimer: () => set(() => ({ isTimerPaused: false })),

        resetTimer: (timeLimit: number) =>
          set(() => ({
            timerRemaining: timeLimit,
            isTimerPaused: false,
          })),

        updateTimer: (remaining) => set(() => ({ timerRemaining: remaining })),
      }),
      { name: "current-match-store", skipHydration: true },
    ),
  );
};

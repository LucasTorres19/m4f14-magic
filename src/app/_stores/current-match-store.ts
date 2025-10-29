import { randomHexColor } from "@/utils/gen";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import type { SettingsState } from "./settings-store";

export interface Player {
  id: string;
  displayName: string;
  hp: number;
  hpUpdated: number;
  hpUpdatedTimeout: ReturnType<typeof setTimeout> | null;
  backgroundColor: string;
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

  findPlayer: (playerId: string) => Player | undefined;

  updateHp: (playerId: string, amount: number) => void;
  setHp: (playerId: string, hp: number) => void;

  resetMatch: (startingHp: number, playersCount: number) => void;

  // 🔹 Nuevo: resetea con una lista concreta de invocadores (nombre + color)
  resetMatchWithPlayers: (
    startingHp: number,
    uiPlayers: Array<{ id?: string; name?: string; color?: string }>,
  ) => void;

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
    players: Array.from({ length: settings.playersCount }).map((_, i) => ({
      id: crypto.randomUUID(),
      displayName: `Invocador ${i + 1}`,
      hp: settings.startingHp,
      backgroundColor: randomHexColor(i),
      hpUpdated: 0,
      hpUpdatedTimeout: null,
    })),
    hpHistory: [],
    currentPlayerIndex: 0,
    timerRemaining: settings.timerLimit,
    isTimerPaused: false,
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
              }, 500),
            };
          });
        },

        setHp: (playerId, hp) => get().updatePlayer(playerId, { hp }),

        resetMatch: (startingHp, playersCount) =>
          set(() => ({
            players: Array.from({ length: playersCount }).map((_, i) => ({
              id: crypto.randomUUID(),
              displayName: `Invocador ${i + 1}`,
              hp: startingHp,
              backgroundColor: randomHexColor(i),
              hpUpdated: 0,
              hpUpdatedTimeout: null,
            })),
            hpHistory: [],
            currentPlayerIndex: 0,
            timerRemaining: 0, // Will be initialized by Timer component
            isTimerPaused: false,
          })),

        // 🔹 Nuevo: usar los invocadores definidos por el usuario
        resetMatchWithPlayers: (startingHp, uiPlayers) =>
          set(() => ({
            players: uiPlayers.map((p, i) => ({
              id: p.id ?? crypto.randomUUID(),
              displayName: p.name?.trim() ?? `Invocador ${i + 1}`,
              hp: startingHp,
              backgroundColor:
                p.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(p.color)
                  ? p.color
                  : randomHexColor(i),
              hpUpdated: 0,
              hpUpdatedTimeout: null,
            })),
            hpHistory: [],
            currentPlayerIndex: 0,
            timerRemaining: 0, // Will be initialized by Timer component
            isTimerPaused: false,
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

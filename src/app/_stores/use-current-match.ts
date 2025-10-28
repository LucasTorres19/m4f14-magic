// use-current-match.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BASE_SETTINGS } from "./use-settings";
import { randomHexColor } from "@/utils/random";

export interface Player {
  id: string;
  displayName: string;
  hp: number;
  hpUpdated: number;
  // Evita problemas de TS en browser
  hpUpdatedTimeout: ReturnType<typeof setTimeout> | null;
  backgroundColor: string;
}

interface CurrentMatchState {
  players: Player[];
  hpHistory: { playerId: string; hpUpdated: number; currentHp: number }[];

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

  // 🔹 Nuevo: resetea con una lista concreta de jugadores (nombre + color)
  resetMatchWithPlayers: (
    startingHp: number,
    uiPlayers: Array<{ id?: string; name?: string; color?: string }>,
  ) => void;
}

export const useCurrentMatch = create<CurrentMatchState>()(
  persist(
    (set, get) => ({
      players: Array.from({ length: BASE_SETTINGS.playersCount }).map(
        (_, i) => ({
          id: crypto.randomUUID(),
          displayName: `P${i + 1}`,
          hp: BASE_SETTINGS.startingHp,
          backgroundColor: randomHexColor(),
          hpUpdated: 0,
          hpUpdatedTimeout: null,
        }),
      ),
      hpHistory: [],

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
            displayName: `P${i + 1}`,
            hp: startingHp,
            backgroundColor: randomHexColor(),
            hpUpdated: 0,
            hpUpdatedTimeout: null,
          })),
          hpHistory: [],
        })),

      // 🔹 Nuevo: usar los jugadores definidos por el usuario
      resetMatchWithPlayers: (startingHp, uiPlayers) =>
        set(() => ({
          players: uiPlayers.map((p, i) => ({
            id: p.id ?? crypto.randomUUID(),
            displayName: p.name?.trim() ?? `P${i + 1}`,
            hp: startingHp,
            backgroundColor:
              p.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(p.color)
                ? p.color
                : randomHexColor(),
            hpUpdated: 0,
            hpUpdatedTimeout: null,
          })),
          hpHistory: [],
        })),
    }),
    { name: "current-match-store" },
  ),
);

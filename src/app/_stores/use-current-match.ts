import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BASE_SETTINGS } from "./use-settings";
import { makePlayers } from "@/utils/random";
export interface Player {
  id: string;
  displayName: string;
  hp: number;
  backgroundColor: string;
}

interface CurrentMatchState {
  players: Player[];

  updatePlayer: (
    playerId: string,
    data:
      | Partial<Omit<Player, "id">>
      | ((player: Player) => Partial<Omit<Player, "id">>),
  ) => void;

  updateHp: (playerId: string, amount: number) => void;

  setHp: (playerId: string, hp: number) => void;

  addPlayers: (n: number) => void;

  resetMatch: (mode?: "base" | "empty") => void;
}

export const useCurrentMatch = create<CurrentMatchState>()(
  persist(
    (set, get) => ({
      players: makePlayers(BASE_SETTINGS.playersCount, 0),

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

      resetMatch: (mode = "base") =>
        set({
          players:
            mode === "empty" ? [] : makePlayers(BASE_SETTINGS.playersCount, 0),
        }),

      updateHp: (playerId, amount) =>
        get().updatePlayer(playerId, (player) => ({ hp: player.hp + amount })),

      setHp: (playerId, hp) => get().updatePlayer(playerId, { hp }),
      addPlayers: (n) =>
        set((state) => ({
          players: [...state.players, ...makePlayers(n, state.players.length)],
        })),
    }),

    { name: "current-match-store" },
  ),
);

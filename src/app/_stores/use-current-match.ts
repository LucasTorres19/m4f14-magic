import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BASE_SETTINGS } from "./use-settings";
import { randomHexColor } from "@/utils/random";
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
}

export const useCurrentMatch = create<CurrentMatchState>()(
  persist(
    (set, get) => ({
      players: Array.from({ length: BASE_SETTINGS.playersCount }).map(
        (_, i) => ({
          id: crypto.randomUUID(),
          displayName: `P${i}`,
          hp: BASE_SETTINGS.startingHp,
          backgroundColor: randomHexColor(),
        }),
      ),

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

      updateHp: (playerId, amount) =>
        get().updatePlayer(playerId, (player) => ({ hp: player.hp + amount })),

      setHp: (playerId, hp) => get().updatePlayer(playerId, { hp }),
    }),
    { name: "current-match-store" },
  ),
);

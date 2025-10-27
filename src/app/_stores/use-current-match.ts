import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BASE_SETTINGS } from "./use-settings";
import { randomHexColor } from "@/utils/random";
interface Player {
  hp: number;
  backgroundColor: string;
}

interface CurrentMatchState {
  players: Player[];
  set: <T extends "players">(key: T, value: CurrentMatchState[T]) => void;
}

export const useCurrentMatch = create<CurrentMatchState>()(
  persist(
    (set) => ({
      players: Array.from({ length: BASE_SETTINGS.playersCount }, () => ({
        hp: BASE_SETTINGS.startingHp,
        backgroundColor: randomHexColor(),
      })),
      set: (key, value) => set((state) => ({ ...state, [key]: value })),
    }),
    { name: "current-match-store" },
  ),
);

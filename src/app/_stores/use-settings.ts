import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  startingHp: number;
  playersCount: number;
  set: <T extends "startingHp" | "playersCount">(
    key: T,
    value: SettingsStore[T],
  ) => void;
}

export const BASE_SETTINGS = {
  startingHp: 40,
  playersCount: 4,
} as const satisfies Partial<SettingsStore>;

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...BASE_SETTINGS,
      set: (key, value) => set((state) => ({ ...state, [key]: value })),
    }),
    { name: "settings-store" },
  ),
);

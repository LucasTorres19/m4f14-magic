import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

export type SettingsState = {
  startingHp: number;
  timerLimit: number; // in seconds
};

export type SettingsActions = {
  set: <T extends "startingHp" | "timerLimit">(
    key: T,
    value: SettingsStore[T],
  ) => void;
};

export type SettingsStore = SettingsState & SettingsActions;

const defaultInitState = {
  startingHp: 40,
  timerLimit: 120, // 2 minutes default
} as const satisfies Partial<SettingsStore>;

export const createSettingsStore = (
  initState: SettingsState = defaultInitState,
) => {
  return createStore<SettingsStore>()(
    persist(
      (set) => ({
        ...initState,
        set: (key, value) => set((state) => ({ ...state, [key]: value })),
      }),
      { name: "settings-store" },
    ),
  );
};

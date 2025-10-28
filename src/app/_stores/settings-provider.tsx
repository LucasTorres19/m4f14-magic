"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import { createSettingsStore, type SettingsStore } from "./settings-store";
export type SettingsApi = ReturnType<typeof createSettingsStore>;

export const SettingsContext = createContext<SettingsApi | undefined>(
  undefined,
);

export interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsPovider = ({ children }: SettingsProviderProps) => {
  const storeRef = useRef<SettingsApi | null>(null);

  storeRef.current ??= createSettingsStore();

  return (
    <SettingsContext.Provider value={storeRef.current}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = <T,>(selector: (store: SettingsStore) => T): T => {
  const settingsContext = useContext(SettingsContext);

  if (!settingsContext) {
    throw new Error(`useSettings must be used within SettingsPovider`);
  }

  return useStore(settingsContext, selector);
};

"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import {
  createCurrentMatchStore,
  initCurrentMatchStore,
  type CurrentMatchStore,
} from "./current-match-store";
import { useSettings } from "./settings-provider";

export type CurrentMatchApi = ReturnType<typeof createCurrentMatchStore>;

export const CurrentMatchContext = createContext<CurrentMatchApi | undefined>(
  undefined,
);

export interface CurrentMatchProviderProps {
  children: ReactNode;
}

export const CurrentMatchPovider = ({
  children,
}: CurrentMatchProviderProps) => {
  const storeRef = useRef<CurrentMatchApi | null>(null);
  const settings = useSettings((state) => state);

  storeRef.current ??= createCurrentMatchStore(initCurrentMatchStore(settings));

  return (
    <CurrentMatchContext.Provider value={storeRef.current}>
      {children}
    </CurrentMatchContext.Provider>
  );
};

export const useCurrentMatch = <T,>(
  selector: (store: CurrentMatchStore) => T,
): T => {
  const currentMatchContext = useContext(CurrentMatchContext);

  if (!currentMatchContext) {
    throw new Error(`useCurrentMatch must be used within CurrentMatchPovider`);
  }

  return useStore(currentMatchContext, selector);
};

"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

  const [hasHydrated, setHasHydrated] = useState<boolean>(() => {
    const store = storeRef.current;
    if (!store?.persist?.hasHydrated) return false;
    return store.persist.hasHydrated();
  });

  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;

    const unsubscribeHydrate = store.persist.onHydrate?.(() => {
      setHasHydrated(false);
    });

    const unsubscribeFinish = store.persist.onFinishHydration?.(() => {
      setHasHydrated(true);
    });

    const alreadyHydrated = store.persist.hasHydrated?.() ?? false;

    if (!alreadyHydrated) {
      const maybePromise = store.persist.rehydrate();
      void Promise.resolve(maybePromise).catch(() => {
        setHasHydrated(true);
      });
    } else {
      setHasHydrated(true);
    }

    return () => {
      unsubscribeHydrate?.();
      unsubscribeFinish?.();
    };
  }, []);

  return (
    <CurrentMatchContext.Provider value={storeRef.current}>
      {hasHydrated && children}
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

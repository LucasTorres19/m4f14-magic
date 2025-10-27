import type { Player } from "@/app/_stores/use-current-match";
import { BASE_SETTINGS } from "@/app/_stores/use-settings";

export const randomHexColor = (): string => {
  return `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0")}`;
};

export const makePlayers = (count: number, startIndex = 0): Player[] =>
  Array.from({ length: count }).map((_, i) => ({
    id: crypto.randomUUID(),
    displayName: `P${startIndex + i}`,
    hp: BASE_SETTINGS.startingHp,
    backgroundColor: randomHexColor(),
  }));

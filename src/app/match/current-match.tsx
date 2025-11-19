"use client";
import Timer from "@/components/Timer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Minus,
  Plus
} from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSwapy, utils, type Swapy } from "swapy";
import { useCurrentMatch } from "../_stores/current-match-provider";
import { type Player } from "../_stores/current-match-store";
import { useStableLongPress } from "../hooks/use-longer-press";
import SettingsButton from "./settings-button";

function Grid(n: number) {
  const cols = Math.max(1, Math.ceil(n / 2));
  const rows = n > cols ? 2 : n > 0 ? 1 : 0;
  return { cols, rows };
}

type CSSVars = CSSProperties & {
  "--cols": string;
  "--rows": string;
  "--gap": string;
  "--pad": string;
  "--hit": string;
  "--cellW": string;
  "--cellH": string;
  "--x": string;
  "--y": string;
};

function PlayerCurrentMatch({
  player,
  flipped = false,
  isActive = false,
}: {
  player: Player;
  flipped?: boolean;
  isActive?: boolean;
}) {
  const minusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const plusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const updateHp = useCurrentMatch((s) => s.updateHp);
  const isTimerVisible = useCurrentMatch((s) => s.isTimerVisible);
  const commanderBackground =
    player.commander?.artImageUrl ?? player.commander?.imageUrl ?? null;

  const containerStyle: CSSProperties = {
    backgroundColor: commanderBackground ? "" : player.backgroundColor,
    opacity: commanderBackground ? undefined : 0.7,
  };

  const minusAttrs = useStableLongPress(
    () => {
      if (minusIntervalRef.current) clearInterval(minusIntervalRef.current);
      minusIntervalRef.current = setInterval(() => updateHp(player.id, -1), 50);
    },
    {
      onFinish: () => {
        if (minusIntervalRef.current) clearInterval(minusIntervalRef.current);
        minusIntervalRef.current = null;
      },
      onCancel: () => {
        if (minusIntervalRef.current) clearInterval(minusIntervalRef.current);
        minusIntervalRef.current = null;
      },
      threshold: 500,
    },
  );
  const plusAttrs = useStableLongPress(
    () => {
      if (plusIntervalRef.current) clearInterval(plusIntervalRef.current);
      plusIntervalRef.current = setInterval(() => updateHp(player.id, 1), 50);
    },
    {
      onFinish: () => {
        if (plusIntervalRef.current) clearInterval(plusIntervalRef.current);
        plusIntervalRef.current = null;
      },
      onCancel: () => {
        if (plusIntervalRef.current) clearInterval(plusIntervalRef.current);
        plusIntervalRef.current = null;
      },
      threshold: 500,
    },
  );

  useEffect(() => {
    // clean up just in case
    return () => {
      if (plusIntervalRef.current) clearInterval(plusIntervalRef.current);
      plusIntervalRef.current = null;
      if (minusIntervalRef.current) clearInterval(minusIntervalRef.current);
      minusIntervalRef.current = null;
    };
  }, []);

  return (
    <div
      className={cn(
        "text-background relative flex h-full w-full items-stretch justify-center rounded-3xl text-[clamp(3.75rem,10vmin,8rem)] select-none",
        flipped && "flex-row-reverse",
      )}
    >
      {/* Background layer for opacity isolation */}
      <div 
        className="absolute inset-0 -z-30 rounded-3xl" 
        style={containerStyle} 
      />

      {isActive && isTimerVisible ? (
        <div
          data-swapy-no-drag
          className={cn(
            "absolute inset-x-0 z-20 flex items-center justify-center pointer-events-none",
            flipped ? "top-0 rotate-180" : "bottom-0"
          )}
        >
           <Timer />
        </div>
      ): null}

      {commanderBackground ? (
        <div
          data-swapy-no-drag
          className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-top opacity-70"
        >
          <Image
            data-swapy-no-drag
            src={commanderBackground}
            fill
            className={cn("object-cover object-top rounded-3xl", flipped && "rotate-180")}
            draggable={false}
            alt={player.commander?.name ?? `${player.displayName} commander`}
          />
        </div>
      ) : null}
      {!commanderBackground && (
        <span
          data-swapy-no-drag
          className={cn(
            "text-background absolute text-2xl select-none",
            flipped
              ? "bottom-4 left-1/2 -translate-x-1/2 rotate-180"
              : "top-4 left-1/2 -translate-x-1/2",
          )}
        >
          {player.displayName}
        </span>
      )}
      <Button
        data-swapy-no-drag
        {...minusAttrs}
        size="icon-lg"
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "group h-full grow rounded-none select-none",
          flipped ? "flex-row-reverse pl-12" : "pr-12",
        )}
        variant="ghost"
        onClick={() => updateHp(player.id, -1)}
      >
        <Minus
          data-swapy-no-drag
          className={cn(
            "text-background/80 group-active:text-background size-8",
            commanderBackground && "text-white/80 group-active:text-white",
            player.hpUpdated > 0 && "opacity-100",
          )}
          strokeWidth={4}
        />

        <span
          data-swapy-no-drag
          className={cn(
            "text-background text-5xl select-none",
            flipped && "rotate-180",
            commanderBackground && "text-white",
          )}
        >
          {player.hpUpdated < 0 ? `${Math.abs(player.hpUpdated)}` : ""}
        </span>
      </Button>

      <Button
        data-swapy-no-drag
        {...plusAttrs}
        onContextMenu={(e) => e.preventDefault()}
        size="icon-lg"
        className={cn(
          "group h-full grow rounded-none select-none",
          flipped ? "flex-row-reverse pr-12" : "pl-12",
        )}
        variant="ghost"
        onClick={() => updateHp(player.id, 1)}
      >
        <Plus
          data-swapy-no-drag
          className={cn(
            "text-background/80 group-active:text-background size-8",
            commanderBackground && "text-white/80 group-active:text-white",
            player.hpUpdated > 0 && "opacity-100",
          )}
          strokeWidth={4}
        />
        <span
          data-swapy-no-drag
          className={cn(
            "text-background text-5xl select-none",
            flipped && "rotate-180",
            commanderBackground && "text-white",
          )}
        >
          {player.hpUpdated > 0 ? `${Math.abs(player.hpUpdated)}` : ""}
        </span>
      </Button>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <button
          type="button"
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            "pointer-events-auto text-background select-none",
            flipped && "rotate-180",
            commanderBackground && "text-white",
          )}
          draggable={false}
        >
          {player.hp}
        </button>
      </div>
    </div>
  );
}

export default function CurrentMatch() {
  const players = useCurrentMatch((s) => s.players);
  const currentPlayerIndex = useCurrentMatch((s) => s.currentPlayerIndex);
  const reorderPlayers = useCurrentMatch((s) => s.reorderPlayers);
  const setTimerVisible = useCurrentMatch((s) => s.setTimerVisible);
  const n = players.length;
  const { cols, rows } = Grid(n);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const swapyInstanceRef = useRef<Swapy | null>(null);

  const [slotItemMap, setSlotItemMap] = useState(
    utils.initSlotItemMap(players, "id"),
  );
  const slottedItems = useMemo(
    () => utils.toSlottedItems(players, "id", slotItemMap),
    [players, slotItemMap],
  );


  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const instance = createSwapy(container, {
      dragOnHold: false,
      manualSwap: true,
      animation: "dynamic",
      swapMode: "drop",
    });

    instance.onSwap((event) => {
      setSlotItemMap(event.newSlotItemMap.asArray);
    });

    instance.onSwapEnd(({ hasChanged, slotItemMap, ...other }) => {
      if (!hasChanged) return;

      const normalizedSlotItemMap = slotItemMap.asArray;
      setSlotItemMap(normalizedSlotItemMap);
      const playerOrder = normalizedSlotItemMap
        .map(({ item }) => item)
        .filter((id): id is string => Boolean(id));
      reorderPlayers(playerOrder);
      setTimerVisible(false);
      setTimeout(() => {
        setTimerVisible(true);
      }, 0);
    });

    swapyInstanceRef.current = instance;

    return () => {
      instance.destroy();
      swapyInstanceRef.current = null;
    };
  }, [reorderPlayers]);

  useEffect(
    () =>
      utils.dynamicSwapy(
        swapyInstanceRef.current,
        players,
        "id",
        slotItemMap,
        setSlotItemMap,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [players],
  );

  const GAP = "0.75rem";
  const PAD = "0.75rem";

  const styleGrid: CSSVars = {
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    "--cols": String(cols),
    "--rows": String(rows),
    "--gap": GAP,
    "--pad": PAD,
    "--hit": "min(var(--gap), 2rem)",
    "--cellW": `calc((100% - (var(--cols) - 1) * var(--gap) - 2 * var(--pad)) / var(--cols))`,
    "--cellH": `calc((100% - (var(--rows) - 1) * var(--gap) - 2 * var(--pad)) / var(--rows))`,
    "--x":
      n === 2
        ? "50%"
        : `calc(var(--pad) + var(--cellW) + (var(--gap) / 2))`,
    "--y": `calc(var(--pad) + var(--cellH) + (var(--gap) / 2))`,
  };

  const activePlayer = players[currentPlayerIndex];

  return (
    <div
      ref={containerRef}
      className="relative grid h-dvh w-full gap-3 p-3 min-h-screen"
      style={styleGrid}
    >
      {slottedItems.map(({ item: player, itemId, slotId }, idx) => (
        <div
          key={slotId}
          data-swapy-slot={slotId}
          className={cn("h-full w-full rounded-3xl group-slot data-swapy-highlighted:bg-slate-600/60", activePlayer?.id === player?.id && "z-20")}
        >
          <div
            key={`${slotId}-${itemId}`}
            data-swapy-item={itemId}
            className="h-full w-full group-item select-none"
          >
            {player && (
              <PlayerCurrentMatch 
                player={player} 
                flipped={idx < cols} 
                key={`${slotId}-${itemId}`}
                isActive={activePlayer?.id === player.id}
              />
            )}
          </div>
        </div>
      ))}

      <SettingsButton />
    </div>
  );
}

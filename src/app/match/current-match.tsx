"use client";
import Timer from "@/components/Timer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  Minus,
  Plus
} from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { useCurrentMatch } from "../_stores/current-match-provider";
import { type Player } from "../_stores/current-match-store";
import { useStableLongPress } from "../hooks/use-longer-press";
import SettingsButton from "./settings-button";
import { SortablePlayerCard } from "./sortable-player-card";

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
       
         
        <div
          className={cn(
            "absolute inset-x-0 z-20 flex items-center justify-center pointer-events-none",
            flipped ? "top-0 rotate-180" : "bottom-0"
          )}
        >
            <Timer player={player} />
        </div>
        
       
      

      {commanderBackground ? (
        <div
          className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-top opacity-70"
        >
          <Image
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
        {...minusAttrs}
        onPointerDown={(e) => {
          e.stopPropagation();
          minusAttrs.onPointerDown(e);
        }}
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
          className={cn(
            "text-background/80 group-active:text-background size-8",
            commanderBackground && "text-white/80 group-active:text-white",
            player.hpUpdated > 0 && "opacity-100",
          )}
          strokeWidth={4}
        />

        <span
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
        {...plusAttrs}
        onPointerDown={(e) => {
          e.stopPropagation();
          plusAttrs.onPointerDown(e);
        }}
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
          className={cn(
            "text-background/80 group-active:text-background size-8",
            commanderBackground && "text-white/80 group-active:text-white",
            player.hpUpdated > 0 && "opacity-100",
          )}
          strokeWidth={4}
        />
        <span
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
  const n = players.length;
  const { cols, rows } = Grid(n);
  
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = players.findIndex((p) => p.id === active.id);
      const newIndex = players.findIndex((p) => p.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newPlayers = arrayMove(players, oldIndex, newIndex);
        reorderPlayers(newPlayers.map((p) => p.id));
      }
    }

    setActiveId(null);
  };

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
  const activeDragPlayer = activeId ? players.find((p) => p.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="relative grid h-dvh w-full gap-3 p-3 min-h-screen"
        style={styleGrid}
      >
        <SortableContext
          items={players.map((p) => p.id)}
          strategy={rectSortingStrategy}
        >
          {players.map((player, idx) => (
            <SortablePlayerCard key={player.id} id={player.id}>
              <PlayerCurrentMatch
                player={player}
                flipped={idx < cols}
                isActive={activePlayer?.id === player.id}
              />
            </SortablePlayerCard>
          ))}
        </SortableContext>

        <DragOverlay>
          {activeDragPlayer ? (
            <div className="h-full w-full">
               <PlayerCurrentMatch
                player={activeDragPlayer}
                flipped={players.findIndex(p => p.id === activeId) < cols}
                isActive={activePlayer?.id === activeDragPlayer.id}
              />
            </div>
          ) : null}
        </DragOverlay>

        <SettingsButton />
      </div>
    </DndContext>
  );
}

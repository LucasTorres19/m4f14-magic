"use client";
import { Button } from "@/components/ui/button";
import { useCurrentMatch, type Player } from "../_stores/use-current-match";
import { Minus, Plus } from "lucide-react";
import { useLongPress } from "@uidotdev/usehooks";
import { useRef } from "react";
import { cn } from "@/lib/utils";

function Grid(n: number) {
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  return { cols, rows };
}

function PlayerCurrentMatch({ player }: { player: Player }) {
  const minusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const plusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const updateHp = useCurrentMatch((s) => s.updateHp);

  const minusAttrs = useLongPress(
    () => {
      minusIntervalRef.current = setInterval(() => updateHp(player.id, -1), 50);
    },
    { onFinish: () => minusIntervalRef.current && clearInterval(minusIntervalRef.current), threshold: 500 },
  );

  const plusAttrs = useLongPress(
    () => {
      plusIntervalRef.current = setInterval(() => updateHp(player.id, 1), 50);
    },
    { onFinish: () => plusIntervalRef.current && clearInterval(plusIntervalRef.current), threshold: 500 },
  );

  return (
    <div
      style={{ backgroundColor: player.backgroundColor }}
      className="relative flex items-stretch justify-center overflow-hidden rounded-3xl text-background text-[clamp(2rem,10vmin,8rem)]"
    >
      <Button
        {...minusAttrs}
        size="icon-lg"
        className="group h-full grow rounded-none pr-12"
        variant="ghost"
        onClick={() => updateHp(player.id, -1)}
      >
        <Minus
          className={cn(
            "group-active:text-background size-8",
            player.hpUpdated < 0 ? "text-background" : "text-background/60",
          )}
          strokeWidth={4}
        />
        <span className="text-background text-5xl">
          {player.hpUpdated < 0 ? `${Math.abs(player.hpUpdated)}` : ""}
        </span>
      </Button>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <button className="pointer-events-auto">{player.hp}</button>
      </div>

      <Button
        {...plusAttrs}
        size="icon-lg"
        className="group h-full grow rounded-none pl-12"
        variant="ghost"
        onClick={() => updateHp(player.id, 1)}
      >
        <Plus
          className={cn(
            "group-active:text-background size-8",
            player.hpUpdated > 0 ? "text-background" : "text-background/60",
          )}
          strokeWidth={4}
        />
        <span className="text-background text-5xl">
          {player.hpUpdated > 0 ? `${Math.abs(player.hpUpdated)}` : ""}
        </span>
      </Button>
    </div>
  );
}

export default function CurrentMatch() {
  const players = useCurrentMatch((s) => s.players);
  const n = players.length;
  const { cols, rows } = Grid(n);

  return (
    <div
      className="relative grid h-dvh w-full gap-3 p-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,}}>
        
      {players.map((player) => (
        <PlayerCurrentMatch player={player} key={player.id} />
      ))}
    </div>
  );
}

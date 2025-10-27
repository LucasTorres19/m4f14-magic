"use client";
import { Button } from "@/components/ui/button";
import { useCurrentMatch, type Player } from "../_stores/use-current-match";
import { Home,History, Minus, Plus, Settings } from "lucide-react";
import { useLongPress } from "@uidotdev/usehooks";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Link from "next/link";

function Grid(n: number) {
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
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

function PlayerCurrentMatch({ player }: { player: Player }) {
  const minusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const plusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const updateHp = useCurrentMatch((s) => s.updateHp);

  const minusAttrs = useLongPress(
    () => {
      minusIntervalRef.current = setInterval(() => updateHp(player.id, -1), 50);
    },
    {
      onFinish: () =>
        minusIntervalRef.current && clearInterval(minusIntervalRef.current),
      threshold: 500,
    },
  );

  const plusAttrs = useLongPress(
    () => {
      plusIntervalRef.current = setInterval(() => updateHp(player.id, 1), 50);
    },
    {
      onFinish: () =>
        plusIntervalRef.current && clearInterval(plusIntervalRef.current),
      threshold: 500,
    },
  );

  return (
    <div
      style={{ backgroundColor: player.backgroundColor }}
      className="text-background relative flex items-stretch justify-center overflow-hidden rounded-3xl text-[clamp(2rem,10vmin,8rem)]"
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
    "--x": `calc(var(--pad) + var(--cellW) + (var(--gap) / 2))`,
    "--y": `calc(var(--pad) + var(--cellH) + (var(--gap) / 2))`,
  };

  const styleBtn: CSSProperties = {
    left: "var(--x)",
    top: "var(--y)",
    width: "var(--hit)",
    height: "var(--hit)",
    transform: "translate(-50%, -50%)",
  };

  return (
    <div className="relative grid h-dvh w-full gap-3 p-3" style={styleGrid}>
      {players.map((player) => (
        <PlayerCurrentMatch player={player} key={player.id} />
      ))}

      <div className="pointer-events-none absolute z-40" style={styleBtn}>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="settings"
              size="icon"
              className="pointer-events-auto h-full w-full rounded-full shadow-lg"
              onClick={() => {
                console.log("carlos gay");
              }}
            >
              <Settings className="size-4 transition-transform hover:animate-spin" />
            </Button>
          </SheetTrigger>
          <SheetContent hideClose side="bottom" className="gap-0 px-2 py-4">
            <SheetHeader className="p-0">
              <SheetTitle hidden>Bottom Toolbar</SheetTitle>
              <SheetDescription hidden>
                Bottom toolbar with some buttons :D
              </SheetDescription>
            </SheetHeader>
            <div className="relative flex items-center justify-center">
              
              <div className="absolute left-0">
                <Button size="sm" asChild>
                  <Link href="/"><Home className="size-5" /></Link>
                </Button>
              </div>

              <Button size="lg" asChild>
                <Link href="/match/hp-history"><History className="mr-2 size-5" />HISTORY</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

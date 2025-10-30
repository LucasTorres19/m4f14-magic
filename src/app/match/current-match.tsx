"use client";
import FlyingCards from "@/components/Flying-cards";
import ResetButton from "@/components/ResetButton";
import SettingsDialog from "@/components/SettingsDialog";
import Timer from "@/components/Timer";
import TimerSettingsDialog from "@/components/TimerSettingsDialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useLongPress } from "@uidotdev/usehooks";
import {
  History,
  Home,
  Minus,
  Plus,
  RotateCcw,
  Settings,
  Timer as TimerIcon,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import { useCurrentMatch } from "../_stores/current-match-provider";
import { type Player } from "../_stores/current-match-store";
import SaveMatch from "./save-match";

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
}: {
  player: Player;
  flipped?: boolean;
}) {
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
      className={cn(
        "text-background relative flex items-stretch justify-center overflow-hidden rounded-3xl text-[clamp(2rem,10vmin,8rem)]",
        flipped && "flex-row-reverse",
      )}
    >
      <Button
        {...minusAttrs}
        size="icon-lg"
        className={cn(
          "group h-full grow rounded-none",
          flipped ? "flex-row-reverse pl-12" : "pr-12",
        )}
        variant="ghost"
        onClick={() => updateHp(player.id, -1)}
      >
        <span
          className={cn(
            "text-background absolute text-2xl",
            flipped
              ? "bottom-4 left-1/2 -translate-x-1/2 rotate-180"
              : "top-4 left-1/2 -translate-x-1/2",
          )}
        >
          {player.displayName}
        </span>
        <Minus
          className={cn(
            "group-active:text-background size-8",
            player.hpUpdated < 0 ? "text-background" : "text-background/60",
          )}
          strokeWidth={4}
        />

        <span
          className={cn("text-background text-5xl", flipped && "rotate-180")}
        >
          {player.hpUpdated < 0 ? `${Math.abs(player.hpUpdated)}` : ""}
        </span>
      </Button>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <button className={cn("pointer-events-auto", flipped && "rotate-180")}>
          {player.hp}
        </button>
      </div>
      <Button
        {...plusAttrs}
        size="icon-lg"
        className={cn(
          "group h-full grow rounded-none",
          flipped ? "flex-row-reverse pr-12" : "pl-12",
        )}
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
        <span
          className={cn("text-background text-5xl", flipped && "rotate-180")}
        >
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
  const [isTimerVisible, setIsTimerVisible] = useState(true);

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
    <div
      className="relative grid h-dvh w-full gap-3 p-3 bg-background min-h-screen overflow-hidden"
      style={styleGrid}
    >
      <Timer
        isVisible={isTimerVisible}
        onVisibilityChange={setIsTimerVisible}
      />
      <FlyingCards />

      {players.map((player, idx) => (
        <PlayerCurrentMatch
          player={player}
          key={player.id}
          flipped={idx < cols}
        />
      ))}

      <div className="pointer-events-none absolute z-40" style={styleBtn}>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="settings"
              size="icon"
              className="pointer-events-auto h-full w-full rounded-full shadow-lg"
            >
              <Settings className="size-8 transition-transform hover:animate-spin" />
            </Button>
          </SheetTrigger>
          <SheetContent hideClose side="bottom" className="gap-0 px-2 py-4">
            <SheetHeader className="p-0">
              <SheetTitle hidden>Bottom Toolbar</SheetTitle>
              <SheetDescription hidden>
                Bottom toolbar with some buttons :D
              </SheetDescription>
            </SheetHeader>
            <div className="relative flex items-center justify-center gap-3">

              <Button size="lg" asChild>
                <Link href="/">
                  <Home className="size-5" />
                </Link>
              </Button>

              <SettingsDialog
                trigger={
                  <Button
                    size="lg"
                    variant={"success"}
                    className="pointer-events-auto"
                  >
                    <Plus className="size-5" />
                  </Button>
                }
              />

              <ResetButton
                trigger={
                  <Button
                    size="lg"
                    variant="destructive"
                    className="pointer-events-auto"
                  >
                    <RotateCcw className="size-5" />
                  </Button>
                }
              />
              <TimerSettingsDialog
                trigger={
                  <Button size="lg" variant="outline">
                    <TimerIcon className="size-5" />
                  </Button>
                }
                onShowTimer={() => setIsTimerVisible(true)}
              />

              <Button size="lg" asChild>
                <Link href="/match/hp-history">
                  <History className="size-5" />
                </Link>
              </Button>

              <SaveMatch />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

"use client";

import { useCurrentMatch } from "@/app/_stores/use-current-match";
import { cn } from "@/lib/utils";
import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { useShallow } from "zustand/react/shallow";
import { Triangle, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/app/_stores/use-settings";

function Pill(props: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex grow items-center justify-center rounded-lg text-center text-2xl font-semibold",
        props.className,
      )}
    />
  );
}

export default function HistoryPage() {
  const { hpHistory, players } = useCurrentMatch(
    useShallow((s) => ({ hpHistory: s.hpHistory, players: s.players })),
  );
  const startingHp = useSettings((s) => s.startingHp);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const getViewport = () =>
    containerRef.current?.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]",
    ) ?? null;

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    const vp = getViewport();
    if (!vp) return;

    queueMicrotask(() => vp.scrollTo({ top: vp.scrollHeight, behavior }));
  };

  useLayoutEffect(() => {
    scrollToBottom("auto");
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col gap-2 overflow-y-hidden py-4">
      <div
        className="grid h-10 w-full gap-2"
        style={{
          gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))`,
        }}
      >
        {players.map((p) => (
          <Pill key={p.id} style={{ backgroundColor: p.backgroundColor }}>
            <span className="text-background">{p.displayName}</span>
          </Pill>
        ))}
      </div>
      <div ref={containerRef}>
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div
            className="grid grow auto-rows-[40px] gap-2"
            style={{
              gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))`,
            }}
          >
            {players.map((p) => (
              <Pill key={p.id} style={{ backgroundColor: p.backgroundColor }}>
                <span className="text-background">{startingHp}</span>
              </Pill>
            ))}
            {hpHistory
              .map((record, i) => {
                return [
                  players.map((player) => {
                    if (player.id !== record.playerId)
                      return (
                        <Pill
                          key={`${player.id}-${i}-update`}
                          className="bg-accent"
                        />
                      );

                    const isIncrease = record.hpUpdated > 0;

                    return (
                      <Pill
                        key={`${player.id}-${i}-update`}
                        className="bg-accent"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Triangle
                            size={16}
                            className={
                              isIncrease
                                ? "fill-green-500 stroke-0"
                                : "rotate-180 fill-red-500 stroke-0"
                            }
                          />
                          <span className="text-accent-foreground font-semibold">
                            {isIncrease
                              ? `+${record.hpUpdated}`
                              : record.hpUpdated}
                          </span>
                        </div>
                      </Pill>
                    );
                  }),
                  players.map((player) => {
                    if (player.id !== record.playerId)
                      return (
                        <Pill
                          key={`${player.id}-${i}-current`}
                          className="bg-accent"
                        />
                      );

                    return (
                      <Pill
                        key={`${player.id}-${i}-current`}
                        style={{ backgroundColor: player.backgroundColor }}
                      >
                        <span className="text-background font-semibold">
                          {record.currentHp}
                        </span>
                      </Pill>
                    );
                  }),
                ];
              })
              .flat()}
          </div>
        </ScrollArea>
      </div>

      <Button
        variant="destructive"
        size="icon-lg"
        asChild
        className="absolute bottom-1/12 left-1/2 -translate-x-1/2 rounded-full"
      >
        <Link href="/match">
          <X />
        </Link>
      </Button>
    </main>
  );
}

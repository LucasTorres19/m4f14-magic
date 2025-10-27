"use client";

import { useCurrentMatch } from "@/app/_stores/use-current-match";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { useShallow } from "zustand/react/shallow";
import { Triangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  return (
    <main className="flex min-h-screen flex-col gap-2 overflow-y-hidden py-4">
      <div className="flex h-10 w-full gap-2">
        {players.map((p) => (
          <Pill key={p.id} style={{ backgroundColor: p.backgroundColor }}>
            <span className="text-background">{p.displayName}</span>
          </Pill>
        ))}
      </div>
      <ScrollArea className="h-[calc(100vh-48px)]">
        <div
          className="grid max-h-full grow gap-2"
          style={{
            gridTemplateRows: `repeat(${1 + hpHistory.length * 2}, 40px)`,
            gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))`,
          }}
        >
          {hpHistory
            .map((record) => {
              return [
                players.map((player) => {
                  if (player.id !== record.playerId)
                    return <Pill className="bg-accent" />;

                  const isIncrease = record.hpUpdated > 0;

                  return (
                    <Pill className="bg-accent">
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
                    return <Pill className="bg-accent" />;

                  return (
                    <Pill style={{ backgroundColor: player.backgroundColor }}>
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
    </main>
  );
}

"use client";
import { Button } from "@/components/ui/button";
import { useCurrentMatch } from "./_stores/use-current-match";
import { Minus, Plus } from "lucide-react";
export default function CurrentMatch() {
  const players = useCurrentMatch((state) => state.players);

  return (
    <div className="bg-background grid grow grid-cols-2 gap-3">
      {players.map((player, index) => (
        <div
          style={{ backgroundColor: player.backgroundColor }}
          className="text-background flex items-stretch justify-center overflow-hidden rounded-3xl text-9xl"
          key={index}
        >
          <Button
            size="icon-lg"
            className="h-full grow rounded-none"
            variant="ghost"
          >
            <Minus className="text-background/60 size-8" strokeWidth={4} />
          </Button>
          <button>{player.hp}</button>
          <Button
            size="icon-lg"
            className="h-full grow rounded-none"
            variant="ghost"
          >
            <Plus className="text-background/60 size-8" strokeWidth={4} />
          </Button>
        </div>
      ))}
    </div>
  );
}

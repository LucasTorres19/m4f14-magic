"use client";
import { Button } from "@/components/ui/button";
import { useCurrentMatch, type Player } from "./_stores/use-current-match";
import { Minus, Plus } from "lucide-react";

function PlayerCurrentMatch({ player }: { player: Player }) {
  const updateHp = useCurrentMatch((state) => state.updateHp);
  return (
    <div
      style={{ backgroundColor: player.backgroundColor }}
      className="text-background relative flex items-stretch justify-center overflow-hidden rounded-3xl text-9xl"
    >
      <Button
        size="icon-lg"
        className="h-full grow rounded-none pr-12"
        variant="ghost"
        onClick={() => updateHp(player.id, -1)}
      >
        <Minus className="text-background/60 size-8" strokeWidth={4} />
      </Button>
      <div className="pointer-events-none absolute flex h-full w-full items-center justify-center">
        <button className="pointer-events-auto">{player.hp}</button>
      </div>
      <Button
        size="icon-lg"
        className="h-full grow rounded-none pl-12"
        variant="ghost"
        onClick={() => updateHp(player.id, 1)}
      >
        <Plus className="text-background/60 size-8" strokeWidth={4} />
      </Button>
    </div>
  );
}
export default function CurrentMatch() {
  const players = useCurrentMatch((state) => state.players);

  return (
    <div className="bg-background grid grow grid-cols-2 gap-3">
      {players.map((player) => (
        <PlayerCurrentMatch player={player} key={player.id} />
      ))}
    </div>
  );
}

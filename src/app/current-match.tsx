"use client";
import { Button } from "@/components/ui/button";
import { useCurrentMatch, type Player } from "./_stores/use-current-match";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState, type FormEvent } from "react";

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
  const [show, setAmount] = useState(true);
  const addPlayers = useCurrentMatch((s) => s.addPlayers);
  const resetMatch = useCurrentMatch((s) => s.resetMatch);
  const players = useCurrentMatch((s) => s.players);

  useEffect(() => {
    resetMatch();
  }, []);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const n = Math.max(0, Math.floor(Number(fd.get("players")) || 0));

    addPlayers(n);
    setAmount(false);
  };

  return show ? (
    <form
      className="flex h-screen flex-col items-center justify-center gap-4"
      onSubmit={onSubmit}
    >
      <Label className="text-2xl">Cantidad de jugadores</Label>

      <Input
        id="players"
        name="players"
        type="number"
        placeholder="Jugadores: 4"
        className="w-1/4"
        min={0}
      />
      <Button type="submit">Iniciar partida</Button>
      <h2 className="text-center text-red-400">
        LA CANTIDAD POR DEFECTO ES 4 <br /> LOS SELECCIONADOS ACA SE SUMAN ES
        DECIR 4 + X
      </h2>
    </form>
  ) : (
    <div className="bg-background grid h-screen grow grid-cols-2 gap-3">
      {players.map((player) => (
        <PlayerCurrentMatch player={player} key={player.id} />
      ))}
    </div>
  );
}

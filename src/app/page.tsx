import { HydrateClient } from "@/trpc/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen">
        <div className="flex h-screen w-screen flex-col items-center justify-center text-center">
          <div className="space-y-10">
            <h1 className="text-4xl font-bold">Bienvenidos</h1>
            <h3>
              Esta es la pagina del mafia para jugar magic wacho denle play y
              baneen el mazo rojo que jugo lucas el otro dia amigo re jede nos
              mato en 3seg
            </h3>
            <Link href={"/match"}>
              <Button>Comenzar partida</Button>
            </Link>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}

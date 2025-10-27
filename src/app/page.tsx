import { HydrateClient } from "@/trpc/server";
import CurrentMatch from "./current-match";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen">
        <CurrentMatch />
      </main>
    </HydrateClient>
  );
}

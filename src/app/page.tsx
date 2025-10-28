import { MagicMenu } from "@/components/magic-menu";
import { HydrateClient } from "@/trpc/server";

export default async function Home() {
  return (
    <HydrateClient>
      <MagicMenu />
    </HydrateClient>
  );
}

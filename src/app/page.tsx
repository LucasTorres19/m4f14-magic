import { HydrateClient } from "@/trpc/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MagicMenu } from "@/components/magic-menu";

export default async function Home() {
  return (
    <HydrateClient>
      <MagicMenu/>
    </HydrateClient>
  );
}

import { asc } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { players } from "@/server/db/schema";

export const playersRouter = createTRPCRouter({
  findAll: publicProcedure.query(async ({ ctx }) => {
    const dbPlayers = await ctx.db
      .select({
        id: players.id,
        name: players.name,
        backgroundColor: players.backgroundColor,
      })
      .from(players)
      .orderBy(asc(players.name));

    return dbPlayers;
  }),
});

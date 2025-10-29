import { asc, count, eq, like, sql, sum } from "drizzle-orm";

import * as Scry from "scryfall-sdk";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

import { type db } from "@/server/db";
import { commanders, players, playersToMatches } from "@/server/db/schema";

const COMMANDER_SEARCH_LIMIT = 20;
const MIN_QUERY_LENGTH_FOR_API = 2;

type Database = typeof db;
type CommanderInsert = {
  name: string;
  imageUrl: string | null;
  description: string | null;
  scryfallUri: string | null;
};

function extractImageUrl(card: Scry.Card): string | null {
  const directImage =
    card.image_uris?.border_crop ??
    card.image_uris?.normal ??
    card.image_uris?.large ??
    card.image_uris?.png ??
    card.image_uris?.small ??
    null;

  if (directImage) {
    return directImage;
  }

  if (Array.isArray(card.card_faces)) {
    for (const face of card.card_faces) {
      const faceImage =
        face.image_uris?.border_crop ??
        face.image_uris?.normal ??
        face.image_uris?.large ??
        face.image_uris?.png ??
        face.image_uris?.small ??
        null;
      if (faceImage) {
        return faceImage;
      }
    }
  }

  return null;
}

function extractDescription(card: Scry.Card): string | null {
  const primaryText = card.oracle_text?.trim();
  if (primaryText && primaryText.length > 0) {
    return primaryText;
  }

  if (Array.isArray(card.card_faces)) {
    const descriptions = card.card_faces
      .map((face) => {
        const faceText = face.oracle_text?.trim();
        if (!faceText || faceText.length === 0) return null;
        const label = face.name?.trim() ?? "";
        return label.length > 0 ? `${label}: ${faceText}` : faceText;
      })
      .filter((text): text is string => text !== null);

    if (descriptions.length > 0) {
      return descriptions.join("\n---\n");
    }
  }

  return null;
}

async function fetchCommandersFromApi(query: string) {
  const searchQuery =
    query.length > 0 ? `${query} is:commander` : "is:commander";

  try {
    Scry.setAgent("mafia-magic", "1.0.0");
    const response = await Scry.Cards.search(searchQuery)
      .cancelAfterPage()
      .waitForAll();
    return response.slice(0, COMMANDER_SEARCH_LIMIT);
  } catch (error) {
    console.error("Failed to fetch commanders from Scryfall", error);
    return [];
  }
}

async function upsertCommanders(db: Database, entries: CommanderInsert[]) {
  if (entries.length === 0) return;

  await db
    .insert(commanders)
    .values(entries)
    .onConflictDoUpdate({
      target: commanders.name,
      set: {
        imageUrl: sql`excluded.image_url`,
        description: sql`excluded.description`,
        scryfallUri: sql`excluded.scryfall_uri`,
      },
    });
}

async function findLocalCommanders(db: Database, query: string, limit: number) {
  const selection = {
    id: commanders.id,
    name: commanders.name,
    imageUrl: commanders.imageUrl,
    description: commanders.description,
    scryfallUri: commanders.scryfallUri,
  };

  let commanderQuery = db.select(selection).from(commanders).$dynamic();

  if (query.length > 0) {
    const pattern = `%${query.toLowerCase()}%`;
    commanderQuery = commanderQuery.where(
      like(sql`lower(${commanders.name})`, pattern),
    );
  }

  return commanderQuery.orderBy(asc(commanders.name)).limit(limit);
}

export const commandersRouter = createTRPCRouter({
  search: publicProcedure
    .input(
      z
        .object({
          query: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const trimmedQuery = input?.query?.trim() ?? "";
      const limit = COMMANDER_SEARCH_LIMIT;

      let localResults = await findLocalCommanders(ctx.db, trimmedQuery, limit);

      const shouldFetchFromApi =
        trimmedQuery.length >= MIN_QUERY_LENGTH_FOR_API &&
        localResults.length < limit;

      if (shouldFetchFromApi) {
        const cards = await fetchCommandersFromApi(trimmedQuery);
        if (cards.length > 0) {
          const deduped = new Map<string, CommanderInsert>();
          for (const card of cards) {
            const name = card.name?.trim();
            if (!name || name.length === 0) continue;
            if (deduped.has(name)) continue;

            deduped.set(name, {
              name,
              imageUrl: extractImageUrl(card),
              description: extractDescription(card),
              scryfallUri: card.scryfall_uri ?? null,
            });
          }

          try {
            await upsertCommanders(ctx.db, Array.from(deduped.values()));
          } catch (error) {
            console.error("Failed to cache commanders", error);
          }

          localResults = await findLocalCommanders(ctx.db, trimmedQuery, limit);
        }
      }

      return localResults;
    }),
  list: publicProcedure
    .input(
      z
        .object({
          query: z.string().optional(),
          limit: z.number().int().positive().max(100).optional(),
          sortByMatches: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const trimmed = input?.query?.trim() ?? "";
      const limit = input?.limit ?? COMMANDER_SEARCH_LIMIT;

      const agg = ctx.db
        .select({
          commanderId: playersToMatches.commanderId,
          matchCount: count(playersToMatches.commanderId).as("matchCount"),
          wins: sum(
            sql<number>`CASE WHEN ${playersToMatches.placement} = 1 THEN 1 ELSE 0 END`,
          ).as("wins"),
        })
        .from(playersToMatches)
        .groupBy(playersToMatches.commanderId)
        .as("agg");

      const otpBase = ctx.db
        .select({
          commanderId: playersToMatches.commanderId,
          playerId: playersToMatches.playerId,
          cnt: count(sql`1`).as("cnt"),
          rn: sql<number>`
            row_number() over (
              partition by ${playersToMatches.commanderId}
              order by count(1) desc
            )
          `.as("rn"),
        })
        .from(playersToMatches)
        .groupBy(playersToMatches.commanderId, playersToMatches.playerId)
        .as("otpBase");

      const otp = ctx.db
        .select({
          commanderId: otpBase.commanderId,
          otpPlayerId: otpBase.playerId,
        })
        .from(otpBase)
        .where(eq(otpBase.rn, 1))
        .as("otp");

      let q = ctx.db
        .select({
          id: commanders.id,
          name: commanders.name,
          imageUrl: commanders.imageUrl,
          description: commanders.description,
          scryfallUri: commanders.scryfallUri,
          matchCount: agg.matchCount,
          wins: agg.wins,
          otpPlayerId: otp.otpPlayerId,
          otpPlayerName: players.name,
        })
        .from(commanders)
        .innerJoin(agg, eq(agg.commanderId, commanders.id))
        .leftJoin(otp, eq(otp.commanderId, commanders.id))
        .leftJoin(players, eq(players.id, otp.otpPlayerId))
        .$dynamic();

      if (trimmed.length > 0) {
        const pattern = `%${trimmed.toLowerCase()}%`;
        q = q.where(like(sql`lower(${commanders.name})`, pattern));
      }

      if (input?.sortByMatches) {
        q = q.orderBy(sql`matchCount DESC`, asc(commanders.name));
      } else {
        q = q.orderBy(asc(commanders.name));
      }

      const rows = await q.limit(limit);
      return rows;
    }),
});

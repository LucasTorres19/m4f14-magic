import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { utapi } from "@/app/api/uploadthing/core";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  commanders,
  matchImages,
  matches,
  players,
  playersToMatches,
} from "@/server/db/schema";

export const matchRouter = createTRPCRouter({
  save: publicProcedure
    .input(
      z.object({
        startingHp: z.number().positive().int(),
        players: z
          .object({
            name: z.string(),
            backgroundColor: z.string(),
            placement: z.number().positive().int(),
            commanderId: z.number().positive().int().optional(),
          })
          .array()
          .refine(
            (arr) => new Set(arr.map((u) => u.name)).size === arr.length,
            {
              message: "Each name must be unique",
            },
          )
          .refine(
            (arr) => new Set(arr.map((u) => u.placement)).size === arr.length,
            {
              message: "Each placement must be unique",
            },
          ),
        image: z
          .object({
            url: z.string().url(),
            key: z.string().min(1),
            name: z.string().nullish(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const playerNames = input.players.map((player) => player.name);

        const existingPlayers =
          playerNames.length > 0
            ? await tx
                .select({
                  id: players.id,
                  name: players.name,
                  backgroundColor: players.backgroundColor,
                })
                .from(players)
                .where(inArray(players.name, playerNames))
            : [];

        const playersByName = new Map(
          existingPlayers.map((player) => [player.name, player]),
        );

        for (const player of input.players) {
          const persisted = playersByName.get(player.name);

          if (persisted) {
            if (persisted.backgroundColor !== player.backgroundColor) {
              await tx
                .update(players)
                .set({ backgroundColor: player.backgroundColor })
                .where(eq(players.id, persisted.id));
              playersByName.set(player.name, {
                ...persisted,
                backgroundColor: player.backgroundColor,
              });
            }
            continue;
          }

          const [inserted] = await tx
            .insert(players)
            .values({
              name: player.name,
              backgroundColor: player.backgroundColor,
            })
            .returning({
              id: players.id,
              name: players.name,
              backgroundColor: players.backgroundColor,
            });

          if (!inserted) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to insert player ${player.name}`,
            });
          }

          playersByName.set(inserted.name, inserted);
        }

        const commanderIds = input.players
          .map((player) => player.commanderId)
          .filter((id): id is number => typeof id === "number");

        if (commanderIds.length > 0) {
          const uniqueCommanderIds = Array.from(new Set(commanderIds));
          const commanderRows = await tx
            .select({
              id: commanders.id,
            })
            .from(commanders)
            .where(inArray(commanders.id, uniqueCommanderIds));

          const foundCommanderIds = new Set(
            commanderRows.map((commander) => commander.id),
          );

          const missingCommanderIds = uniqueCommanderIds.filter(
            (id) => !foundCommanderIds.has(id),
          );

          if (missingCommanderIds.length > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Some commanders could not be found: ${missingCommanderIds.join(
                ", ",
              )}`,
            });
          }
        }

        const [matchRow] = await tx
          .insert(matches)
          .values({ startingHp: input.startingHp })
          .returning({
            id: matches.id,
            startingHp: matches.startingHp,
            createdAt: matches.createdAt,
            updatedAt: matches.updatedAt,
          });

        if (!matchRow) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create match",
          });
        }

        const playerMatchRows = input.players.map((player) => {
          const persisted = playersByName.get(player.name);

          if (!persisted) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Player ${player.name} missing after upsert`,
            });
          }

          return {
            playerId: persisted.id,
            matchId: matchRow.id,
            placement: player.placement,
            commanderId: player.commanderId ?? null,
          };
        });

        if (playerMatchRows.length > 0) {
          await tx.insert(playersToMatches).values(playerMatchRows);
        }

        if (!input.image) return;

        await tx.insert(matchImages).values({
          matchId: matchRow.id,
          fileKey: input.image.key,
          fileUrl: input.image.url,
          originalName: input.image.name ?? null,
          displayOrder: 1,
        });

        return;
      });
    }),
  setImage: publicProcedure
    .input(
      z.object({
        matchId: z.number().positive().int(),
        image: z.object({
          url: z.string().url(),
          key: z.string().min(1),
          name: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.db.transaction(async (tx) => {
        const [matchRow] = await tx
          .select({
            id: matches.id,
          })
          .from(matches)
          .where(eq(matches.id, input.matchId))
          .limit(1);

        if (!matchRow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found.",
          });
        }

        const deletedImages = await tx
          .delete(matchImages)
          .where(eq(matchImages.matchId, input.matchId))
          .returning({
            fileKey: matchImages.fileKey,
          });

        const inserted = await tx
          .insert(matchImages)
          .values({
            matchId: input.matchId,
            fileKey: input.image.key,
            fileUrl: input.image.url,
            originalName: input.image.name ?? null,
            displayOrder: 1,
          })
          .returning({
            id: matchImages.id,
            fileKey: matchImages.fileKey,
            fileUrl: matchImages.fileUrl,
            originalName: matchImages.originalName,
            displayOrder: matchImages.displayOrder,
          })
          .then((s) => s.at(0));

        const existingKeys = deletedImages.map((image) => image.fileKey);

        if (!inserted)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Image couldnt be saved",
          });
        return {
          image: inserted,
          existingKeys,
        };
      });

      await utapi.deleteFiles(transaction.existingKeys);

      return transaction.image;
    }),
});

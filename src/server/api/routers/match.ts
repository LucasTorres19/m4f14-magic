import { TRPCError } from "@trpc/server";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { utapi } from "@/app/api/uploadthing/core";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  commanders,
  images,
  matches,
  players,
  playersToMatches,
} from "@/server/db/schema";
import { revalidatePath } from "next/cache";

const imageInputSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
});

export const matchRouter = createTRPCRouter({
  save: protectedProcedure
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
        tournamentId: z.number().positive().int().optional(),
        image: imageInputSchema.optional(),
        croppedImage: imageInputSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const createdMatchId = await ctx.db.transaction(async (tx) => {
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
        let image_id: null | number = null;
        let cropped_image_id: null | number = null;

        if (input.croppedImage) {
          cropped_image_id = await tx
            .insert(images)
            .values({
              fileKey: input.croppedImage.key,
              fileUrl: input.croppedImage.url,
            })
            .returning({
              id: images.id,
            })
            .then((r) => r.at(0)?.id ?? null);
        }
        if (input.image) {
          image_id = await tx
            .insert(images)
            .values({
              fileKey: input.image.key,
              fileUrl: input.image.url,
            })
            .returning({
              id: images.id,
            })
            .then((r) => r.at(0)?.id ?? null);
        }

        const [matchRow] = await tx
          .insert(matches)
          .values({
            startingHp: input.startingHp,
            tournamentId: input.tournamentId,
            cropped_image: cropped_image_id,
            image: image_id,
          })
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

        return matchRow.id;
      });
      revalidatePath("/analytics");
      return { matchId: createdMatchId ?? null } as const;
    }),
  setImage: protectedProcedure
    .input(
      z.object({
        matchId: z.number().positive().int(),
        image: imageInputSchema.optional(),
        croppedImage: imageInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.db.transaction(async (tx) => {
        const [matchRow] = await tx
          .select({
            id: matches.id,
            image_id: matches.image,
            cropped_image_id: matches.cropped_image,
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

        const imagesToDelete = [
          matchRow.cropped_image_id,
          input.image && matchRow.image_id,
        ].filter(Boolean) as number[];

        const keysToDelete: string[] = [];

        if (imagesToDelete.length) {
          const [deleted] = await tx
            .delete(images)
            .where(inArray(images.id, imagesToDelete))
            .returning({
              fileKey: images.fileKey,
            });
          if (deleted?.fileKey) keysToDelete.push(deleted.fileKey);
        }

        const imagesToInsert = [
          {
            fileKey: input.croppedImage.key,
            fileUrl: input.croppedImage.url,
          },
        ];

        if (input.image)
          imagesToInsert.push({
            fileKey: input.image.key,
            fileUrl: input.image.url,
          });

        const [croppedImage, image] = await tx
          .insert(images)
          .values(imagesToInsert)
          .returning({
            id: images.id,
            url: images.fileUrl,
          });

        if (!croppedImage)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Image couldnt be saved",
          });

        await tx
          .update(matches)
          .set({
            cropped_image: croppedImage.id,
            image: image?.id ?? undefined,
          })
          .where(eq(matches.id, matchRow.id));

        return {
          croppedImage,
          image,
          keysToDelete,
        };
      });

      await utapi.deleteFiles(transaction.keysToDelete);

      return {
        croppedImage: transaction.croppedImage,
        image: transaction.image,
      };
    }),
});

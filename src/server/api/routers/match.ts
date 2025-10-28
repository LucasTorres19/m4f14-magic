import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { matchImages, matches, players, playersToMatches } from "@/server/db/schema";

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
        images: z
          .array(
            z.object({
              url: z.string().url(),
              key: z.string().min(1),
              name: z.string().optional(),
              order: z.number().int().min(0),
            }),
          )
          .max(6)
          .superRefine((images, ctx) => {
            const orderSet = new Set<number>();
            const keySet = new Set<string>();
            for (const image of images) {
              if (orderSet.has(image.order)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Each image must have a unique order",
                });
                break;
              }
              orderSet.add(image.order);
              if (keySet.has(image.key)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Each image must have a unique key",
                });
                break;
              }
              keySet.add(image.key);
            }
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
          };
        });

        if (playerMatchRows.length > 0) {
          await tx.insert(playersToMatches).values(playerMatchRows);
        }

        const images = input.images ?? [];
        if (images.length > 0) {
          const sortedImages = [...images].sort((a, b) => a.order - b.order);
          await tx.insert(matchImages).values(
            sortedImages.map((image, index) => ({
              matchId: matchRow.id,
              fileKey: image.key,
              fileUrl: image.url,
              originalName: image.name ?? null,
              displayOrder: index,
            })),
          );
        }
        return;
      });
    }),
});

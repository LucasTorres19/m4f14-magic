import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { utapi } from "@/app/api/uploadthing/core";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { writeAuditLog } from "@/server/audit";
import type { db as appDb } from "@/server/db";
import {
  commanders,
  images,
  matches,
  players,
  playersToMatches,
  tournaments,
} from "@/server/db/schema";
import { revalidatePath } from "next/cache";

const PLACEMENT_EDIT_WINDOW_DAYS = 7;
type Database = typeof appDb;

const imageInputSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
});

const getMatchAuditSnapshot = async (database: Database, matchId: number) => {
  const [matchRow] = await database
    .select({
      id: matches.id,
      startingHp: matches.startingHp,
      tournamentId: matches.tournamentId,
      tournamentName: tournaments.name,
      createdAt: matches.createdAt,
    })
    .from(matches)
    .leftJoin(tournaments, eq(tournaments.id, matches.tournamentId))
    .where(eq(matches.id, matchId))
    .limit(1);

  const playerRows = await database
    .select({
      playerId: players.id,
      playerName: players.name,
      placement: playersToMatches.placement,
      commanderId: commanders.id,
      commanderName: commanders.name,
    })
    .from(playersToMatches)
    .innerJoin(players, eq(players.id, playersToMatches.playerId))
    .leftJoin(commanders, eq(commanders.id, playersToMatches.commanderId))
    .where(eq(playersToMatches.matchId, matchId))
    .orderBy(asc(playersToMatches.placement));

  return {
    id: matchRow?.id ?? matchId,
    startingHp: matchRow?.startingHp ?? null,
    tournament:
      matchRow?.tournamentId == null
        ? null
        : { id: matchRow.tournamentId, name: matchRow.tournamentName },
    createdAt: matchRow?.createdAt?.toISOString() ?? null,
    players: playerRows.map((row) => ({
      id: row.playerId,
      name: row.playerName,
      placement: row.placement,
      commander:
        row.commanderId == null
          ? null
          : { id: row.commanderId, name: row.commanderName },
    })),
  };
};

const auditMatchCreated = async (
  database: Database,
  headers: Headers,
  matchId: number,
) => {
  try {
    const snapshot = await getMatchAuditSnapshot(database, matchId);
    await writeAuditLog({
      action: "match.created",
      entityType: "match",
      entityId: matchId,
      summary: `Match #${matchId} created with ${snapshot.players.length} players`,
      metadata: snapshot,
      headers,
    });
  } catch (error) {
    console.error("[audit] Failed to build match creation audit log", error);
  }
};

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
      if (createdMatchId) {
        await auditMatchCreated(ctx.db, ctx.headers, createdMatchId);
      }
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
          matchId: matchRow.id,
          croppedImage,
          image,
          keysToDelete,
          previousImageId: matchRow.image_id,
          previousCroppedImageId: matchRow.cropped_image_id,
        };
      });

      await utapi.deleteFiles(transaction.keysToDelete);
      await writeAuditLog({
        action: "match.image_updated",
        entityType: "match",
        entityId: transaction.matchId,
        summary: `Images updated for match #${transaction.matchId}`,
        metadata: {
          previous: {
            hadFullImage: transaction.previousImageId != null,
            hadCroppedImage: transaction.previousCroppedImageId != null,
          },
          next: {
            fullImageId: transaction.image?.id ?? null,
            croppedImageId: transaction.croppedImage.id,
          },
        },
        headers: ctx.headers,
      });

      return {
        croppedImage: transaction.croppedImage,
        image: transaction.image,
      };
    }),
  updatePlacements: protectedProcedure
    .input(
      z.object({
        matchId: z.number().positive().int(),
        placements: z
          .array(
            z.object({
              playerId: z.number().positive().int(),
              placement: z.number().positive().int(),
            }),
          )
          .min(1)
          .refine(
            (arr) =>
              new Set(arr.map((item) => item.playerId)).size === arr.length,
            { message: "Each player must appear once" },
          )
          .refine(
            (arr) =>
              new Set(arr.map((item) => item.placement)).size === arr.length,
            { message: "Each placement must be unique" },
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updateResult = await ctx.db.transaction(async (tx) => {
        const [matchRow] = await tx
          .select({
            id: matches.id,
            createdAt: matches.createdAt,
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

        const editDeadline = new Date(matchRow.createdAt);
        editDeadline.setDate(
          editDeadline.getDate() + PLACEMENT_EDIT_WINDOW_DAYS,
        );

        if (editDeadline < new Date()) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Placements can only be edited for matches created in the last 7 days.",
          });
        }

        const existing = await tx
          .select({
            playerId: playersToMatches.playerId,
            playerName: players.name,
            placement: playersToMatches.placement,
            commanderId: commanders.id,
            commanderName: commanders.name,
          })
          .from(playersToMatches)
          .innerJoin(players, eq(players.id, playersToMatches.playerId))
          .leftJoin(commanders, eq(commanders.id, playersToMatches.commanderId))
          .where(eq(playersToMatches.matchId, input.matchId))
          .orderBy(asc(playersToMatches.placement));

        if (existing.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found or has no players.",
          });
        }

        const existingIds = new Set(existing.map((row) => row.playerId));
        if (
          existingIds.size !== input.placements.length ||
          input.placements.some((row) => !existingIds.has(row.playerId))
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Placements must include every player in the match.",
          });
        }

        // Avoid unique (matchId, placement) conflicts while swapping.
        for (const row of existing) {
          await tx
            .update(playersToMatches)
            .set({ placement: -row.playerId })
            .where(
              and(
                eq(playersToMatches.matchId, input.matchId),
                eq(playersToMatches.playerId, row.playerId),
              ),
            );
        }

        for (const row of input.placements) {
          await tx
            .update(playersToMatches)
            .set({ placement: row.placement })
            .where(
              and(
                eq(playersToMatches.matchId, input.matchId),
                eq(playersToMatches.playerId, row.playerId),
              ),
            );
        }

        await tx
          .update(matches)
          .set({ updatedAt: new Date() })
          .where(eq(matches.id, input.matchId));

        const byPlayerId = new Map(existing.map((row) => [row.playerId, row]));
        const before = existing.map((row) => ({
          playerId: row.playerId,
          playerName: row.playerName,
          placement: row.placement,
          commander:
            row.commanderId == null
              ? null
              : { id: row.commanderId, name: row.commanderName },
        }));
        const after = input.placements
          .map((row) => {
            const existingRow = byPlayerId.get(row.playerId);
            return {
              playerId: row.playerId,
              playerName: existingRow?.playerName ?? "Unknown player",
              placement: row.placement,
              commander:
                existingRow?.commanderId == null
                  ? null
                  : {
                      id: existingRow.commanderId,
                      name: existingRow.commanderName,
                    },
            };
          })
          .sort((a, b) => a.placement - b.placement);

        return { placements: input.placements, before, after };
      });

      revalidatePath("/history");
      revalidatePath("/analytics");
      revalidatePath("/summoner");
      await writeAuditLog({
        action: "match.placements_updated",
        entityType: "match",
        entityId: input.matchId,
        summary: `Placements updated for match #${input.matchId}`,
        metadata: {
          before: updateResult.before,
          after: updateResult.after,
        },
        headers: ctx.headers,
      });

      return { placements: updateResult.placements } as const;
    }),
});

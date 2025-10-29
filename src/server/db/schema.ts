// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import {
  primaryKey,
  sqliteTableCreator,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `mafia_magic_${name}`);

export const players = createTable("player", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  name: d.text({ length: 256 }).notNull().unique(),
  backgroundColor: d.text({ length: 256 }).notNull(),
  createdAt: d
    .integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const commanders = createTable("commander", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  name: d.text({ length: 256 }).unique(),
  scryfallUri: d.text("scryfall_uri", { length: 1024 }),
  imageUrl: d.text("image_url", { length: 1024 }),
  artImageUrl: d.text("art_image_url", { length: 1024 }),
  description: d.text({ length: 2048 }),
  createdAt: d
    .integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const matches = createTable("match", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  startingHp: d.integer({ mode: "number" }).notNull(),
  createdAt: d
    .integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const matchImages = createTable("matchImage", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  matchId: d
    .integer("match_id", { mode: "number" })
    .notNull()
    .references(() => matches.id),
  fileKey: d.text("file_key", { length: 256 }).notNull(),
  fileUrl: d.text("file_url", { length: 1024 }).notNull(),
  originalName: d.text("original_name", { length: 512 }),
  displayOrder: d.integer("display_order", { mode: "number" }).notNull(),
  createdAt: d
    .integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
}));

export const playersToMatches = createTable(
  "playersToMatches",
  (d) => ({
    playerId: d
      .integer("player_id")
      .notNull()
      .references(() => players.id),
    matchId: d
      .integer("match_id")
      .notNull()
      .references(() => matches.id),
    commanderId: d.integer("commander_id").references(() => commanders.id),

    placement: d.integer().notNull(),
  }),
  (t) => [
    primaryKey({ columns: [t.playerId, t.matchId] }),
    uniqueIndex("mafia_magic_uq_match_placement").on(t.matchId, t.placement),
  ],
);

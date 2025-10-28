// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import {
  index,
  sqliteTableCreator,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `mafia-magic_${name}`);

export const players = createTable("player", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  name: d.text({ length: 256 }).unique(),
  backgroundColor: d.text({ length: 256 }).notNull(),
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

    placement: d.integer().notNull(),
  }),
  (t) => ({
    // Ensures one row per (player, match)
    pk: primaryKey({ columns: [t.playerId, t.matchId] }),
    // Also enforce only one placement per match
    uqMatchPlacement: uniqueIndex("uq_match_placement").on(
      t.matchId,
      t.placement,
    ),
  }),
);

CREATE TABLE IF NOT EXISTS `mafia_magic_audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text(128) NOT NULL,
	`entity_type` text(128),
	`entity_id` integer,
	`summary` text(1024) NOT NULL,
	`ip_address` text(128),
	`user_agent` text(1024),
	`metadata` text(16384),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mafia_magic_commander` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256),
	`scryfall_uri` text(1024),
	`image_url` text(1024),
	`art_image_url` text(1024),
	`description` text(2048),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `mafia_magic_commander_name_unique` ON `mafia_magic_commander` (`name`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mafia_magic_image` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_key` text(256) NOT NULL,
	`file_url` text(1024) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mafia_magic_match` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`startingHp` integer NOT NULL,
	`tournament_id` integer,
	`image` integer,
	`cropped_image` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`tournament_id`) REFERENCES `mafia_magic_tournament`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`image`) REFERENCES `mafia_magic_image`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cropped_image`) REFERENCES `mafia_magic_image`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mafia_magic_player` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256) NOT NULL,
	`backgroundColor` text(256) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `mafia_magic_player_name_unique` ON `mafia_magic_player` (`name`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mafia_magic_playersToMatches` (
	`player_id` integer NOT NULL,
	`match_id` integer NOT NULL,
	`commander_id` integer,
	`placement` integer NOT NULL,
	PRIMARY KEY(`player_id`, `match_id`),
	FOREIGN KEY (`player_id`) REFERENCES `mafia_magic_player`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`) REFERENCES `mafia_magic_match`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commander_id`) REFERENCES `mafia_magic_commander`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `mafia_magic_uq_match_placement` ON `mafia_magic_playersToMatches` (`match_id`,`placement`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mafia_magic_tournament` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256) NOT NULL,
	`state` text(16384) NOT NULL,
	`finished` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);

ALTER TABLE `mafia_magic_image` ADD `variant` text(32) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `mafia_magic_image` ADD `width` integer;--> statement-breakpoint
ALTER TABLE `mafia_magic_image` ADD `height` integer;--> statement-breakpoint
ALTER TABLE `mafia_magic_image` ADD `size_bytes` integer;--> statement-breakpoint
ALTER TABLE `mafia_magic_image` ADD `mime_type` text(128);--> statement-breakpoint
ALTER TABLE `mafia_magic_image` ADD `source_file_key` text(256);--> statement-breakpoint
ALTER TABLE `mafia_magic_match` ADD `original_image` integer REFERENCES mafia_magic_image(id);
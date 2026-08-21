ALTER TABLE `mafia_magic_player` ADD `profile_image` integer REFERENCES mafia_magic_image(id) ON DELETE SET NULL;

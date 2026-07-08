ALTER TABLE `user_materials_db` ADD `category` varchar(128);--> statement-breakpoint
ALTER TABLE `user_materials_db` ADD `defaultPrice` float;--> statement-breakpoint
ALTER TABLE `user_materials_db` ADD `userPrice` float;--> statement-breakpoint
ALTER TABLE `user_materials_db` ADD `lastUpdated` timestamp;--> statement-breakpoint
CREATE INDEX `user_materials_db_category_idx` ON `user_materials_db` (`category`);
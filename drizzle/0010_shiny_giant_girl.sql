ALTER TABLE `modifiers` ADD `status` enum('active','archived','deleted') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `modifiers` ADD `archivedAt` timestamp;--> statement-breakpoint
CREATE INDEX `modifiers_status_idx` ON `modifiers` (`status`);--> statement-breakpoint
ALTER TABLE `labor_rates` DROP COLUMN `role`;